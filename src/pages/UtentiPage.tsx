import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ShieldAlert } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Utente {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  ruolo: UserRole;
  created_at: string;
}

const UtentiPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchUtenti();
    }
  }, [isAdmin]);

  const fetchUtenti = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('usersvivai').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setUtenti(data as Utente[]);
    }
    setLoading(false);
  };

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    if (window.confirm(`Vuoi cambiare il ruolo in ${newRole}?`)) {
      await supabase.from('usersvivai').update({ ruolo: newRole }).eq('id', id);
      fetchUtenti();
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const roleConfig = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800', icon: ShieldAlert },
    operaio: { label: 'Operaio', color: 'bg-gray-100 text-gray-800', icon: Shield },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Utente</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Ruolo Attuale</th>
                    <th className="px-6 py-3 text-right">Cambia Ruolo</th>
                  </tr>
                </thead>
                <tbody>
                  {utenti.map(utente => {
                    const RoleIcon = roleConfig[utente.ruolo]?.icon || Shield;
                    return (
                    <tr key={utente.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {utente.nome || utente.cognome ? `${utente.nome} ${utente.cognome}` : 'Nuovo Utente'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {utente.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig[utente.ruolo]?.color || 'bg-gray-100'}`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleConfig[utente.ruolo]?.label || utente.ruolo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select 
                          value={utente.ruolo}
                          onChange={(e) => handleRoleChange(utente.id, e.target.value as UserRole)}
                          className="text-sm border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 p-1"
                        >
                          <option value="operaio">Operaio</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden p-4 space-y-4">
               {utenti.map(utente => {
                 const RoleIcon = roleConfig[utente.ruolo]?.icon || Shield;
                 return (
                 <div key={utente.id} className="bg-white border text-sm border-gray-200 p-4 rounded-lg shadow-sm">
                   <div className="font-bold text-gray-900 text-base mb-1">
                     {utente.nome || utente.cognome ? `${utente.nome} ${utente.cognome}` : utente.email}
                   </div>
                   <div className="text-gray-600 truncate mb-2">{utente.email}</div>
                   <div className="flex justify-between items-center mt-3 border-t pt-3">
                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase font-medium tracking-wider ${roleConfig[utente.ruolo]?.color || 'bg-gray-100'}`}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {roleConfig[utente.ruolo]?.label || utente.ruolo}
                     </span>
                     <select 
                        value={utente.ruolo}
                        onChange={(e) => handleRoleChange(utente.id, e.target.value as UserRole)}
                        className="text-xs border border-gray-300 rounded-md shadow-sm p-1 ml-2"
                      >
                        <option value="operaio">Operaio</option>
                        <option value="admin">Admin</option>
                     </select>
                   </div>
                 </div>
               )})}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UtentiPage;
