import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface Cliente {
  id: string;
  nome?: string;
  cognome: string;
  codice_fiscale?: string;
  partita_iva?: string;
  email?: string;
  telefono?: string;
  cellulare?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  nazione?: string;
  pec?: string;
  codice_destinatario?: string;
  referente?: string;
  extra?: string;
  cod_cliente?: string;
  regione?: string;
  fax?: string;
  sconti?: string;
  listino?: string;
  fido?: string;
  agente?: string;
  pagamento?: string;
  banca?: string;
  ns_banca?: string;
  note?: string;
}

const ClientiPage: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState: Partial<Cliente> = {
    nome: '', cognome: '', codice_fiscale: '', partita_iva: '', email: '', telefono: '', cellulare: '', indirizzo: '',
    cap: '', citta: '', provincia: '', nazione: '', pec: '', codice_destinatario: '', referente: '', extra: '',
    cod_cliente: '', regione: '', fax: '', sconti: '', listino: '', fido: '', agente: '', pagamento: '', banca: '', ns_banca: '', note: ''
  };

  const [formData, setFormData] = useState<Partial<Cliente>>(initialFormState);

  useEffect(() => {
    fetchClienti();
  }, []);

  const fetchClienti = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clienti').select('*').order('cognome');
    if (!error && data) {
      setClienti(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('clienti').update(formData).eq('id', editingId);
    } else {
      await supabase.from('clienti').insert([formData]);
    }
    setIsModalOpen(false);
    fetchClienti();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente?')) {
      await supabase.from('clienti').delete().eq('id', id);
      fetchClienti();
    }
  };

  const openModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingId(cliente.id);
      setFormData(cliente);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

      const clientsToInsert = jsonData.map(row => {
        const getVal = (possibleKeys: string[]) => {
          const key = possibleKeys.find(k => Object.keys(row).some(rk => rk.trim() === k));
          return key ? String(row[key]).trim() : '';
        };

        const nome = getVal(['Nome']);
        const cognome = getVal(['Denominazione', 'Cognome', 'Ragione Sociale']);
        
        let finalCognome = cognome;
        if (!finalCognome && nome) {
          finalCognome = nome; // fallback se c'è solo un nome
        }

        return {
          nome: nome || null,
          cognome: finalCognome || 'Utente Sconosciuto',
          codice_fiscale: getVal(['Codice fiscale', 'Codice Fiscale', 'CF']),
          partita_iva: getVal(['Partita Iva', 'P.IVA', 'Partita IVA', 'Piva']),
          email: getVal(['e-mail', 'Email', 'E-mail']),
          telefono: getVal(['Tel.', 'Telefono', 'Tel']),
          cellulare: getVal(['Cell', 'Cellulare', 'Cell.']),
          indirizzo: getVal(['Indirizzo', 'Via']),
          cap: getVal(['Cap', 'CAP']),
          citta: getVal(['Città', 'Citta', 'Comune']),
          provincia: getVal(['Prov.', 'Provincia', 'Prov']),
          nazione: getVal(['Nazione']),
          pec: getVal(['Pec', 'PEC']),
          codice_destinatario: getVal(['Cod. destinatario Fatt. elettr.', 'Codice Destinatario', 'SDI']),
          referente: getVal(['Referente']),
          extra: `Da import: ${file.name}`,
          
          cod_cliente: getVal(['Cod.', 'Codice Cliente', 'Codice']),
          regione: getVal(['Regione']),
          fax: getVal(['Fax']),
          sconti: getVal(['Sconti']),
          listino: getVal(['Listino']),
          fido: getVal(['Fido']),
          agente: getVal(['Agente']),
          pagamento: getVal(['Pagamento']),
          banca: getVal(['Banca']),
          ns_banca: getVal(['Ns Banca', 'Nostra Banca']),
          note: getVal(['Note doc.', 'Note'])
        };
      }).filter(c => c.cognome !== 'Utente Sconosciuto');

      if (clientsToInsert.length === 0) {
        alert("Nessun cliente valido trovato nel file. Verifica le intestazioni delle colonne.");
        return;
      }

      // Supabase consiglia batch di 1000 per insert.
      const BATCH_SIZE = 500;
      for (let i = 0; i < clientsToInsert.length; i += BATCH_SIZE) {
        const batch = clientsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('clienti').insert(batch);
        if (error) {
          console.error("Error inserting batch:", error);
          alert("Errore durante l'inserimento. Controlla la console.");
        }
      }

      alert(`Importati ${clientsToInsert.length} clienti con successo!`);
      // Update data immediately
      fetchClienti();

    } catch (err) {
      console.error(err);
      alert("Errore nella lettura del file excel/csv.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredClienti = clienti.filter(c => 
    `${c.nome || ''} ${c.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codice_fiscale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cod_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".csv, .ods, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/vnd.oasis.opendocument.spreadsheet"
          />
          <button 
            onClick={triggerFileUpload}
            disabled={importing}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            <span>{importing ? "Importazione..." : "Importa File"}</span>
          </button>

          <button 
            onClick={() => openModal()}
            className="flex items-center space-x-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Nuovo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Cerca cliente per nome, email o codice..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

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
                    <th className="px-6 py-3">Ragione Sociale / Nome</th>
                    <th className="px-6 py-3">Contatti</th>
                    <th className="px-6 py-3">CF / P.IVA</th>
                    <th className="px-6 py-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClienti.map(cliente => (
                    <tr key={cliente.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {cliente.cognome} {cliente.nome && cliente.nome !== '-' ? cliente.nome : ''}
                        {cliente.cod_cliente && <span className="ml-2 px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded text-xs">Cod: {cliente.cod_cliente}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{cliente.email || '-'}</div>
                        <div className="text-xs text-gray-400">{cliente.telefono || cliente.cellulare || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{cliente.partita_iva || '-'}</div>
                        <div className="text-xs text-gray-400">{cliente.codice_fiscale || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openModal(cliente)} className="text-brand-600 hover:text-brand-800 p-2">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cliente.id)} className="text-red-600 hover:text-red-800 p-2 ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredClienti.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center">Nessun cliente trovato</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden p-4 space-y-4">
              {filteredClienti.map(cliente => (
                <div key={cliente.id} className="bg-white border text-sm border-gray-200 p-4 rounded-lg shadow-sm">
                  <div className="font-bold text-gray-900 text-base mb-1">
                    {cliente.cognome} {cliente.nome && cliente.nome !== '-' ? cliente.nome : ''}
                  </div>
                  {cliente.cod_cliente && <div className="text-xs text-gray-500 mb-2">Cod: {cliente.cod_cliente}</div>}
                  {(cliente.email || cliente.pec) && <div className="text-gray-600 truncate">Email: {cliente.email || cliente.pec}</div>}
                  {(cliente.telefono || cliente.cellulare) && <div className="text-gray-600">Tel: {cliente.telefono || cliente.cellulare}</div>}
                  <div className="mt-3 flex justify-end space-x-2 border-t pt-2">
                    <button onClick={() => openModal(cliente)} className="text-brand-600 p-1 flex items-center">
                      <Edit2 className="w-4 h-4 mr-1" /> Modifica
                    </button>
                    <button onClick={() => handleDelete(cliente.id)} className="text-red-600 p-1 flex items-center">
                      <Trash2 className="w-4 h-4 mr-1" /> Elimina
                    </button>
                  </div>
                </div>
              ))}
              {filteredClienti.length === 0 && (
                <div className="text-center py-8 text-gray-500">Nessun cliente trovato</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto outline-none" role="dialog">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10 w-full">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-semibold leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonna Sinistra */}
                <div className="space-y-6">
                  
                  {/* Blocco Dati Anagrafici */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Dati Anagrafici</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Codice Cliente</label>
                        <input type="text" value={formData.cod_cliente || ''} onChange={e => setFormData({...formData, cod_cliente: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="Es. 0001" />
                      </div>
                      <div>
                         {/* Spacer per layout in desktop */}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ragione Sociale / Cognome *</label>
                        <input required type="text" value={formData.cognome || ''} onChange={e => setFormData({...formData, cognome: e.target.value})} className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Es. Mario Rossi o Azienda Srl" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome (Opzionale)</label>
                        <input type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                      <div>
                         {/* Spacer per layout in desktop */}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Codice Fiscale</label>
                        <input type="text" value={formData.codice_fiscale || ''} onChange={e => setFormData({...formData, codice_fiscale: e.target.value})} className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none uppercase" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Partita IVA</label>
                        <input type="text" value={formData.partita_iva || ''} onChange={e => setFormData({...formData, partita_iva: e.target.value})} className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Blocco Contatti */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Contatti</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PEC</label>
                        <input type="email" value={formData.pec || ''} onChange={e => setFormData({...formData, pec: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefono Fisso</label>
                        <input type="tel" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cellulare</label>
                        <input type="tel" value={formData.cellulare || ''} onChange={e => setFormData({...formData, cellulare: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fax</label>
                        <input type="tel" value={formData.fax || ''} onChange={e => setFormData({...formData, fax: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Referente</label>
                        <input type="text" value={formData.referente || ''} onChange={e => setFormData({...formData, referente: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Codice Destinatario (SDI)</label>
                        <input type="text" value={formData.codice_destinatario || ''} onChange={e => setFormData({...formData, codice_destinatario: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonna Destra */}
                <div className="space-y-6">
                  
                  {/* Blocco Sede e Indirizzo */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Sede e Indirizzo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Indirizzo / Via</label>
                        <input type="text" value={formData.indirizzo || ''} onChange={e => setFormData({...formData, indirizzo: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Città</label>
                        <input type="text" value={formData.citta || ''} onChange={e => setFormData({...formData, citta: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CAP</label>
                          <input type="text" value={formData.cap || ''} onChange={e => setFormData({...formData, cap: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provincia</label>
                          <input type="text" value={formData.provincia || ''} onChange={e => setFormData({...formData, provincia: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Regione</label>
                        <input type="text" value={formData.regione || ''} onChange={e => setFormData({...formData, regione: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nazione</label>
                        <input type="text" value={formData.nazione || ''} onChange={e => setFormData({...formData, nazione: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                    </div>
                  </div>

                  {/* Blocco Amministrazione & Commerciale */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">Ammin. & Commerciale</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pagamento</label>
                        <input type="text" value={formData.pagamento || ''} onChange={e => setFormData({...formData, pagamento: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Agente</label>
                        <input type="text" value={formData.agente || ''} onChange={e => setFormData({...formData, agente: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banca Appoggio</label>
                        <input type="text" value={formData.banca || ''} onChange={e => setFormData({...formData, banca: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nostra Banca (Ns Banca)</label>
                        <input type="text" value={formData.ns_banca || ''} onChange={e => setFormData({...formData, ns_banca: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 md:col-span-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Listino</label>
                          <input type="text" value={formData.listino || ''} onChange={e => setFormData({...formData, listino: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sconti</label>
                          <input type="text" value={formData.sconti || ''} onChange={e => setFormData({...formData, sconti: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fido</label>
                          <input type="text" value={formData.fido || ''} onChange={e => setFormData({...formData, fido: e.target.value})} className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note Aggiuntive */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Note Aggiuntive</label>
                    <textarea rows={2} value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm" placeholder="Eventuali note..."></textarea>
                  </div>
                  
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                  Annulla
                </button>
                <button type="submit" className="px-6 py-2.5 bg-brand-600 font-medium text-white rounded-lg hover:bg-brand-700 shadow-sm transition">
                  {editingId ? 'Salva Modifiche' : 'Salva Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientiPage;
