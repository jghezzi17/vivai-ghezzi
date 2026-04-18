import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Package, UserCog, LogOut, Leaf } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { profile, signOut, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Calendario', path: '/calendario', icon: Calendar },
    { name: 'Clienti', path: '/clienti', icon: Users },
    { name: 'Articoli', path: '/articoli', icon: Package },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Utenti', path: '/utenti', icon: UserCog });
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 w-64 shadow-sm">
      <div className="p-6 flex items-center space-x-3 text-brand-700">
        <Leaf className="w-8 h-8" />
        <span className="text-xl font-bold tracking-tight">Vivai Ghezzi</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-brand-600'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="px-4 py-3 mb-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile?.nome} {profile?.cognome}
          </p>
          <p className="text-xs text-gray-500 capitalize">{profile?.ruolo}</p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Esci</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
