import React, { useEffect, useState, useCallback } from 'react';
import { Users, Package, Calendar, Settings, AlertCircle, TrendingUp, BarChart3, Euro, Clock, Trophy } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type PeriodKey = 'settimana' | 'mese' | 'trimestre' | 'anno';

interface BasicStats {
  utentiTotali: number;
  clientiTotali: number;
  articoliTotali: number;
  interventiOggi: number;
}

interface AdminStats {
  soldiTotali: number;
  oreTotali: number;
  topOperaio: { nome: string; ore: number } | null;
  interventiCount: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'settimana', label: 'Settimana' },
  { key: 'mese',      label: 'Mese' },
  { key: 'trimestre', label: '3 Mesi' },
  { key: 'anno',      label: 'Anno' },
];

function getStartDate(period: PeriodKey): string {
  const now = new Date();
  switch (period) {
    case 'settimana':  return format(subDays(now, 7), 'yyyy-MM-dd');
    case 'mese':       return format(subMonths(now, 1), 'yyyy-MM-dd');
    case 'trimestre':  return format(subMonths(now, 3), 'yyyy-MM-dd');
    case 'anno':       return format(subYears(now, 1), 'yyyy-MM-dd');
  }
}

function calcOre(ora_inizio: string, ora_fine: string, pausa_minuti: number): number {
  const [hs, ms] = ora_inizio.split(':').map(Number);
  const [he, me] = ora_fine.split(':').map(Number);
  let startMins = hs * 60 + ms;
  let endMins   = he * 60 + me;
  if (endMins < startMins) endMins += 24 * 60;
  const total = endMins - startMins - (pausa_minuti || 0);
  return Math.max(0, total / 60);
}

const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-3"></div>
    <p className="text-sm font-medium">{message}</p>
  </div>
);

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [basicStats, setBasicStats] = useState<BasicStats>({
    utentiTotali: 0,
    clientiTotali: 0,
    articoliTotali: 0,
    interventiOggi: 0,
  });
  const [loadingBasic, setLoadingBasic] = useState(true);

  const [period, setPeriod] = useState<PeriodKey>('mese');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // ── Basic stats (always) ──────────────────
  useEffect(() => {
    const fetchBasic = async () => {
      setLoadingBasic(true);
      try {
        const [{ count: uCount }, { count: cCount }, { count: aCount }, { count: iCount }] = await Promise.all([
          supabase.from('usersvivai').select('*', { count: 'exact', head: true }),
          supabase.from('clienti').select('*', { count: 'exact', head: true }),
          supabase.from('articoli').select('*', { count: 'exact', head: true }),
          supabase.from('interventi').select('*', { count: 'exact', head: true }).eq('data', new Date().toISOString().split('T')[0]),
        ]);

        setBasicStats({
          utentiTotali: uCount || 0,
          clientiTotali: cCount || 0,
          articoliTotali: aCount || 0,
          interventiOggi: iCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingBasic(false);
      }
    };

    fetchBasic();
  }, []);

  // ── Admin stats (period-dependent) ──────────
  const fetchAdminStats = useCallback(async (p: PeriodKey) => {
    setLoadingAdmin(true);
    try {
      const startDate = getStartDate(p);

      const { data: interventi } = await supabase
        .from('interventi')
        .select('id, costo_totale')
        .gte('data', startDate);

      const soldiTotali = (interventi || []).reduce(
        (sum, i) => sum + Number(i.costo_totale || 0), 0
      );
      const interventoIds = (interventi || []).map(i => i.id);

      let oreTotali = 0;
      const orePerOperaio: Record<string, { ore: number; nome: string }> = {};

      if (interventoIds.length > 0) {
        const { data: righe } = await supabase
          .from('intervento_operai')
          .select('operaio_id, ora_inizio, ora_fine, pausa_minuti, usersvivai(nome, cognome)')
          .in('intervento_id', interventoIds);

        (righe || []).forEach((r: any) => {
          if (!r.ora_inizio || !r.ora_fine) return;
          const ore = calcOre(r.ora_inizio, r.ora_fine, r.pausa_minuti || 0);
          oreTotali += ore;

          const opId = r.operaio_id;
          if (!orePerOperaio[opId]) {
            const u = r.usersvivai;
            const nome = u ? `${u.nome || ''} ${u.cognome || ''}`.trim() : 'Sconosciuto';
            orePerOperaio[opId] = { ore: 0, nome };
          }
          orePerOperaio[opId].ore += ore;
        });
      }

      const topEntry = Object.values(orePerOperaio).sort((a, b) => b.ore - a.ore)[0] ?? null;

      setAdminStats({
        soldiTotali,
        oreTotali,
        topOperaio: topEntry ? { nome: topEntry.nome, ore: topEntry.ore } : null,
        interventiCount: interventi?.length || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchAdminStats(period);
  }, [isAdmin, period, fetchAdminStats]);

  const basicCards = [
    { title: 'Interventi Oggi',       value: basicStats.interventiOggi, icon: Calendar,  color: 'bg-orange-100 text-orange-600' },
    { title: 'Clienti Totali',        value: basicStats.clientiTotali,  icon: Users,     color: 'bg-blue-100 text-blue-600' },
    { title: 'Articoli in Magazzino', value: basicStats.articoliTotali, icon: Package,   color: 'bg-purple-100 text-purple-600' },
    { title: 'Operai & Staff',        value: basicStats.utentiTotali,   icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
      </div>

      {/* ── Basic Stats ── */}
      {loadingBasic ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse h-32"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {basicCards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-card p-6 flex items-center space-x-4 border border-gray-100 transition-transform hover:scale-[1.02]">
              <div className={`p-4 rounded-full ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">{card.title}</p>
                <p className="text-2xl font-black text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Admin Stats Section ── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden mt-8">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-50 rounded-xl">
                <BarChart3 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">Statistiche Admin</h2>
                <p className="text-xs text-gray-500 font-medium">Riepilogo per periodo selezionato</p>
              </div>
            </div>

            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 self-start sm:self-auto">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    period === key
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {loadingAdmin ? (
              <LoadingSpinner message="Calcolo statistiche..." />
            ) : adminStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Interventi</span>
                    <div className="p-2 bg-blue-100 rounded-xl"><Calendar className="w-4 h-4 text-blue-600" /></div>
                  </div>
                  <p className="text-4xl font-black text-gray-900">{adminStats.interventiCount}</p>
                  <p className="text-xs text-gray-500 font-medium">nel periodo selezionato</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-green-500">Fatturato</span>
                    <div className="p-2 bg-green-100 rounded-xl"><Euro className="w-4 h-4 text-green-600" /></div>
                  </div>
                  <p className="text-4xl font-black text-green-700">€{adminStats.soldiTotali.toFixed(0)}</p>
                  <p className="text-xs text-green-600 font-medium">{adminStats.interventiCount > 0 ? `≈ €${(adminStats.soldiTotali / adminStats.interventiCount).toFixed(0)}/int` : 'Nessun intervento'}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-5 border border-blue-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">Ore Lavorate</span>
                    <div className="p-2 bg-blue-100 rounded-xl"><Clock className="w-4 h-4 text-blue-600" /></div>
                  </div>
                  <p className="text-4xl font-black text-blue-700">
                    {adminStats.oreTotali.toFixed(1)}
                    <span className="text-xl font-bold text-blue-400 ml-1">h</span>
                  </p>
                  <p className="text-xs text-blue-500 font-medium">{adminStats.interventiCount > 0 ? `≈ ${(adminStats.oreTotali / adminStats.interventiCount).toFixed(1)}h/int` : 'Nessun dato'}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-500">Top Operaio</span>
                    <div className="p-2 bg-amber-100 rounded-xl"><Trophy className="w-4 h-4 text-amber-600" /></div>
                  </div>
                  {adminStats.topOperaio ? (
                    <>
                      <p className="text-xl font-black text-gray-900 leading-tight break-words">{adminStats.topOperaio.nome}</p>
                      <p className="text-xs text-amber-600 font-bold">{adminStats.topOperaio.ore.toFixed(1)} ore lavorate</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-2">Nessun dato disponibile</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Errore nel caricamento delle statistiche.</p>
            )}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6 mt-8">
          <div className="flex items-center space-x-2 text-gray-500 mb-4">
            <AlertCircle className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-gray-900">Riepilogo Recente</h2>
          </div>
          <p className="text-gray-500 text-sm">Nessuna attività recente da mostrare. Configura gli interventi dal calendario.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
