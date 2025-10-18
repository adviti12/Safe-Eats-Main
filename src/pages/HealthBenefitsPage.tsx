import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getScan, ScanResult } from "@/services/scanService";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, CheckCircle, Heart, X, TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface HealthAnalysis {
  ingredient: string;
  isHealthy: boolean;
  reason: string;
}

const HealthBenefitsPage = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<HealthAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!scanId) return;

    const fetchScan = () => {
      try {
        const result = getScan(scanId);
        if (!result) {
          toast.error("Scan not found");
          return;
        }

        if (result.userId !== currentUser?.id) {
          toast.error("You don't have permission to view this scan");
          return;
        }

        setScan(result);
      } catch (error) {
        toast.error("Failed to load scan results");
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [scanId, currentUser]);

  const analyzeHealthBenefits = async () => {
    if (!scan) return;

    setAnalyzing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health-benefits/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: scan.ingredients,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze health benefits');
      }

      const data = await response.json();
      setHealthAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing health benefits:', error);
      toast.error("Failed to analyze health benefits");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (scan && scan.ingredients.length > 0) {
      analyzeHealthBenefits();
    }
  }, [scan]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="container mx-auto p-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <p className="text-xl mb-6">Scan not found</p>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-6">
            <Link to="/scan">Try Again</Link>
          </Button>
        </div>
      </div>
    );
  }

  const healthyIngredients = healthAnalysis.filter(item => item.isHealthy);
  const unhealthyIngredients = healthAnalysis.filter(item => !item.isHealthy);

  // Prepare data for pie chart
  const pieData = [
    { name: 'Healthy', value: healthyIngredients.length || 0, color: '#10B981' },
    { name: 'Unhealthy', value: unhealthyIngredients.length || 0, color: '#EF4444' },
  ].filter(item => item.value > 0); // Only show segments with data

  // Determine overall healthiness based on ratio
  const totalIngredients = healthAnalysis.length;
  const healthyRatio = healthyIngredients.length / totalIngredients;
  const unhealthyRatio = unhealthyIngredients.length / totalIngredients;

  let overallHealthiness = '';
  let overallColor = '';
  let overallIcon = null;

  if (healthyRatio > unhealthyRatio) {
    overallHealthiness = 'This product appears to be generally healthy based on ingredient analysis';
    overallColor = 'text-green-700';
    overallIcon = <TrendingUp className="w-5 h-5 text-green-600" />;
  } else if (unhealthyRatio > healthyRatio) {
    overallHealthiness = 'This product appears to be generally unhealthy based on ingredient analysis';
    overallColor = 'text-red-700';
    overallIcon = <TrendingDown className="w-5 h-5 text-red-600" />;
  } else {
    overallHealthiness = 'This product has a balanced mix of healthy and unhealthy ingredients';
    overallColor = 'text-yellow-700';
    overallIcon = <Heart className="w-5 h-5 text-yellow-600" />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="flex items-center gap-2 hover:bg-gray-100 -ml-2">
          <Link to={`/scan-result/${scanId}`}>
            <ArrowLeft className="w-4 h-4" /> Back to Results
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-gradient">Health Benefits Analysis</h1>

      {analyzing ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Analyzing ingredients for health benefits...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Pie Chart Card */}
          <Card className="border-none shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Health Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-1/2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-left">
                  <div className={`text-lg font-medium mb-4 flex items-center justify-center md:justify-start gap-2 ${overallColor}`}>
                    {overallIcon}
                    {overallHealthiness}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{healthyIngredients.length}</div>
                      <p className="text-sm text-gray-600">Healthy</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{unhealthyIngredients.length}</div>
                      <p className="text-sm text-gray-600">Unhealthy</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Ingredients Analysis */}
          <Card className="border-none shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Ingredient Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-3">
                {healthAnalysis.map((item, index) => (
                  <div key={index} className={`rounded-lg p-4 border ${item.isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${item.isHealthy ? 'text-green-800' : 'text-red-800'}`}>
                        {item.ingredient}
                      </span>
                      <Badge className={item.isHealthy ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}>
                        {item.isHealthy ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Healthy
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            Unhealthy
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className={`text-sm ${item.isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HealthBenefitsPage;
