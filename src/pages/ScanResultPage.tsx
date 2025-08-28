
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getScan, ScanResult } from "@/services/scanService";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, Camera, List } from "lucide-react";

const ScanResultPage = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Analyzing ingredients...</p>
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

  const hasAllergens = scan.warnings.length > 0;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="flex items-center gap-2 hover:bg-gray-100 -ml-2">
          <Link to="/scan">
            <ArrowLeft className="w-4 h-4" /> Back to Scan
          </Link>
        </Button>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-gradient">Scan Results</h1>
      
      <div className="grid gap-6">
        <Card className="border-none shadow-lg rounded-xl overflow-hidden">
          <CardHeader className={hasAllergens 
            ? "bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200" 
            : "bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200"
          }>
            <CardTitle className="flex items-center justify-between">
              <span>Allergen Summary</span>
              {hasAllergens ? (
                <Badge variant="destructive" className="px-3 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Allergens Detected
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Safe
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {hasAllergens ? (
              <div className="space-y-3">
                <p className="font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  This product contains allergens you're sensitive to:
                </p>
                <ul className="bg-red-50 rounded-lg p-4 space-y-2">
                  {scan.warnings.map((warning, index) => (
                    <li key={index} className="text-red-600 flex items-start">
                      <span className="inline-block w-5 h-5 bg-red-200 rounded-full text-center text-red-700 mr-2 flex-shrink-0 font-bold">
                        !
                      </span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-4 flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                <p className="text-green-700">
                  No allergens detected based on your profile. This product should be safe for you.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5 text-primary" />
              Extracted Ingredients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="border rounded-md p-4 bg-gray-50">
              <p className="whitespace-pre-wrap text-gray-700">{scan.extractedText}</p>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-3 text-gray-800">Identified Ingredients:</h3>
              <div className="flex flex-wrap gap-2">
                {scan.ingredients.map((ingredient, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-3 py-1"
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Scanned Image
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="border rounded-md overflow-hidden shadow-sm">
              <img
                src={scan.imageUrl}
                alt="Scanned ingredient list"
                className="w-full object-contain max-h-72"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <p>Captured on {new Date(scan.timestamp).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScanResultPage;
