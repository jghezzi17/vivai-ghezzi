import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Save, Clock, Users, Package } from 'lucide-react';
import { format } from 'date-fns';

interface InterventoModalProps {
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  initialDate: Date;
}

const InterventoModal: React.FC<InterventoModalProps> = ({ isOpen, onClose, initialDate }) => {
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState<any[]>([]);
  const [operai, setOperai] = useState<any[]>([]);
  const [articoli, setArticoli] = useState<any[]>([]);

  // Form State
  const [clienteId, setClienteId] = useState('');
  const [data, setData] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  
  const [selectedOperai, setSelectedOperai] = useState<any[]>([]);
  const [selectedArticoli, setSelectedArticoli] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setData(format(initialDate, 'yyyy-MM-dd'));
      fetchData();
      // Reset form
      setClienteId('');
      setNote('');
      setSelectedOperai([]);
      setSelectedArticoli([]);
    }
  }, [isOpen, initialDate]);

  const fetchData = async () => {
    const [clientiRes, operaiRes, articoliRes] = await Promise.all([
      supabase.from('clienti').select('id, nome, cognome').order('cognome'),
      supabase.from('usersvivai').select('id, nome, cognome, ruolo').in('ruolo', ['user', 'maestro']),
      supabase.from('articoli').select('id, nome, tipo, costo, aliquota_iva, unita_misura').order('nome'),
    ]);

    if (clientiRes.data) setClienti(clientiRes.data);
    if (operaiRes.data) setOperai(operaiRes.data);
    if (articoliRes.data) setArticoli(articoliRes.data);
  };

  const calculateTotalCost = () => {
    let cost = 0;

    // Worker cost (10€ per hour)
    selectedOperai.forEach(op => {
      if (op.ora_inizio && op.ora_fine) {
        const [hStart, mStart] = op.ora_inizio.split(':').map(Number);
        const [hEnd, mEnd] = op.ora_fine.split(':').map(Number);
        
        let startMins = hStart * 60 + mStart;
        let endMins = hEnd * 60 + mEnd;
        
        // Handle next day assuming within 24h
        if (endMins < startMins) endMins += 24 * 60;
        
        let totalMins = endMins - startMins - (op.pausa_minuti || 0);
        if (totalMins > 0) {
          cost += (totalMins / 60) * 10;
        }
      }
    });

    // Material cost (cost + IVA)
    selectedArticoli.forEach(art => {
      const dbArt = articoli.find(a => a.id === art.articolo_id);
      if (dbArt && art.quantita_usata) {
        // We include IVA in the cost? Let's just do base cost * qty 
        // Costo could technically be IVA included depending on business rule, but usually it's base + IVA
        const costWithIva = Number(dbArt.costo) * (1 + Number(dbArt.aliquota_iva)/100);
        cost += costWithIva * Number(art.quantita_usata);
      }
    });

    return cost.toFixed(2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) return alert('Seleziona un cliente');
    if (selectedOperai.length === 0) return alert('Aggiungi almeno un operaio');

    setLoading(true);
    const costoTotale = calculateTotalCost();

    try {
      // 1. Insert Intervento
      const { data: intData, error: intError } = await supabase
        .from('interventi')
        .insert([{ cliente_id: clienteId, data, note, costo_totale: costoTotale }])
        .select()
        .single();
      
      if (intError) throw intError;
      const interventoId = intData.id;

      // 2. Insert Operai
      const opInserts = selectedOperai.map(op => ({
        intervento_id: interventoId,
        operaio_id: op.operaio_id,
        ora_inizio: op.ora_inizio,
        ora_fine: op.ora_fine,
        pausa_minuti: op.pausa_minuti || 0
      }));
      if (opInserts.length > 0) {
        const { error } = await supabase.from('intervento_operai').insert(opInserts);
        if (error) throw error;
      }

      // 3. Insert Articoli
      const artInserts = selectedArticoli.map(art => ({
        intervento_id: interventoId,
        articolo_id: art.articolo_id,
        quantita_usata: art.quantita_usata
      }));
      if (artInserts.length > 0) {
        const { error } = await supabase.from('intervento_articoli').insert(artInserts);
        if (error) throw error;
      }

      onClose(true);
    } catch (error) {
      console.error(error);
      alert('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const addOperaio = () => {
    setSelectedOperai([...selectedOperai, { operaio_id: '', ora_inizio: '08:00', ora_fine: '17:00', pausa_minuti: 60 }]);
  };

  const updateOperaio = (index: number, field: string, value: any) => {
    const newOperai = [...selectedOperai];
    newOperai[index][field] = value;
    setSelectedOperai(newOperai);
  };

  const addArticolo = () => {
    setSelectedArticoli([...selectedArticoli, { articolo_id: '', quantita_usata: 1 }]);
  };

  const updateArticolo = (index: number, field: string, value: any) => {
    const newArt = [...selectedArticoli];
    newArt[index][field] = value;
    setSelectedArticoli(newArt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col outline-none overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-brand-600" />
            Nuovo Intervento
          </h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select required value={clienteId} onChange={e => setClienteId(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white shadow-sm">
                  <option value="">Seleziona un cliente...</option>
                  {clienti.map(c => <option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input required type="date" value={data} onChange={e => setData(e.target.value)} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-brand-500 shadow-sm" />
             </div>
          </div>
          
          {/* Opeari Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Squadra / Operai *
              </h3>
              <button type="button" onClick={addOperaio} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg flex items-center hover:bg-blue-100 transition">
                <Plus className="w-4 h-4 mr-1" /> Aggiungi Operaio
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedOperai.length === 0 && <p className="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded-lg border border-dashed">Nessun operaio assegnato. Clicca su "Aggiungi Operaio".</p>}
              {selectedOperai.map((op, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                  <div className="w-full sm:w-1/3">
                    <select required value={op.operaio_id} onChange={e => updateOperaio(idx, 'operaio_id', e.target.value)} className="w-full p-2 border rounded-md text-sm text-gray-900">
                      <option value="">Seleziona...</option>
                      {operai.map(o => <option key={o.id} value={o.id}>{o.nome} {o.cognome} ({o.ruolo})</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-auto flex flex-1 gap-2 items-center">
                    <div className="flex-1">
                      <input required type="time" title="Inizio" value={op.ora_inizio} onChange={e => updateOperaio(idx, 'ora_inizio', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="flex-1">
                      <input required type="time" title="Fine" value={op.ora_fine} onChange={e => updateOperaio(idx, 'ora_fine', e.target.value)} className="w-full p-2 border rounded-md text-sm" />
                    </div>
                  </div>
                  <div className="w-full sm:w-32 flex items-center relative">
                    <input type="number" title="Pausa (min)" placeholder="Pausa" value={op.pausa_minuti} onChange={e => updateOperaio(idx, 'pausa_minuti', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm pr-10" />
                    <span className="absolute right-8 text-xs text-gray-400 pointer-events-none">min</span>
                    <button type="button" onClick={() => setSelectedOperai(selectedOperai.filter((_, i) => i !== idx))} className="ml-2 text-red-500 hover:text-red-700 p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Articoli Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-orange-600" />
                Materiali e Macchinari
              </h3>
              <button type="button" onClick={addArticolo} className="text-sm bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg flex items-center hover:bg-orange-100 transition">
                <Plus className="w-4 h-4 mr-1" /> Aggiungi Articolo
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedArticoli.length === 0 && <p className="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded-lg border border-dashed">Nessun materiale/macchinario selezionato.</p>}
              {selectedArticoli.map((art, idx) => {
                const selectedDbArt = articoli.find(a => a.id === art.articolo_id);
                return (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                  <div className="flex-1">
                    <select required value={art.articolo_id} onChange={e => updateArticolo(idx, 'articolo_id', e.target.value)} className="w-full p-2 border rounded-md text-sm">
                      <option value="">Seleziona...</option>
                      {articoli.map(a => <option key={a.id} value={a.id}>{a.nome} - ({a.tipo})</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-48 flex items-center relative">
                    <input required type="number" step="0.01" min="0.01" title="Quantità" placeholder="Quantità" value={art.quantita_usata} onChange={e => updateArticolo(idx, 'quantita_usata', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm pr-10" />
                    <span className="absolute right-8 text-xs text-gray-400 pointer-events-none">{selectedDbArt?.unita_misura || 'qty'}</span>
                    <button type="button" onClick={() => setSelectedArticoli(selectedArticoli.filter((_, i) => i !== idx))} className="ml-2 text-red-500 hover:text-red-700 p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Note Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note sull'intervento</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-500 shadow-sm" placeholder="Dettagli, lavorazioni effettuate, etc..."></textarea>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xl font-bold text-gray-900 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            Costo Stimato: <span className="text-brand-600">€ {calculateTotalCost()}</span>
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            <button type="button" onClick={() => onClose(false)} className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white bg-transparent font-medium transition">
              Annulla
            </button>
            <button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none flex items-center justify-center px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm transition disabled:opacity-70">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Save className="w-5 h-5 mr-2" /> Salva Intervento</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterventoModal;
