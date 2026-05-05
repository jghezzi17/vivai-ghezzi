import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Package, UserCog, LogOut, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Calendario', path: '/calendario', icon: Calendar },
    { name: 'Interventi', path: '/interventi', icon: ClipboardList },
    { name: 'Clienti', path: '/clienti', icon: Users },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Utenti', path: '/utenti', icon: UserCog });
  }

  return (
    <div className="h-full flex flex-col w-72 bg-white border-r border-gray-100 shadow-smooth">
      {/* Branding Section */}
      <div className="p-8 pb-6">
        <div className="transition-transform hover:scale-[1.02] duration-300 flex justify-center">
           <img src="/logo.png" alt="Vivai Ghezzi" className="h-20 w-auto object-contain" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-brand scale-[1.02]'
                  : 'text-gray-500 hover:bg-brand-50 hover:text-brand-700'
              }`
            }
          >
            <item.icon className="w-5 h-5 transition-colors opacity-90" />
            <span className="font-bold tracking-tight text-[15px]">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile & Footer */}
      <div className="p-6 mt-auto border-t border-gray-50 bg-gray-50/50 rounded-t-3xl mx-2 mb-2">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border-2 border-white shadow-sm">
            {profile?.nome?.[0]}{profile?.cognome?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 truncate">
              {profile?.nome || profile?.cognome ? `${profile.nome} ${profile.cognome}` : profile?.email}
            </p>
            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-1.5 py-0.5 rounded inline-block">
              {profile?.ruolo}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors font-bold text-sm border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4" />
          <span>Scollegati</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
