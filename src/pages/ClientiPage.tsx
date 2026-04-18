import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  partita_iva: string;
  email: string;
  telefono: string;
  indirizzo: string;
}

const ClientiPage: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nome: '', cognome: '', codice_fiscale: '', partita_iva: '', email: '', telefono: '', indirizzo: ''
  });

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
      setFormData({ nome: '', cognome: '', codice_fiscale: '', partita_iva: '', email: '', telefono: '', indirizzo: '' });
    }
    setIsModalOpen(true);
  };

  const filteredClienti = clienti.filter(c => 
    `${c.nome} ${c.cognome}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
        <button 
          onClick={() => openModal()}
          className="flex items-center space-x-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Cerca cliente per nome o email..."
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
                    <th className="px-6 py-3">Nome Completo</th>
                    <th className="px-6 py-3">Contatti</th>
                    <th className="px-6 py-3">CF / P.IVA</th>
                    <th className="px-6 py-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClienti.map(cliente => (
                    <tr key={cliente.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {cliente.cognome} {cliente.nome}
                      </td>
                      <td className="px-6 py-4">
                        <div>{cliente.email}</div>
                        <div className="text-xs text-gray-400">{cliente.telefono}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{cliente.codice_fiscale}</div>
                        <div className="text-xs text-gray-400">{cliente.partita_iva}</div>
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
                  <div className="font-bold text-gray-900 text-base mb-1">{cliente.cognome} {cliente.nome}</div>
                  {cliente.email && <div className="text-gray-600 truncate">Email: {cliente.email}</div>}
                  {cliente.telefono && <div className="text-gray-600">Tel: {cliente.telefono}</div>}
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto outline-none" role="dialog">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10 w-full">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-semibold leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input required type="text" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                  <input required type="text" value={formData.cognome || ''} onChange={e => setFormData({...formData, cognome: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                  <input type="text" value={formData.codice_fiscale || ''} onChange={e => setFormData({...formData, codice_fiscale: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                  <input type="text" value={formData.partita_iva || ''} onChange={e => setFormData({...formData, partita_iva: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input type="tel" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                <textarea rows={2} value={formData.indirizzo || ''} onChange={e => setFormData({...formData, indirizzo: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annulla
                </button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm">
                  Salva Cliente
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
