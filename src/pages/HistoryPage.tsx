import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserScans, ScanResult, deleteScan } from "@/services/scanService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Trash2 } from "lucide-react";

const HistoryPage = () => {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchScans = () => {
      const userScans = getUserScans(currentUser.id);
      setScans(userScans);
    };
    
    fetchScans();
  }, [currentUser]);

  const handleDelete = (scanId: string) => {
    if (window.confirm("Are you sure you want to delete this scan?")) {
      deleteScan(scanId); // Assuming you have a deleteScan function in scanService
      setScans((prev) => prev.filter((scan) => scan.id !== scanId));
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gradient">Scan History</h1>
      
      {scans.length === 0 ? (
        <Card className="border-none shadow-lg rounded-xl overflow-hidden">
          <CardContent className="text-center p-12 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <p className="text-gray-600 mb-4 text-lg">
              You haven't scanned any products yet.
            </p>
            <Link 
              to="/scan" 
              className="text-primary font-medium hover:underline text-lg"
            >
              Scan your first product
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => (
            <Link to={`/scan-result/${scan.id}`} key={scan.id} className="group">
              <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden card-hover">
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                    <img
                      src={scan.imageUrl}
                      alt="Scanned product"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <p className="font-medium truncate text-gray-800">
                      {scan.ingredients.slice(0, 3).join(", ")}
                      {scan.ingredients.length > 3 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(scan.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(scan.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {scan.warnings.length > 0 ? (
                      <Badge variant="destructive" className="px-3 py-1 rounded-full">
                        {scan.warnings.length} {scan.warnings.length === 1 ? "allergen" : "allergens"}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-full">
                        Safe
                      </Badge>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(scan.id);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
