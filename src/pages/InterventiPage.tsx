import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import {
  Plus, Search, Filter, Euro, User, Calendar,
  ChevronRight, RefreshCw, FileText
} from 'lucide-react';
import InterventoModal from '../components/InterventoModal';
import InterventoDetailModal from '../components/InterventoDetailModal';

const InterventiPage: React.FC = () => {
  const [interventi, setInterventi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInterventoId, setSelectedInterventoId] = useState<string | null>(null);

  useEffect(() => {
    fetchInterventi();
  }, []);

  const fetchInterventi = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('interventi')
      .select(`
        id,
        data,
        note,
        costo_totale,
        created_at,
        clienti (id, nome, cognome),
        intervento_operai (id),
        intervento_articoli (id)
      `)
      .order('data', { ascending: false });

    if (!error && data) {
      setInterventi(data);
    }
    setLoading(false);
  };

  const filtered = interventi.filter(int => {
    const clientName = int.clienti
      ? `${int.clienti.cognome} ${int.clienti.nome}`.toLowerCase()
      : '';
    const matchesSearch =
      searchQuery === '' ||
      clientName.includes(searchQuery.toLowerCase()) ||
      (int.note || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMonth =
      filterMonth === '' ||
      (int.data && int.data.startsWith(filterMonth));

    return matchesSearch && matchesMonth;
  });

  const totalCost = filtered.reduce((sum, i) => sum + Number(i.costo_totale || 0), 0);

  const uniqueMonths = Array.from(
    new Set(
      interventi
        .filter(i => i.data)
        .map(i => i.data.slice(0, 7))
    )
  ).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Interventi</h1>
          <p className="text-gray-500 font-medium mt-1">
            {loading ? 'Caricamento...' : `${filtered.length} interventi trovati`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInterventi}
            className="p-2.5 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-brand-600 hover:border-brand-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition shadow-md shadow-brand-500/20"
          >
            <Plus className="w-5 h-5" /> Nuovo Intervento
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Totale', value: interventi.length, color: 'text-gray-800', bg: 'bg-white' },
          { label: 'Filtrati', value: filtered.length, color: 'text-brand-700', bg: 'bg-brand-50' },
          {
            label: 'Questo mese',
            value: interventi.filter(i => i.data?.startsWith(format(new Date(), 'yyyy-MM'))).length,
            color: 'text-blue-700',
            bg: 'bg-blue-50',
          },
          {
            label: 'Fatturato filtrato',
            value: `€${totalCost.toFixed(0)}`,
            color: 'text-green-700',
            bg: 'bg-green-50',
          },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 p-4 shadow-sm`}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per cliente o note..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-white rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="pl-10 pr-6 py-2.5 border border-gray-200 bg-white rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm appearance-none min-w-[160px]"
          >
            <option value="">Tutti i mesi</option>
            {uniqueMonths.map(m => (
              <option key={m} value={m}>
                {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: itLocale })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interventi List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-3"></div>
            <p className="text-gray-500 text-sm">Caricamento interventi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-bold text-gray-700 text-lg mb-1">Nessun intervento trovato</p>
            <p className="text-gray-500 text-sm mb-6">Prova a cambiare i filtri o crea un nuovo intervento.</p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-700 transition text-sm"
            >
              <Plus className="w-4 h-4" /> Nuovo Intervento
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-6 py-3.5 text-xs font-black uppercase tracking-wider text-gray-500">Data</th>
                    <th className="text-left px-6 py-3.5 text-xs font-black uppercase tracking-wider text-gray-500">Cliente</th>
                    <th className="text-center px-4 py-3.5 text-xs font-black uppercase tracking-wider text-gray-500">Operai</th>
                    <th className="text-center px-4 py-3.5 text-xs font-black uppercase tracking-wider text-gray-500">Materiali</th>
                    <th className="text-right px-6 py-3.5 text-xs font-black uppercase tracking-wider text-gray-500">Costo</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(int => (
                    <tr
                      key={int.id}
                      onClick={() => setSelectedInterventoId(int.id)}
                      className="border-b border-gray-50 hover:bg-brand-50/20 cursor-pointer transition group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-800 capitalize">
                            {int.data ? format(parseISO(int.data), 'd MMM yyyy', { locale: itLocale }) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-brand-600" />
                          </div>
                          <span className="font-semibold text-gray-900">
                            {int.clienti
                              ? `${int.clienti.cognome} ${int.clienti.nome}`
                              : <span className="text-gray-400 italic">Generico</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {int.intervento_operai?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                          {int.intervento_articoli?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-green-700 text-base">
                          €{Number(int.costo_totale || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={4} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Totale filtrato</td>
                    <td className="px-6 py-3 text-right font-black text-green-700 text-base">€{totalCost.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(int => (
                <div
                  key={int.id}
                  onClick={() => setSelectedInterventoId(int.id)}
                  className="p-4 flex items-center gap-4 hover:bg-brand-50/20 cursor-pointer transition active:bg-brand-50"
                >
                  <div className="shrink-0 w-12 h-12 bg-brand-100 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-brand-700 font-black text-base leading-none">
                      {int.data ? format(parseISO(int.data), 'd') : '—'}
                    </span>
                    <span className="text-brand-500 text-[9px] font-bold uppercase">
                      {int.data ? format(parseISO(int.data), 'MMM', { locale: itLocale }) : ''}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {int.clienti ? `${int.clienti.cognome} ${int.clienti.nome}` : 'Intervento Generico'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {int.intervento_operai?.length || 0} operai · {int.intervento_articoli?.length || 0} materiali
                    </p>
                    {int.note && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{int.note}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="font-black text-green-700 text-sm">€{Number(int.costo_totale || 0).toFixed(0)}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              ))}
              <div className="p-4 bg-gray-50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Totale</span>
                <span className="font-black text-green-700">€{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <InterventoModal
        isOpen={isNewModalOpen}
        onClose={(saved) => {
          setIsNewModalOpen(false);
          if (saved) fetchInterventi();
        }}
        initialDate={new Date()}
      />

      <InterventoDetailModal
        interventoId={selectedInterventoId}
        onClose={() => setSelectedInterventoId(null)}
        onDeleted={fetchInterventi}
        onSaved={fetchInterventi}
      />
    </div>
  );
};

export default InterventiPage;
