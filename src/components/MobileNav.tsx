import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Package, UserCog, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MobileNav: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Calendario', path: '/calendario', icon: Calendar },
    { name: 'Interventi', path: '/interventi', icon: ClipboardList },
  ];

  if (isAdmin) {
    navItems.push(
      { name: 'Clienti', path: '/clienti', icon: Users },
      { name: 'Utenti', path: '/utenti', icon: UserCog }
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center h-16 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-colors ${
                isActive
                  ? 'text-brand-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate w-full text-center px-1">
              {item.name}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileNav;
