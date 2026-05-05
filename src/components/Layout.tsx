import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

const Layout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const displayName = profile?.nome || profile?.cognome ? `${profile.nome} ${profile.cognome}` : profile?.email;

  return (
    <div className="flex h-screen bg-brand-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header for mobile — Clean Brand Experience */}
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 z-10 flex justify-between items-center shadow-smooth">
          <div className="h-10">
            <img src="/logo.png" alt="Vivai Ghezzi" className="h-full w-auto object-contain" />
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-gray-900 truncate max-w-[120px] leading-tight">
                  {displayName}
                </p>
                <p className="text-[9px] font-bold text-brand-600 uppercase tracking-tighter">
                  {profile?.ruolo}
                </p>
             </div>
             <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm shrink-0">
               {profile?.nome?.[0]}{profile?.cognome?.[0]}
             </div>
             <button
               onClick={signOut}
               className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
               title="Scollegati"
             >
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          <div className="flex-1 overflow-x-hidden overflow-y-auto w-full flex flex-col">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1600px] flex-1 flex flex-col">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden mobile-nav-container">
          <MobileNav />
        </div>
      </div>
    </div>
  );
};

export default Layout;
