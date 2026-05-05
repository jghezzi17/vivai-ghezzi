import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';

interface Articolo {
  id: string;
  nome: string;
  tipo: 'macchinario' | 'materiale';
  quantita: number;
  unita_misura: 'ore' | 'pz' | 'kg';
  costo: number;
  aliquota_iva: number;
}

const ArticoliPage: React.FC = () => {
  const [articoli, setArticoli] = useState<Articolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Articolo>>({
    nome: '', tipo: 'materiale', quantita: 0, unita_misura: 'pz', costo: 0, aliquota_iva: 22
  });

  useEffect(() => {
    fetchArticoli();
  }, []);

  const fetchArticoli = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('articoli').select('*').order('nome');
    if (!error && data) {
      setArticoli(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('articoli').update(formData).eq('id', editingId);
    } else {
      await supabase.from('articoli').insert([formData]);
    }
    setIsModalOpen(false);
    fetchArticoli();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo articolo/macchinario?')) {
      await supabase.from('articoli').delete().eq('id', id);
      fetchArticoli();
    }
  };

  const openModal = (articolo?: Articolo) => {
    if (articolo) {
      setEditingId(articolo.id);
      setFormData(articolo);
    } else {
      setEditingId(null);
      setFormData({ nome: '', tipo: 'materiale', quantita: 0, unita_misura: 'pz', costo: 0, aliquota_iva: 22 });
    }
    setIsModalOpen(true);
  };

  const filteredArticoli = articoli.filter(a => {
    const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || a.tipo === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Articoli in Magazzino</h1>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nuovo Articolo</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca articolo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="all">Tutti i tipi</option>
              <option value="materiale">Materiali</option>
              <option value="macchinario">Macchinari</option>
            </select>
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
                    <th className="px-6 py-3">Articolo / Macchinario</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3 text-right">Giacenza</th>
                    <th className="px-6 py-3 text-right">Costo e IVA</th>
                    <th className="px-6 py-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticoli.map(art => (
                    <tr key={art.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{art.nome}</td>
                      <td className="px-6 py-4 capitalize">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${art.tipo === 'macchinario' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {art.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {art.quantita} {art.unita_misura}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div>€ {Number(art.costo).toFixed(2)}</div>
                        <div className="text-xs text-gray-400">IVA {art.aliquota_iva}%</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openModal(art)} className="text-brand-600 hover:text-brand-800 p-2">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(art.id)} className="text-red-600 hover:text-red-800 p-2 ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredArticoli.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nessun articolo trovato</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden p-4 space-y-4">
              {filteredArticoli.map(art => (
                <div key={art.id} className="bg-white border text-sm border-gray-200 p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-gray-900 text-base">{art.nome}</div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${art.tipo === 'macchinario' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {art.tipo}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Giacenza:</span>
                    <span className="font-medium text-gray-900">{art.quantita} {art.unita_misura}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Costo Unitario:</span>
                    <span>€ {Number(art.costo).toFixed(2)} (IVA {art.aliquota_iva}%)</span>
                  </div>
                  <div className="mt-3 flex justify-end space-x-2 border-t pt-2">
                    <button onClick={() => openModal(art)} className="text-brand-600 p-1 flex items-center">
                      <Edit2 className="w-4 h-4 mr-1" />
                    </button>
                    <button onClick={() => handleDelete(art.id)} className="text-red-600 p-1 flex items-center">
                      <Trash2 className="w-4 h-4 mr-1" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredArticoli.length === 0 && (
                <div className="text-center py-8 text-gray-500">Nessun articolo trovato</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto outline-none">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10 w-full">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Modifica Articolo' : 'Nuovo Articolo'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-semibold leading-none">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input required type="text" value={formData.nome || ''} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select required value={formData.tipo || 'materiale'} onChange={e => setFormData({ ...formData, tipo: e.target.value as any })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="materiale">Materiale</option>
                    <option value="macchinario">Macchinario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unità di Misura *</label>
                  <select required value={formData.unita_misura || 'pz'} onChange={e => setFormData({ ...formData, unita_misura: e.target.value as any })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="pz">Pezzi (pz)</option>
                    <option value="kg">Chilogrammi (kg)</option>
                    <option value="ore">Ore (h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità in giacenza *</label>
                <input required type="number" step="0.01" value={formData.quantita || 0} onChange={e => setFormData({ ...formData, quantita: parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario (€) *</label>
                  <input required type="number" step="0.01" value={formData.costo || 0} onChange={e => setFormData({ ...formData, costo: parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aliquota IVA (%) *</label>
                  <input required type="number" value={formData.aliquota_iva || 22} onChange={e => setFormData({ ...formData, aliquota_iva: parseFloat(e.target.value) })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Annulla
                </button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm">
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticoliPage;
