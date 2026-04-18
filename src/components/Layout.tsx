import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-brand-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header for mobile - optional, but good for branding */}
        <div className="md:hidden bg-brand-600 text-white p-4 shadow-md z-10 flex justify-center items-center">
          <span className="font-bold text-lg">Vivai Ghezzi</span>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pb-16 md:pb-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
};

export default Layout;
