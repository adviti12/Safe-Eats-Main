
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/scan");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 to-blue-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-10 left-1/2 w-80 h-80 bg-blue-300/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-violet-400 flex items-center justify-center">
            <span className="text-white text-lg font-bold">SE</span>
          </div>
          <span className="text-xl font-bold text-gradient">SafeEats</span>
        </div>
      </header>
      
      <main className="container mx-auto px-6 flex-1 flex flex-col md:flex-row items-center relative z-10">
        <div className="md:w-1/2 text-center md:text-left mb-12 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Your Personal
            <span className="text-gradient block"> Food Safety AI</span>
          </h1>
          <p className="text-gray-600 mb-8 text-lg max-w-lg mx-auto md:mx-0">
            Scan food labels to instantly identify allergens and protect yourself from hidden dangers in packaged foods.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 border-2 border-primary text-primary hover:bg-primary/5 transition-all duration-300">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
        <div className="md:w-1/2">
          <div className="relative">
            <div className="w-72 h-72 md:w-96 md:h-96 mx-auto bg-primary/20 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            <div className="w-64 h-64 md:w-80 md:h-80 mx-auto bg-primary/10 blur-2xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"></div>
            <img 
              src="/logo.png"
              alt="Logo" 
              className="w-80 h-80 md:w-[450px] md:h-[450px] relative z-10 mx-auto animate-float"
            />
          </div>
        </div>
      </main>
      
      <footer className="container mx-auto px-6 py-6 text-center text-sm text-gray-500 relative z-10">
        <p>© {new Date().getFullYear()} SafeEats - AI-powered allergen detection</p>
      </footer>
    </div>
  );
};

export default Index;
