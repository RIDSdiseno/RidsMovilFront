import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // En móvil, el sidebar empieza cerrado; en desktop, abierto
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    console.log('Toggle sidebar called. Current state:', isSidebarOpen, 'Mobile:', isMobile);
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />
      
      {/* Contenido principal */}
      <main
        className={`flex-1 min-h-screen transition-all duration-300 ${
          isMobile 
            ? "ml-0" // En móvil no hay margen
            : isSidebarOpen 
              ? "ml-64" // Desktop con sidebar abierto
              : "ml-20" // Desktop con sidebar cerrado
        }`}
      >
        <div className={`mx-auto max-w-screen-2xl ${
          isMobile ? "px-4 py-4" : "px-6 lg:px-10 py-6 lg:py-8"
        }`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}