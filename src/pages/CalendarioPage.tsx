import React, { useState, useEffect } from 'react';
import { format, startOfToday, addDays, isSameDay, parseISO } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Plus, Calendar as CalendarIcon, User, CheckCircle2 } from 'lucide-react';
import InterventoModal from '../components/InterventoModal';

const CalendarioPage: React.FC = () => {
  const today = startOfToday();
  const dateRange = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  const [interventi, setInterventi] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterventi();
  }, []);

  const fetchInterventi = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('interventi')
      .select('id, data, note, clienti(nome, cognome)');

    if (!error && data) {
      setInterventi(data);
    }
    setLoading(false);
  };

  const handleSelectEvent = (intervento: any) => {
    // Optionally open the modal in view/edit mode for existing events
    console.log("Selected intervento:", intervento);
  };

  const onModalClose = (wasSaved: boolean) => {
    setIsModalOpen(false);
    if (wasSaved) {
      fetchInterventi();
    }
  };

  const dayEvents = interventi.filter((int) => {
    if (!int.data) return false;
    // Handle either string or Date objects gracefully
    const intDate = typeof int.data === 'string' ? parseISO(int.data) : new Date(int.data);
    return isSameDay(intDate, selectedDate);
  });

  return (
    <div className="space-y-4 h-full flex flex-col pt-2 pb-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calendario</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestisci i tuoi interventi programmati</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center bg-brand-600 text-white w-10 h-10 md:w-auto md:px-4 md:h-10 md:py-2 rounded-full md:rounded-lg hover:bg-brand-700 transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline md:ml-2 font-medium">Nuovo</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mt-4 shrink-0">
        <div className="flex overflow-x-auto gap-3 pb-4 snap-x hide-scrollbar px-2 -mx-2 items-center">
          {dateRange.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isSameDay(date, today);
            
            // Check if there are any events on this date
            const hasEvents = interventi.some(int => {
              if (!int.data) return false;
              const intDate = typeof int.data === 'string' ? parseISO(int.data) : new Date(int.data);
              return isSameDay(intDate, date);
            });

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`snap-center shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-20 rounded-2xl transition-all relative ${
                  isSelected
                    ? 'bg-brand-600 shadow-md shadow-brand-600/30'
                    : isTodayDate
                    ? 'bg-brand-50 border border-brand-200'
                    : 'bg-white border border-gray-200 hover:border-brand-300'
                }`}
              >
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-brand-100' : 'text-gray-500'}`}>
                  {format(date, 'EEE', { locale: itLocale })}
                </span>
                <span className={`text-xl font-black mt-0.5 tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {format(date, 'd')}
                </span>
                
                {/* Event Indicator Dot */}
                {hasEvents && (
                  <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-500'}`}></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day View */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 px-4 py-5 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-5">
          <CalendarIcon className="w-5 h-5 text-brand-600" />
          <h2 className="text-[17px] font-bold text-gray-900 capitalize">
            {format(selectedDate, 'EEEE d MMMM', { locale: itLocale })}
          </h2>
          {isSameDay(selectedDate, today) && (
            <span className="ml-auto text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              Oggi
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 blur-[0.5px]"></div>
              <p className="text-gray-500 text-sm mt-3 animate-pulse">Caricamento interventi...</p>
            </div>
          ) : dayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center rounded-2xl bg-gray-50/50 border border-dashed border-gray-200 p-6">
              <div className="bg-white shadow-sm w-12 h-12 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-gray-700 font-semibold">Nessun intervento pianificato</p>
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                Pianifica la giornata o riposati!
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-6 text-brand-600 font-medium hover:text-brand-700 text-sm flex items-center gap-1.5 bg-brand-50 px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" /> Aggiungi
              </button>
            </div>
          ) : (
            dayEvents.map(int => (
              <div 
                key={int.id} 
                className="group relative bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition hover:border-brand-200 cursor-pointer overflow-hidden" 
                onClick={() => handleSelectEvent(int)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-2xl opacity-80 decoration-slice group-hover:opacity-100 transition"></div>
                <div className="flex justify-between items-start pl-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-gray-900 font-bold mb-1.5 text-[15px]">
                      <User className="w-[18px] h-[18px] text-brand-500 shrink-0" />
                      <span className="truncate">
                        {int.clienti ? `${int.clienti.cognome} ${int.clienti.nome}` : 'Intervento generico'}
                      </span>
                    </div>
                    {int.note && (
                      <p className="text-sm text-gray-600 mt-2.5 bg-gray-50/80 border border-gray-100 p-2.5 rounded-xl line-clamp-3 leading-relaxed">
                        {int.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <InterventoModal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        initialDate={selectedDate} 
      />
    </div>
  );
};

export default CalendarioPage;
