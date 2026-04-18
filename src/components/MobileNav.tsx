import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Package, UserCog } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MobileNav: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Calendario', path: '/calendario', icon: Calendar },
    { name: 'Clienti', path: '/clienti', icon: Users },
    { name: 'Articoli', path: '/articoli', icon: Package },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Utenti', path: '/utenti', icon: UserCog });
  }

  // Adjust width based on number of items (4 for normal, 5 for admin)
  const itemWidth = isAdmin ? 'w-1/5' : 'w-1/4';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full space-y-1 transition-colors ${itemWidth} ${
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
