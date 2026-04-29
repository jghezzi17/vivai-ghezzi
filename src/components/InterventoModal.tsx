import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Save, Clock, Users, Package, Search, ChevronDown, AlertTriangle, Edit3 } from 'lucide-react';
import { format } from 'date-fns';

interface InterventoModalProps {
  isOpen: boolean;
  onClose: (saved: boolean) => void;
  initialDate: Date;
}

const timeOptions: string[] = [];
for (let h = 7; h <= 19; h++) {
  const hr = h.toString().padStart(2, '0');
  timeOptions.push(`${hr}:00`);
  if (h !== 19) {
    timeOptions.push(`${hr}:30`);
  }
}

const pausaOptions = [
  { label: '0 min', value: 0 },
  { label: '30 min', value: 30 },
  { label: '1 ora', value: 60 },
  { label: '1.5 ore', value: 90 },
  { label: '2 ore', value: 120 }
];

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

  // UX State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Searchable Select State
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(target)) {
        setIsClientDropdownOpen(false);
      }
      
      setSelectedArticoli(prev => {
         let hasChanges = false;
         const next = prev.map(art => {
            if (art.isMenuOpen) {
               const el = document.getElementById(`article-dropdown-${art.localId}`);
               if (el && !el.contains(target)) {
                  hasChanges = true;
                  return { ...art, isMenuOpen: false };
               }
            }
            return art;
         });
         return hasChanges ? next : prev;
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-modal-open', 'true');
      document.body.style.overflow = 'hidden';
      setData(format(initialDate, 'yyyy-MM-dd'));
      fetchData();
      // Reset form
      setClienteId('');
      setNote('');
      setSelectedOperai([]);
      setSelectedArticoli([]);
      setClientSearch('');
      setIsClientDropdownOpen(false);
    } else {
      document.body.removeAttribute('data-modal-open');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.removeAttribute('data-modal-open');
      document.body.style.overflow = '';
    };
  }, [isOpen, initialDate]);

  const fetchData = async () => {
    const [clientiRes, operaiRes, articoliRes] = await Promise.all([
      supabase.from('clienti').select('id, nome, cognome, email, partita_iva, codice_fiscale').order('cognome'),
      supabase.from('usersvivai').select('id, nome, cognome, email, ruolo').order('nome'),
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
        if (endMins < startMins) endMins += 24 * 60;
        let totalMins = endMins - startMins - (op.pausa_minuti || 0);
        if (totalMins > 0) {
          cost += (totalMins / 60) * 10;
        }
      }
    });

    // Material cost (cost + IVA) — respects per-intervention price overrides
    selectedArticoli.forEach(art => {
      let costWithIva = 0;
      if (art.actionType === 'create_new' || art.actionType === 'update_existing') {
        costWithIva = Number(art.custom_costo || 0) * (1 + Number(art.custom_aliquota_iva || 0)/100);
      } else if (art.actionType === 'price_override') {
        // Use override values stored locally
        costWithIva = Number(art.override_costo || 0) * (1 + Number(art.override_iva || 0)/100);
      } else {
        const dbArt = articoli.find(a => a.id === art.articolo_id);
        if (dbArt && art.quantita_usata) {
          costWithIva = Number(dbArt.costo) * (1 + Number(dbArt.aliquota_iva)/100);
        }
      }
      cost += costWithIva * Number(art.quantita_usata || 0);
    });

    return cost.toFixed(2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) return alert('Seleziona un cliente');
    if (selectedOperai.length === 0) return alert('Aggiungi almeno un operaio');
    
    // Check conflicts
    const pendingConflicts = selectedArticoli.some(a => a.actionType === 'conflict_warning');
    if (pendingConflicts) {
      return alert('Risolvi i conflitti degli articoli evidenziati prima di salvare.');
    }

    setLoading(true);
    const costoTotale = calculateTotalCost();

    try {
      // 0. Resolve custom Articles
      const resolvedArticoli = [...selectedArticoli];
      for (const art of resolvedArticoli) {
        if (art.actionType === 'create_new') {
          const { data, error } = await supabase.from('articoli').insert([{
            nome: art.custom_nome,
            tipo: art.custom_tipo,
            costo: art.custom_costo,
            unita_misura: art.custom_unita_misura,
            aliquota_iva: art.custom_aliquota_iva,
            quantita: 0  // required column, default to 0
          }]).select().single();
          if (error) throw error;
          art.articolo_id = data.id;
        } else if (art.actionType === 'update_existing' && art.articolo_id) {
          const { error } = await supabase.from('articoli').update({
            nome: art.custom_nome,
            tipo: art.custom_tipo,
            costo: art.custom_costo,
            unita_misura: art.custom_unita_misura,
            aliquota_iva: art.custom_aliquota_iva
          }).eq('id', art.articolo_id);
          if (error) throw error;
        }
      }

      // 1. Insert Intervento
      const { data: intData, error: intError } = await supabase
        .from('interventi')
        .insert([{ cliente_id: clienteId || null, data, note, costo_totale: costoTotale }])
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

      // 3. Insert Articoli — skip rows with no valid articolo_id
      const artInserts = resolvedArticoli
        .filter(art => art.articolo_id && art.articolo_id !== '')
        .map(art => ({
          intervento_id: interventoId,
          articolo_id: art.articolo_id,
          quantita_usata: Number(art.quantita_usata) || 1,
          // Store price override if user customised it for this intervention
          costo_override: art.actionType === 'price_override' ? Number(art.override_costo) : null,
          aliquota_iva_override: art.actionType === 'price_override' ? Number(art.override_iva) : null,
        }));
      if (artInserts.length > 0) {
        const { error } = await supabase.from('intervento_articoli').insert(artInserts);
        if (error) throw error;
      }

      onClose(true);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Errore durante il salvataggio: ${error.message || 'Riprova più tardi'}`);
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
    setSelectedArticoli([...selectedArticoli, { 
      localId: Math.random().toString(36).substr(2, 9),
      isMenuOpen: false,
      searchText: '',
      articolo_id: '', 
      quantita_usata: 1,
      actionType: 'none',
      // custom fields (create_new / update_existing)
      custom_nome: '',
      custom_tipo: 'materiale',
      custom_costo: 0,
      custom_unita_misura: 'pz',
      custom_aliquota_iva: 22,
      similarItem: null,
      isConfirmed: false,
      // price override fields (price_override)
      override_costo: 0,
      override_iva: 22,
      showOverrideForm: false,
    }]);
  };

  const updateArticolo = (index: number, field: string, value: any) => {
    const newArt = [...selectedArticoli];
    newArt[index][field] = value;
    setSelectedArticoli(newArt);
  };

  const confirmCustomArticle = (idx: number) => {
    setSelectedArticoli(prev => {
      const newArr = [...prev];
      newArr[idx].isConfirmed = true;
      newArr.push({
        localId: Math.random().toString(36).substr(2, 9),
        isMenuOpen: false,
        searchText: '',
        articolo_id: '', 
        quantita_usata: 1,
        actionType: 'none',
        custom_nome: '',
        custom_tipo: 'materiale',
        custom_costo: 0,
        custom_unita_misura: 'pz',
        custom_aliquota_iva: 22,
        similarItem: null,
        isConfirmed: false
      });
      return newArr;
    });
  };

  const checkArticleSearch = (idx: number) => {
    const art = selectedArticoli[idx];
    const text = art.searchText.trim();
    if (!text) return;

    // Check exact match
    const exactMatch = articoli.find(a => a.nome.toLowerCase() === text.toLowerCase());
    if (exactMatch) {
      updateArticolo(idx, 'articolo_id', exactMatch.id);
      updateArticolo(idx, 'actionType', 'none');
      updateArticolo(idx, 'custom_unita_misura', exactMatch.unita_misura);
      // Pre-populate override fields from catalog
      updateArticolo(idx, 'override_costo', exactMatch.costo);
      updateArticolo(idx, 'override_iva', exactMatch.aliquota_iva);
      updateArticolo(idx, 'isMenuOpen', false);
      return;
    }

    // Check fuzzy
    const similar = articoli.find(a => 
      a.nome.toLowerCase().includes(text.toLowerCase()) || 
      text.toLowerCase().includes(a.nome.toLowerCase())
    );

    updateArticolo(idx, 'custom_nome', text);
    updateArticolo(idx, 'isMenuOpen', false);

    if (similar) {
      updateArticolo(idx, 'actionType', 'conflict_warning');
      updateArticolo(idx, 'similarItem', similar);
    } else {
      updateArticolo(idx, 'actionType', 'create_new');
    }
  };

  const resolveConflict = (idx: number, resolution: 'use_old' | 'update_old' | 'create_new') => {
    const art = selectedArticoli[idx];
    if (resolution === 'use_old') {
      updateArticolo(idx, 'articolo_id', art.similarItem.id);
      updateArticolo(idx, 'searchText', art.similarItem.nome);
      updateArticolo(idx, 'custom_unita_misura', art.similarItem.unita_misura);
      updateArticolo(idx, 'actionType', 'none');
    } else if (resolution === 'update_old') {
      updateArticolo(idx, 'articolo_id', art.similarItem.id);
      updateArticolo(idx, 'custom_tipo', art.similarItem.tipo);
      updateArticolo(idx, 'custom_costo', art.similarItem.costo);
      updateArticolo(idx, 'custom_unita_misura', art.similarItem.unita_misura);
      updateArticolo(idx, 'custom_aliquota_iva', art.similarItem.aliquota_iva);
      updateArticolo(idx, 'actionType', 'update_existing');
    } else if (resolution === 'create_new') {
      updateArticolo(idx, 'articolo_id', '');
      updateArticolo(idx, 'actionType', 'create_new');
    }
  };

  const filteredClienti = clienti.filter(c => {
    const searchString = `${c.cognome} ${c.nome || ''} ${c.email || ''} ${c.partita_iva || ''}`.toLowerCase();
    return searchString.includes(clientSearch.toLowerCase());
  });

  const selectedClienteObj = clienti.find(c => c.id === clienteId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/40 backdrop-blur-sm transition-opacity" style={{ height: '100dvh' }}>
      <div className="bg-white w-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl sm:max-w-4xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ height: '100dvh' }}>
        
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-brand-600" />
            Nuovo Intervento
          </h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6 space-y-6">
          
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Errore</p>
                <p className="text-sm mt-1">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
             <div ref={clientDropdownRef} className="relative flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <div 
                  className={`relative flex items-center w-full bg-white border ${isClientDropdownOpen ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-300'} rounded-lg shadow-sm cursor-text transition-all`}
                  onClick={() => setIsClientDropdownOpen(true)}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cerca per nome, email, p.iva..." 
                    value={isClientDropdownOpen ? clientSearch : (selectedClienteObj ? `${selectedClienteObj.cognome} ${selectedClienteObj.nome || ''}`.trim() : clientSearch)}
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setIsClientDropdownOpen(true);
                      if (clienteId) setClienteId('');
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    className="w-full py-2.5 pl-9 pr-10 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400 font-medium"
                  />
                  {clienteId && !isClientDropdownOpen ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setClienteId(''); setClientSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </div>

                {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                    {filteredClienti.length > 0 ? (
                      <div className="py-1">
                        {filteredClienti.map(c => (
                          <div 
                            key={c.id} 
                            onMouseDown={(e) => {
                               e.preventDefault(); 
                               setClienteId(c.id);
                               setClientSearch('');
                               setIsClientDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 hover:bg-brand-50 cursor-pointer transition-colors ${clienteId === c.id ? 'bg-brand-50/50' : ''}`}
                          >
                            <div className="font-bold text-gray-900 text-sm">
                              {c.cognome} {c.nome && c.nome !== '-' ? c.nome : ''}
                            </div>
                            {(c.email || c.partita_iva) && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {c.partita_iva ? `P.IVA: ${c.partita_iva}` : c.email}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Nessun cliente trovato.
                      </div>
                    )}
                  </div>
                )}
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
              {selectedOperai.length === 0 && <p className="text-sm text-gray-500 italic p-4 text-center bg-white rounded-lg border border-dashed">Nessun operaio assegnato.</p>}
              {selectedOperai.map((op, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                  <div className="w-full sm:w-1/3">
                    <select required value={op.operaio_id} onChange={e => updateOperaio(idx, 'operaio_id', e.target.value)} className="w-full p-2.5 border rounded-md text-sm text-gray-900 bg-white">
                      <option value="">Seleziona...</option>
                      {operai.map(o => <option key={o.id} value={o.id}>{o.nome || o.cognome ? `${o.nome} ${o.cognome}` : o.email} ({o.ruolo})</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-auto flex flex-1 gap-2 items-center">
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] text-gray-500 uppercase font-bold sm:hidden mb-1">Inizio</label>
                      <select required title="Inizio" value={op.ora_inizio} onChange={e => updateOperaio(idx, 'ora_inizio', e.target.value)} className="w-full p-2 border rounded-md text-sm bg-white">
                        <option value="">Da...</option>
                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <span className="text-gray-400 mt-4 sm:mt-0">-</span>
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] text-gray-500 uppercase font-bold sm:hidden mb-1">Fine</label>
                      <select required title="Fine" value={op.ora_fine} onChange={e => updateOperaio(idx, 'ora_fine', e.target.value)} className="w-full p-2 border rounded-md text-sm bg-white">
                        <option value="">A...</option>
                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="w-full flex-col sm:flex-row sm:w-40 flex sm:items-center gap-2">
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] text-gray-500 uppercase font-bold sm:hidden mb-1">Pausa</label>
                      <select title="Pausa" value={op.pausa_minuti} onChange={e => updateOperaio(idx, 'pausa_minuti', Number(e.target.value))} className="w-full p-2 border rounded-md text-sm bg-white">
                        {pausaOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => setSelectedOperai(selectedOperai.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-2 sm:p-1 self-end sm:self-auto bg-red-50 sm:bg-transparent rounded-lg sm:rounded-none flex justify-center items-center">
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
            
            <div className="space-y-4">
              {selectedArticoli.length === 0 && <p className="text-sm text-gray-500 italic p-4 text-center bg-white rounded-lg border border-dashed">Nessun materiale/macchinario selezionato.</p>}
              
              {selectedArticoli.map((art, idx) => {
                const selectedDbArt = articoli.find(a => a.id === art.articolo_id);
                const udmDisplayed = (art.actionType === 'create_new' || art.actionType === 'update_existing') ? art.custom_unita_misura : (selectedDbArt?.unita_misura || 'qty');
                const filteredArticoli = art.searchText ? articoli.filter(a => a.nome.toLowerCase().includes(art.searchText.toLowerCase())) : articoli;

                return (
                  <div key={art.localId || idx} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-3 relative overflow-visible">
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      
                      <div className="flex-1 relative flex items-center">
                        {art.isConfirmed && (art.actionType === 'create_new' || art.actionType === 'update_existing') ? (
                           <div className="w-full text-sm bg-brand-50 border border-brand-200 p-2.5 rounded-lg flex justify-between items-center shadow-sm">
                             <div className="font-semibold text-brand-900 truncate">
                               {art.custom_nome}
                               <span className="font-normal text-brand-700 ml-1 text-xs">({art.custom_tipo}) • €{art.custom_costo}</span>
                             </div>
                             <button type="button" onClick={() => updateArticolo(idx, 'isConfirmed', false)} className="text-brand-600 hover:text-brand-800 ml-2 p-1 bg-white rounded-md border border-brand-100"><Edit3 className="w-4 h-4" /></button>
                           </div>
                        ) : art.actionType === 'price_override' ? (
                           <div className="w-full text-sm bg-blue-50 border border-blue-200 p-2.5 rounded-lg flex justify-between items-center shadow-sm">
                             <div className="font-semibold text-blue-900 truncate">
                               {selectedDbArt?.nome}
                               <span className="font-normal text-blue-600 ml-1 text-xs">Prezzo personalizzato • €{art.override_costo} (+{art.override_iva}% IVA)</span>
                             </div>
                             <div className="flex items-center gap-1 ml-2 shrink-0">
                               <button type="button" onClick={() => updateArticolo(idx, 'showOverrideForm', !art.showOverrideForm)} className="text-blue-600 hover:text-blue-800 p-1 bg-white rounded-md border border-blue-100"><Edit3 className="w-4 h-4" /></button>
                               <button type="button" onClick={() => { updateArticolo(idx, 'actionType', 'none'); updateArticolo(idx, 'showOverrideForm', false); }} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-md border border-gray-100" title="Usa prezzo catalogo"><X className="w-3.5 h-3.5" /></button>
                             </div>
                           </div>
                        ) : art.actionType !== 'none' ? (
                           <div className="w-full text-sm font-semibold text-gray-700 bg-gray-100 p-2.5 border border-gray-200 rounded-lg shadow-inner">
                             Configurazione in corso...
                           </div>
                        ) : !art.isMenuOpen ? (
                           <div 
                             className="w-full p-2.5 border rounded-lg bg-gray-50 cursor-text flex items-center justify-between"
                             onClick={() => updateArticolo(idx, 'isMenuOpen', true)}
                           >
                             <div className="flex flex-col min-w-0">
                               <span className="text-sm font-medium text-gray-800 truncate">
                                 {selectedDbArt ? selectedDbArt.nome : 'Cerca o inserisci...'}
                               </span>
                               {selectedDbArt && (
                                 <span className="text-[10px] text-gray-500 mt-0.5">{selectedDbArt.tipo} • €{selectedDbArt.costo} +{selectedDbArt.aliquota_iva}% IVA</span>
                               )}
                             </div>
                             <div className="flex items-center gap-2 ml-2 shrink-0">
                               {selectedDbArt && (
                                 <button
                                   type="button"
                                   onClick={e => { e.stopPropagation(); updateArticolo(idx, 'override_costo', selectedDbArt.costo); updateArticolo(idx, 'override_iva', selectedDbArt.aliquota_iva); updateArticolo(idx, 'actionType', 'price_override'); updateArticolo(idx, 'showOverrideForm', true); }}
                                   className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md transition whitespace-nowrap"
                                 >
                                   Modifica prezzi
                                 </button>
                               )}
                               <Search className="w-4 h-4 text-gray-400" />
                             </div>
                           </div>
                        ) : (
                           <div id={`article-dropdown-${art.localId}`} className="w-full relative">
                             <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-brand-500 bg-white">
                                <Search className="w-4 h-4 text-gray-400 ml-3" />
                                <input 
                                  autoFocus={art.actionType !== 'conflict_warning'}
                                  type="text"
                                  placeholder="Nome materiale o macchinario..."
                                  value={art.searchText}
                                  onChange={(e) => {
                                    updateArticolo(idx, 'searchText', e.target.value);
                                    updateArticolo(idx, 'isMenuOpen', true);
                                    updateArticolo(idx, 'actionType', 'none');
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      checkArticleSearch(idx);
                                    }
                                  }}
                                  className="w-full p-2.5 pl-2 text-sm outline-none bg-transparent"
                                />
                                <button type="button" onClick={() => checkArticleSearch(idx)} className="text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs font-semibold rounded-md mx-1 transition-colors">OK</button>
                             </div>

                             {art.isMenuOpen && (
                               <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg max-h-48 overflow-y-auto z-50 py-1">
                                 {filteredArticoli.map(a => (
                                   <div 
                                     key={a.id} 
                                     onMouseDown={(e) => {
                                       e.preventDefault();
                                       updateArticolo(idx, 'articolo_id', a.id);
                                       updateArticolo(idx, 'searchText', a.nome);
                                       updateArticolo(idx, 'actionType', 'none');
                                       updateArticolo(idx, 'isMenuOpen', false);
                                       updateArticolo(idx, 'override_costo', a.costo);
                                       updateArticolo(idx, 'override_iva', a.aliquota_iva);
                                     }}
                                     className="px-4 py-2 hover:bg-brand-50 cursor-pointer border-b border-gray-50 last:border-0"
                                   >
                                     <div className="text-sm font-semibold text-gray-800">{a.nome}</div>
                                     <div className="text-[10px] text-gray-500 uppercase">{a.tipo} • €{a.costo}</div>
                                   </div>
                                 ))}
                                 <div 
                                   onMouseDown={(e) => {
                                      e.preventDefault();
                                      checkArticleSearch(idx);
                                   }}
                                   className="px-4 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm text-brand-600 font-bold"
                                 >
                                   + Aggiungi "{art.searchText}"
                                 </div>
                               </div>
                             )}
                           </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:w-32 flex flex-col">
                          <label className="text-[10px] text-gray-500 uppercase font-bold sm:hidden mb-1">Q.tà</label>
                          <div className="flex items-center border rounded-md overflow-hidden bg-gray-50 text-sm">
                            <input type="number" step="0.5" min="0" value={art.quantita_usata} onChange={e => updateArticolo(idx, 'quantita_usata', Number(e.target.value))} className="w-full p-2.5 outline-none min-w-0 bg-transparent text-right" />
                            <span className="px-3 border-l font-medium text-gray-600 bg-gray-100 whitespace-nowrap">{udmDisplayed}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => setSelectedArticoli(selectedArticoli.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2.5 rounded-lg flex items-center justify-center transition">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                    </div>

                    {/* Price Override Form */}
                    {(art.actionType === 'price_override') && art.showOverrideForm && (
                      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center text-blue-800 font-bold mb-3 text-sm">
                          <Edit3 className="w-4 h-4 mr-1.5" />
                          Prezzi personalizzati per questo intervento
                          <span className="ml-1 text-blue-500 font-normal text-xs">(il catalogo non verrà modificato)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Costo Base (€)</label>
                            <input
                              type="number" step="0.01" min="0"
                              value={art.override_costo}
                              onChange={e => updateArticolo(idx, 'override_costo', Number(e.target.value))}
                              className="w-full p-2 border border-blue-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                            <p className="text-[10px] text-gray-400 mt-0.5">Catalogo: €{selectedDbArt?.costo}</p>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">IVA (%)</label>
                            <select
                              value={art.override_iva}
                              onChange={e => updateArticolo(idx, 'override_iva', Number(e.target.value))}
                              className="w-full p-2 border border-blue-200 rounded-md outline-none bg-white"
                            >
                              <option value={22}>22%</option>
                              <option value={10}>10%</option>
                              <option value={4}>4%</option>
                              <option value={0}>0%</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-0.5">Catalogo: {selectedDbArt?.aliquota_iva}%</p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => { updateArticolo(idx, 'actionType', 'none'); updateArticolo(idx, 'showOverrideForm', false); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Usa prezzo catalogo
                          </button>
                          <button
                            type="button"
                            onClick={() => updateArticolo(idx, 'showOverrideForm', false)}
                            className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm transition shadow-sm"
                          >
                            Conferma prezzi
                          </button>
                        </div>
                      </div>
                    )}

                    {art.actionType === 'conflict_warning' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center text-amber-800 font-bold mb-2">
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                          Articolo Simile Trovato!
                        </div>
                        <p className="text-amber-700 mb-3 text-xs">
                          Hai scritto "{art.custom_nome}", ma esiste già: <strong>{art.similarItem?.nome}</strong> ({art.similarItem?.tipo}, €{art.similarItem?.costo}).
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => resolveConflict(idx, 'use_old')} className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold text-xs transition">Usa Esistente</button>
                          <button type="button" onClick={() => resolveConflict(idx, 'update_old')} className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded font-semibold text-xs transition">Modifica Esistente</button>
                          <button type="button" onClick={() => resolveConflict(idx, 'create_new')} className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 rounded font-semibold text-xs transition">Crea un Nuovo Articolo</button>
                        </div>
                      </div>
                    )}

                    {(art.actionType === 'create_new' || art.actionType === 'update_existing') && !art.isConfirmed && (
                      <div className="bg-brand-50/50 border border-brand-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center text-brand-800 font-bold mb-3 text-sm">
                          <Edit3 className="w-4 h-4 mr-1.5" />
                          {art.actionType === 'create_new' ? 'Completa le info per il nuovo articolo' : `Modifica dati per: ${art.similarItem?.nome}`}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="col-span-2">
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Nome</label>
                            <input required type="text" value={art.custom_nome} onChange={e => updateArticolo(idx, 'custom_nome', e.target.value)} className="w-full p-2 border border-brand-200 rounded-md outline-none focus:ring-1 focus:ring-brand-500" />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Tipo</label>
                            <select value={art.custom_tipo} onChange={e => updateArticolo(idx, 'custom_tipo', e.target.value)} className="w-full p-2 border border-brand-200 rounded-md outline-none">
                              <option value="materiale">Materiale</option>
                              <option value="macchinario">Macchinario</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Unità Mis.</label>
                            <select value={art.custom_unita_misura} onChange={e => updateArticolo(idx, 'custom_unita_misura', e.target.value)} className="w-full p-2 border border-brand-200 rounded-md outline-none">
                              <option value="pz">Pz</option>
                              <option value="kg">Kg</option>
                              <option value="ore">Ore</option>
                            </select>
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Costo Base (€)</label>
                            <input required type="number" step="0.01" min="0" value={art.custom_costo} onChange={e => updateArticolo(idx, 'custom_costo', Number(e.target.value))} className="w-full p-2 border border-brand-200 rounded-md outline-none focus:ring-1 focus:ring-brand-500" />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">IVA (%)</label>
                            <select value={art.custom_aliquota_iva} onChange={e => updateArticolo(idx, 'custom_aliquota_iva', Number(e.target.value))} className="w-full p-2 border border-brand-200 rounded-md outline-none">
                              <option value={22}>22%</option>
                              <option value={10}>10%</option>
                              <option value={4}>4%</option>
                              <option value={0}>0%</option>
                            </select>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button type="button" onClick={() => confirmCustomArticle(idx)} className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 text-sm transition shadow-sm">
                            Fatto, chiudi e prosegui
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Note Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note sull'intervento</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-brand-500 shadow-sm" placeholder="Dettagli, lavorazioni effettuate, etc..."></textarea>
          </div>

        </div>

        {/* Footer */}
        <div className="flex-none p-4 sm:p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="text-right w-full sm:w-auto order-1 sm:order-none">
            <p className="text-sm text-gray-500 font-medium mb-0.5">Costo Totale Stimato</p>
            <p className="text-2xl sm:text-3xl font-black text-brand-600 tracking-tight">€{calculateTotalCost()}</p>
          </div>
          <div className="flex space-x-3 w-full sm:w-auto order-2 sm:order-none">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:outline-none"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvataggio...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Salva Intervento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterventoModal;
