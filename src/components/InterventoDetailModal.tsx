import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import {
  X, Edit2, Download, Save, User, Calendar, FileText,
  Package, Users, Euro, Clock, Trash2, AlertTriangle, Plus
} from 'lucide-react';

interface InterventoDetailModalProps {
  interventoId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
  onSaved?: () => void;
}

const InterventoDetailModal: React.FC<InterventoDetailModalProps> = ({
  interventoId,
  onClose,
  onDeleted,
  onSaved,
}) => {
  const [intervento, setIntervento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reference data for selects
  const [allOperai, setAllOperai] = useState<any[]>([]);
  const [allArticoli, setAllArticoli] = useState<any[]>([]);

  // Edit state
  const [editNote, setEditNote] = useState('');
  const [editData, setEditData] = useState('');
  const [editOperai, setEditOperai] = useState<any[]>([]);
  const [editArticoli, setEditArticoli] = useState<any[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (interventoId) {
      fetchIntervento(interventoId);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [interventoId]);

  // Load reference data when entering edit mode
  useEffect(() => {
    if (isEditing && allOperai.length === 0) {
      loadReferenceData();
    }
  }, [isEditing]);

  const loadReferenceData = async () => {
    const [operaiRes, articoliRes] = await Promise.all([
      supabase.from('usersvivai').select('id, nome, cognome, email, ruolo').in('ruolo', ['operaio', 'admin']),
      supabase.from('articoli').select('id, nome, tipo, costo, aliquota_iva, unita_misura').order('nome'),
    ]);
    if (operaiRes.data) setAllOperai(operaiRes.data);
    if (articoliRes.data) setAllArticoli(articoliRes.data);
  };

  const fetchIntervento = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('interventi')
      .select(`
        id, data, note, costo_totale, created_at,
        clienti (id, nome, cognome, email, telefono, indirizzo),
        intervento_operai (
          id, ora_inizio, ora_fine, pausa_minuti,
          usersvivai (id, nome, cognome, email, ruolo)
        ),
        intervento_articoli (
          id, quantita_usata,
          articoli (id, nome, tipo, costo, aliquota_iva, unita_misura)
        )
      `)
      .eq('id', id)
      .single();

    if (!error && data) {
      setIntervento(data);
      setEditNote(data.note || '');
      setEditData(data.data || '');
      // Flatten for editing
      setEditOperai(
        (data.intervento_operai || []).map((op: any) => ({
          id: op.id, // existing row id (null = new)
          operaio_id: op.usersvivai?.id || '',
          ora_inizio: op.ora_inizio || '08:00',
          ora_fine: op.ora_fine || '17:00',
          pausa_minuti: op.pausa_minuti || 0,
        }))
      );
      setEditArticoli(
        (data.intervento_articoli || []).map((art: any) => ({
          id: art.id,
          articolo_id: art.articoli?.id || '',
          quantita_usata: art.quantita_usata || 1,
        }))
      );
    }
    setLoading(false);
  };

  const recalcCosto = (operai: any[], articoli: any[]) => {
    let cost = 0;
    operai.forEach(op => {
      if (op.ora_inizio && op.ora_fine) {
        const [hS, mS] = op.ora_inizio.split(':').map(Number);
        const [hE, mE] = op.ora_fine.split(':').map(Number);
        let s = hS * 60 + mS, e = hE * 60 + mE;
        if (e < s) e += 24 * 60;
        const mins = e - s - (op.pausa_minuti || 0);
        if (mins > 0) cost += (mins / 60) * 10;
      }
    });
    articoli.forEach(art => {
      const dbArt = allArticoli.find(a => a.id === art.articolo_id);
      if (dbArt && art.quantita_usata) {
        cost += Number(dbArt.costo) * (1 + Number(dbArt.aliquota_iva) / 100) * Number(art.quantita_usata);
      }
    });
    return cost.toFixed(2);
  };

  const handleSave = async () => {
    if (!intervento) return;
    setSaving(true);
    try {
      const costoTotale = recalcCosto(editOperai, editArticoli);

      // 1. Update main intervento
      await supabase.from('interventi')
        .update({ note: editNote, data: editData, costo_totale: costoTotale })
        .eq('id', intervento.id);

      // 2. Replace operai: delete all existing, re-insert
      await supabase.from('intervento_operai').delete().eq('intervento_id', intervento.id);
      if (editOperai.length > 0) {
        await supabase.from('intervento_operai').insert(
          editOperai
            .filter(op => op.operaio_id)
            .map(op => ({
              intervento_id: intervento.id,
              operaio_id: op.operaio_id,
              ora_inizio: op.ora_inizio,
              ora_fine: op.ora_fine,
              pausa_minuti: op.pausa_minuti || 0,
            }))
        );
      }

      // 3. Replace articoli: delete all existing, re-insert
      await supabase.from('intervento_articoli').delete().eq('intervento_id', intervento.id);
      if (editArticoli.length > 0) {
        await supabase.from('intervento_articoli').insert(
          editArticoli
            .filter(art => art.articolo_id)
            .map(art => ({
              intervento_id: intervento.id,
              articolo_id: art.articolo_id,
              quantita_usata: art.quantita_usata,
            }))
        );
      }

      setIsEditing(false);
      fetchIntervento(intervento.id);
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!intervento) return;
    setSaving(true);
    await supabase.from('intervento_operai').delete().eq('intervento_id', intervento.id);
    await supabase.from('intervento_articoli').delete().eq('intervento_id', intervento.id);
    const { error } = await supabase.from('interventi').delete().eq('id', intervento.id);
    if (!error) { onDeleted?.(); onClose(); }
    setSaving(false);
  };

  const calculateWorkerHours = (op: any) => {
    if (!op.ora_inizio || !op.ora_fine) return 0;
    const [hS, mS] = op.ora_inizio.split(':').map(Number);
    const [hE, mE] = op.ora_fine.split(':').map(Number);
    let s = hS * 60 + mS, e = hE * 60 + mE;
    if (e < s) e += 24 * 60;
    return Math.max(0, (e - s - (op.pausa_minuti || 0)) / 60);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('intervento-print-content');
    if (!printContent) return;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/>
      <title>Intervento - ${intervento?.clienti ? `${intervento.clienti.cognome} ${intervento.clienti.nome}` : 'Generico'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2D5A27; padding-bottom: 20px; margin-bottom: 24px; }
        .logo { font-size: 22px; font-weight: 900; color: #2D5A27; letter-spacing: -0.5px; }
        .logo span { display: block; font-size: 11px; font-weight: 500; color: #6b7280; margin-top: 2px; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 18px; font-weight: 800; color: #111; }
        .doc-title p { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-item label { display: block; font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
        .info-item p { font-size: 13px; font-weight: 600; color: #111; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f9fafb; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 8px 10px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #374151; }
        .note-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; font-size: 12px; color: #374151; line-height: 1.6; }
        .total-row { display: flex; justify-content: flex-end; margin-top: 12px; }
        .total-box { background: #2D5A27; color: white; padding: 10px 20px; border-radius: 8px; font-size: 16px; font-weight: 800; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
      </style></head><body>
      ${printContent.innerHTML}
      <div class="footer">Documento generato il ${format(new Date(), 'd MMMM yyyy', { locale: itLocale })} • Vivai Ghezzi</div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>`);
    w.document.close();
  };

  const updateEditOperaio = (idx: number, field: string, value: any) => {
    const updated = [...editOperai];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditOperai(updated);
  };

  const updateEditArticolo = (idx: number, field: string, value: any) => {
    const updated = [...editArticoli];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditArticoli(updated);
  };

  if (!interventoId) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #2D5A27, #1d3f1a)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {isEditing ? 'Modifica Intervento' : 'Dettaglio Intervento'}
              </h2>
              {!loading && intervento && (
                <p className="text-white/70 text-xs mt-0.5">
                  {intervento.clienti ? `${intervento.clienti.cognome} ${intervento.clienti.nome}` : 'Intervento Generico'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && intervento && (
              <>
                {!isEditing && (
                  <button onClick={handlePrint} className="flex items-center gap-1.5 text-white bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-lg text-sm font-semibold">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                )}
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 text-white bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-lg text-sm font-semibold">
                    <Edit2 className="w-4 h-4" /> Modifica
                  </button>
                ) : (
                  <>
                    <button onClick={() => setIsEditing(false)} className="text-white/70 hover:text-white transition px-3 py-1.5 rounded-lg text-sm font-semibold">
                      Annulla
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-green-800 bg-white hover:bg-green-50 transition px-3 py-1.5 rounded-lg text-sm font-bold">
                      {saving ? <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                      Salva
                    </button>
                  </>
                )}
              </>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white transition ml-1">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-60">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-3"></div>
              <p className="text-gray-500 text-sm">Caricamento...</p>
            </div>
          ) : !intervento ? (
            <p className="text-center text-gray-500 py-12">Intervento non trovato.</p>
          ) : (
            <>
              {/* Hidden print block */}
              <div id="intervento-print-content" className="hidden" ref={printRef}>
                <div className="header">
                  <div className="logo">🌿 VIVAIGHEZZI<span>Gestione Interventi</span></div>
                  <div className="doc-title">
                    <h1>Riepilogo Intervento</h1>
                    <p>Data: {intervento.data ? format(parseISO(intervento.data), 'd MMMM yyyy', { locale: itLocale }) : '-'}</p>
                    <p>Costo Totale: €{Number(intervento.costo_totale || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="section">
                  <div className="section-title">Informazioni Generali</div>
                  <div className="info-grid">
                    <div className="info-item"><label>Cliente</label><p>{intervento.clienti ? `${intervento.clienti.cognome} ${intervento.clienti.nome}` : 'Generico'}</p></div>
                    <div className="info-item"><label>Data</label><p>{intervento.data ? format(parseISO(intervento.data), 'd MMMM yyyy', { locale: itLocale }) : '-'}</p></div>
                    {intervento.clienti?.email && <div className="info-item"><label>Email</label><p>{intervento.clienti.email}</p></div>}
                    {intervento.clienti?.telefono && <div className="info-item"><label>Telefono</label><p>{intervento.clienti.telefono}</p></div>}
                    {intervento.clienti?.indirizzo && <div className="info-item" style={{ gridColumn: 'span 2' }}><label>Indirizzo</label><p>{intervento.clienti.indirizzo}</p></div>}
                  </div>
                </div>
                {intervento.intervento_operai?.length > 0 && (
                  <div className="section">
                    <div className="section-title">Squadra</div>
                    <table><thead><tr><th>Operaio</th><th>Ruolo</th><th>Inizio</th><th>Fine</th><th>Pausa</th><th>Ore</th></tr></thead>
                      <tbody>{intervento.intervento_operai.map((op: any) => (
                        <tr key={op.id}>
                          <td>{op.usersvivai?.nome ? `${op.usersvivai.nome} ${op.usersvivai.cognome}` : op.usersvivai?.email}</td>
                          <td style={{ textTransform: 'capitalize' }}>{op.usersvivai?.ruolo}</td>
                          <td>{op.ora_inizio}</td><td>{op.ora_fine}</td>
                          <td>{op.pausa_minuti}min</td>
                          <td>{calculateWorkerHours(op).toFixed(1)}h</td>
                        </tr>
                      ))}</tbody></table>
                  </div>
                )}
                {intervento.intervento_articoli?.length > 0 && (
                  <div className="section">
                    <div className="section-title">Materiali e Macchinari</div>
                    <table><thead><tr><th>Articolo</th><th>Tipo</th><th>Qtà</th><th>Unità</th><th>Costo</th></tr></thead>
                      <tbody>{intervento.intervento_articoli.map((art: any) => (
                        <tr key={art.id}>
                          <td>{art.articoli?.nome}</td>
                          <td style={{ textTransform: 'capitalize' }}>{art.articoli?.tipo}</td>
                          <td>{art.quantita_usata}</td><td>{art.articoli?.unita_misura}</td>
                          <td>€{(Number(art.articoli?.costo || 0) * (1 + Number(art.articoli?.aliquota_iva || 0) / 100) * Number(art.quantita_usata)).toFixed(2)}</td>
                        </tr>
                      ))}</tbody></table>
                  </div>
                )}
                {intervento.note && <div className="section"><div className="section-title">Note</div><div className="note-box">{intervento.note}</div></div>}
                <div className="total-row"><div className="total-box">Totale: €{Number(intervento.costo_totale || 0).toFixed(2)}</div></div>
              </div>

              {/* ── Info summary cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-brand-50 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-600" />
                    <span className="text-[10px] font-bold uppercase text-brand-600 tracking-wider">Data</span>
                  </div>
                  {isEditing ? (
                    <input type="date" value={editData} onChange={e => setEditData(e.target.value)}
                      className="w-full text-sm border rounded-lg p-1.5 border-brand-300 bg-white" />
                  ) : (
                    <p className="font-bold text-gray-900 text-sm capitalize">
                      {intervento.data ? format(parseISO(intervento.data), 'd MMM yyyy', { locale: itLocale }) : '-'}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Cliente</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">
                    {intervento.clienti ? `${intervento.clienti.cognome} ${intervento.clienti.nome}` : 'Generico'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Operai</span>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{isEditing ? editOperai.length : (intervento.intervento_operai?.length || 0)} assegnati</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Euro className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] font-bold uppercase text-green-600 tracking-wider">Costo</span>
                  </div>
                  <p className="font-bold text-green-700 text-lg">
                    {isEditing
                      ? `€${recalcCosto(editOperai, editArticoli)}`
                      : `€${Number(intervento.costo_totale || 0).toFixed(2)}`}
                  </p>
                </div>
              </div>

              {/* ── Operai section ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" /> Squadra
                  </h3>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setEditOperai([...editOperai, { id: null, operaio_id: '', ora_inizio: '08:00', ora_fine: '17:00', pausa_minuti: 60 }])}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Aggiungi
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    {editOperai.length === 0 && (
                      <p className="text-sm text-gray-400 italic text-center py-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nessun operaio assegnato.</p>
                    )}
                    {editOperai.map((op, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-blue-50/40 border border-blue-100 p-3 rounded-xl">
                        <select
                          value={op.operaio_id}
                          onChange={e => updateEditOperaio(idx, 'operaio_id', e.target.value)}
                          className="flex-1 p-2 text-sm border border-gray-200 rounded-lg bg-white"
                        >
                          <option value="">Seleziona operaio...</option>
                          {allOperai.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.nome || o.cognome ? `${o.nome} ${o.cognome}` : o.email} ({o.ruolo})
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2 items-center">
                          <input type="time" value={op.ora_inizio}
                            onChange={e => updateEditOperaio(idx, 'ora_inizio', e.target.value)}
                            className="p-2 text-sm border border-gray-200 rounded-lg bg-white w-28" />
                          <span className="text-gray-400 text-sm">–</span>
                          <input type="time" value={op.ora_fine}
                            onChange={e => updateEditOperaio(idx, 'ora_fine', e.target.value)}
                            className="p-2 text-sm border border-gray-200 rounded-lg bg-white w-28" />
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <input type="number" value={op.pausa_minuti} min={0}
                              onChange={e => updateEditOperaio(idx, 'pausa_minuti', Number(e.target.value))}
                              className="w-16 p-2 text-sm outline-none" />
                            <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l">min</span>
                          </div>
                          <button type="button" onClick={() => setEditOperai(editOperai.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(!intervento.intervento_operai || intervento.intervento_operai.length === 0) && (
                      <p className="text-sm text-gray-400 italic text-center py-3 bg-gray-50 rounded-xl border border-dashed">Nessun operaio assegnato.</p>
                    )}
                    {intervento.intervento_operai?.map((op: any) => (
                      <div key={op.id} className="bg-white border border-gray-100 rounded-xl p-3.5 flex flex-wrap gap-3 items-center shadow-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {op.usersvivai?.nome || op.usersvivai?.cognome ? `${op.usersvivai.nome} ${op.usersvivai.cognome}` : op.usersvivai?.email}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{op.usersvivai?.ruolo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{op.ora_inizio} – {op.ora_fine}</span>
                          {op.pausa_minuti > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">pausa {op.pausa_minuti}min</span>}
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{calculateWorkerHours(op).toFixed(1)}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Articoli section ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" /> Materiali e Macchinari
                  </h3>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setEditArticoli([...editArticoli, { id: null, articolo_id: '', quantita_usata: 1 }])}
                      className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Aggiungi
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    {editArticoli.length === 0 && (
                      <p className="text-sm text-gray-400 italic text-center py-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">Nessun materiale selezionato.</p>
                    )}
                    {editArticoli.map((art, idx) => {
                      const dbArt = allArticoli.find(a => a.id === art.articolo_id);
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-orange-50/40 border border-orange-100 p-3 rounded-xl">
                          <select
                            value={art.articolo_id}
                            onChange={e => updateEditArticolo(idx, 'articolo_id', e.target.value)}
                            className="flex-1 p-2 text-sm border border-gray-200 rounded-lg bg-white"
                          >
                            <option value="">Seleziona articolo...</option>
                            {allArticoli.map(a => (
                              <option key={a.id} value={a.id}>{a.nome} ({a.tipo})</option>
                            ))}
                          </select>
                          <div className="flex gap-2 items-center">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                              <input type="number" step="0.01" min="0.01" value={art.quantita_usata}
                                onChange={e => updateEditArticolo(idx, 'quantita_usata', Number(e.target.value))}
                                className="w-20 p-2 text-sm outline-none" />
                              <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l">{dbArt?.unita_misura || 'qty'}</span>
                            </div>
                            {dbArt && <span className="text-xs text-orange-600 font-semibold whitespace-nowrap">€{(Number(dbArt.costo) * (1 + Number(dbArt.aliquota_iva) / 100) * Number(art.quantita_usata)).toFixed(2)}</span>}
                            <button type="button" onClick={() => setEditArticoli(editArticoli.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(!intervento.intervento_articoli || intervento.intervento_articoli.length === 0) && (
                      <p className="text-sm text-gray-400 italic text-center py-3 bg-gray-50 rounded-xl border border-dashed">Nessun materiale.</p>
                    )}
                    {intervento.intervento_articoli?.map((art: any) => (
                      <div key={art.id} className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{art.articoli?.nome}</p>
                            <p className="text-xs text-gray-500 capitalize">{art.articoli?.tipo}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-800 text-sm">{art.quantita_usata} {art.articoli?.unita_misura}</p>
                          <p className="text-xs text-orange-600 font-semibold">€{(Number(art.articoli?.costo || 0) * (1 + Number(art.articoli?.aliquota_iva || 0) / 100) * Number(art.quantita_usata)).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Notes ── */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" /> Note
                </h3>
                {isEditing ? (
                  <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={3}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-brand-500 resize-none"
                    placeholder="Aggiungi note sull'intervento..." />
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600 leading-relaxed min-h-[60px]">
                    {intervento.note || <span className="text-gray-400 italic">Nessuna nota.</span>}
                  </div>
                )}
              </div>

              {/* ── Delete ── */}
              {!isEditing && (
                <div className="border-t border-gray-100 pt-4">
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-semibold transition">
                      <Trash2 className="w-4 h-4" /> Elimina Intervento
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-sm text-red-700 font-medium flex-1">Sei sicuro? L'intervento verrà eliminato definitivamente.</p>
                      <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1">Annulla</button>
                      <button onClick={handleDelete} disabled={saving} className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-red-700 transition">Elimina</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterventoDetailModal;
