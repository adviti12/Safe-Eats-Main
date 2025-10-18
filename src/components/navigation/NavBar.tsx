
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Scan, User, List, LogOut, Search } from "lucide-react";

const NavBar = () => {
  const { pathname } = useLocation();
  const { currentUser, logout } = useAuth();
  
  const navItems = [
    { path: "/scan", label: "Scan", icon: <Scan className="w-5 h-5" /> },
    
    { path: "/profile", label: "Profile", icon: <User className="w-5 h-5" /> },
    { path: "/history", label: "History", icon: <List className="w-5 h-5" /> },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/scan" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-violet-400 flex items-center justify-center">
              <span className="text-white text-lg font-bold">SE</span>
            </div>
            <span className="text-xl font-bold text-gradient">SafeEats</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                }}
                className="text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={pathname === item.path ? "default" : "ghost"}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-4",
                      pathname === item.path 
                        ? "bg-primary text-white shadow-md" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
              <Button 
                variant="ghost" 
                onClick={logout} 
                className="ml-2 text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <LogOut className="w-5 h-5 mr-1" />
                <span>Logout</span>
              </Button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-50">
        <div className="flex justify-around py-3">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center px-2 py-1 h-auto rounded-xl",
                  pathname === item.path 
                    ? "text-primary bg-primary/10" 
                    : "text-gray-500"
                )}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
