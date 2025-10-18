
import { Outlet } from "react-router-dom";
import NavBar from "@/components/navigation/NavBar";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-lavender-50 to-blue-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-lavender-300/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="fixed top-40 right-20 w-80 h-80 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="fixed bottom-20 left-1/3 w-96 h-96 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      {/* Additional decorative elements */}
      <div className="fixed bottom-10 right-10 w-72 h-72 bg-lavender-300/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="fixed top-1/2 left-1/4 w-64 h-64 bg-purple-200/30 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-3000"></div>
      
      <NavBar />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
