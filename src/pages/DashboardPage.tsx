import React, { useEffect, useState } from 'react';
import { Users, Package, Calendar, Settings, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    utentiTotali: 0,
    clientiTotali: 0,
    articoliTotali: 0,
    interventiOggi: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ count: uCount }, { count: cCount }, { count: aCount }, { count: iCount }] = await Promise.all([
          supabase.from('usersvivai').select('*', { count: 'exact', head: true }),
          supabase.from('clienti').select('*', { count: 'exact', head: true }),
          supabase.from('articoli').select('*', { count: 'exact', head: true }),
          supabase.from('interventi').select('*', { count: 'exact', head: true }).eq('data', new Date().toISOString().split('T')[0]),
        ]);

        setStats({
          utentiTotali: uCount || 0,
          clientiTotali: cCount || 0,
          articoliTotali: aCount || 0,
          interventiOggi: iCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { title: 'Interventi Oggi', value: stats.interventiOggi, icon: Calendar, color: 'bg-orange-100 text-orange-600' },
    { title: 'Clienti Totali', value: stats.clientiTotali, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { title: 'Articoli in Magazzino', value: stats.articoliTotali, icon: Package, color: 'bg-purple-100 text-purple-600' },
    { title: 'Operai & Staff', value: stats.utentiTotali, icon: Settings, color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse h-32"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-card p-6 flex items-center space-x-4 border border-gray-100 transition-transform hover:scale-[1.02]">
              <div className={`p-4 rounded-full ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder for future recent activities */}
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 mt-8">
        <div className="flex items-center space-x-2 text-gray-500 mb-4">
          <AlertCircle className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-gray-900">Riepilogo Recente</h2>
        </div>
        <p className="text-gray-500 text-sm">Nessuna attività recente da mostrare. Configura gli interventi dal calendario.</p>
      </div>
    </div>
  );
};

export default DashboardPage;
