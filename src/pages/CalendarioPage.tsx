import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, startOfToday, isSameDay, parseISO, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, addMonths, subMonths, isSameMonth
} from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Plus, Calendar as CalendarIcon, User, CheckCircle2, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import InterventoModal from '../components/InterventoModal';
import InterventoDetailModal from '../components/InterventoDetailModal';

const CalendarioPage: React.FC = () => {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  
  const [interventi, setInterventi] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInterventoId, setSelectedInterventoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterventi();
  }, [currentMonth]); // Re-fetch or fetch widely enough? For simplicity, we just fetch all or filter later. We'll fetch all.

  const fetchInterventi = async () => {
    setLoading(true);
    // Potentially filter by month range in production, but let's fetch widely used fields.
    const { data, error } = await supabase
      .from('interventi')
      .select('id, data, note, clienti(nome, cognome, id)');

    if (!error && data) {
      setInterventi(data);
    }
    setLoading(false);
  };

  const handleSelectEvent = (intervento: any) => {
    setSelectedInterventoId(intervento.id);
  };

  const onModalClose = (wasSaved: boolean) => {
    setIsModalOpen(false);
    if (wasSaved) {
      fetchInterventi();
    }
  };

  // Calendar Grid Computations
  const monthDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
    const endDate = endOfWeek(lastDay, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const selectedDayEvents = useMemo(() => {
    return interventi.filter((int) => {
      if (!int.data) return false;
      const intDate = typeof int.data === 'string' ? parseISO(int.data) : new Date(int.data);
      return isSameDay(intDate, selectedDate);
    });
  }, [interventi, selectedDate]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header with Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Calendario</h1>
          <p className="text-gray-500 font-medium mt-1">Gestisci i tuoi interventi programmati</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Month Navigation Control */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
               <ChevronLeft className="w-5 h-5"/>
            </button>
            <span className="px-4 font-bold text-gray-700 capitalize min-w-[150px] text-center whitespace-nowrap">
               {format(currentMonth, 'MMMM yyyy', { locale: itLocale })}
            </span>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
               <ChevronRight className="w-5 h-5"/>
            </button>
            <button 
              onClick={() => {
                setCurrentMonth(startOfMonth(today));
                setSelectedDate(today);
              }}
              className="ml-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-md transition"
            >
              Oggi
            </button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center bg-brand-600 text-white w-12 h-12 md:w-auto md:px-5 md:h-[46px] rounded-full md:rounded-xl hover:bg-brand-700 transition shadow-md shadow-brand-500/20"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline md:ml-2 font-bold tracking-wide">Nuovo</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Split Pane */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-[600px] lg:min-h-0 gap-6 w-full">
        
        {/* Left Pane: Full Month Grid (Expands to fill) */}
        <div className="lg:w-2/3 xl:flex-1 flex flex-col bg-white rounded-3xl shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden shrink-0 lg:shrink">
          
          {/* Days Layout Header */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80 shrink-0">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
              <div key={day} className="py-3.5 text-center text-[11px] font-black text-gray-500 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          
          {/* Grid Cells: Auto-sizing */}
          <div className="grid grid-cols-7 flex-1 min-h-[400px] lg:min-h-0 border-l border-gray-100">
            {monthDays.map((date, idx) => {
               const isSelected = isSameDay(date, selectedDate);
               const isTodayDate = isSameDay(date, today);
               const isCurrentMonth = isSameMonth(date, currentMonth);
               
               const dayInts = interventi.filter(int => {
                 if (!int.data) return false;
                 const intDate = typeof int.data === 'string' ? parseISO(int.data) : new Date(int.data);
                 return isSameDay(intDate, date);
               });
               
               return (
                 <button 
                    key={date.toISOString()}
                    onClick={() => { 
                      setSelectedDate(date); 
                      if (!isCurrentMonth) setCurrentMonth(startOfMonth(date)); 
                    }}
                    className={`relative flex flex-col p-1.5 sm:p-2 border-r border-b border-gray-100 transition duration-200 outline-none
                      ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-brand-50/30'} 
                      ${isSelected ? 'ring-2 ring-brand-500 ring-inset bg-brand-50/50 z-10' : ''}`}
                 >
                   {/* Date Number Badge */}
                   <div className={`w-7 h-7 sm:w-8 sm:h-8 flex flex-shrink-0 items-center justify-center rounded-full text-sm font-bold mb-1.5 transition-colors
                     ${isTodayDate 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' 
                        : isSelected 
                        ? 'bg-brand-100 text-brand-800' 
                        : isCurrentMonth 
                        ? 'text-gray-900 hover:bg-gray-100' 
                        : 'text-gray-400'}`}>
                     {format(date, 'd')}
                   </div>
                   
                   {/* Event Previews (Desktop) or Dots (Mobile) */}
                   <div className="flex-1 w-full flex flex-col gap-1 sm:gap-1.5 overflow-hidden">
                     {/* Mobile Dots */}
                     <div className="flex sm:hidden flex-wrap md:hidden gap-1 items-center justify-center w-full px-1">
                       {dayInts.slice(0, 3).map((_, i) => (
                         <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                       ))}
                       {dayInts.length > 3 && <div className="w-1 h-1 rounded-full bg-gray-400"></div>}
                     </div>

                     {/* Desktop Pills */}
                     <div className="hidden sm:flex flex-col gap-1 w-full">
                       {dayInts.slice(0, 3).map(i => (
                          <div 
                            key={i.id} 
                            className={`text-left w-full truncate text-[11px] leading-tight px-2 py-1 rounded-md font-semibold transition-colors
                              ${isSelected ? 'bg-brand-500 text-white shadow-sm' : 'bg-brand-50 text-brand-700 border border-brand-100/50'}`}
                          >
                            {i.clienti ? i.clienti.cognome : 'Int. Generico'}
                          </div>
                       ))}
                       {dayInts.length > 3 && (
                          <div className="text-[10px] text-gray-500 font-bold pl-1 pt-0.5">+{dayInts.length - 3} altri</div>
                       )}
                     </div>
                   </div>
                 </button>
               )
            })}
          </div>
        </div>
        
        {/* Right Pane: Day Details Sidebar */}
        <div className="lg:w-[320px] xl:w-[380px] flex flex-col flex-1 lg:flex-none bg-white rounded-3xl shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden shrink-0">
           {/* Sidebar Header */}
           <div className="p-6 border-b border-gray-100 bg-white shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-brand-50 rounded-full blur-2xl opacity-70"></div>
              <div className="relative z-10 flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center shadow-inner shrink-0">
                   <Clock className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 capitalize tracking-tight leading-tight">
                    {format(selectedDate, 'EEEE', { locale: itLocale })}
                  </h2>
                  <p className="text-sm font-semibold text-brand-600 capitalize">
                    {format(selectedDate, 'd MMMM yyyy', { locale: itLocale })}
                  </p>
                </div>
              </div>
           </div>

           {/* Events List */}
           <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 custom-scrollbar">
             {loading ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-3"></div>
                  <p className="text-sm font-medium text-gray-500 animate-pulse">Caricamento...</p>
                </div>
             ) : selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 bg-white rounded-2xl border border-dashed border-gray-200">
                  <div className="bg-gray-50 w-14 h-14 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <p className="text-gray-800 font-bold mb-1.5">Giornata Libera</p>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Nessun intervento pianificato per questa data.
                  </p>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Pianifica Ora
                  </button>
                </div>
             ) : (
                <div className="space-y-3 pb-6">
                  {selectedDayEvents.map(int => (
                    <div 
                      key={int.id}
                      onClick={() => handleSelectEvent(int)}
                      className="group flex flex-col bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-300 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-500 rounded-l-2xl group-hover:bg-brand-600 transition-colors"></div>
                      <div className="pl-2">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                          <h3 className="font-bold text-gray-900 text-[15px] leading-tight">
                            {int.clienti ? `${int.clienti.cognome} ${int.clienti.nome}` : 'Intervento Generico'}
                          </h3>
                        </div>
                        {int.note && (
                          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 leading-relaxed group-hover:bg-brand-50/30 transition-colors line-clamp-3">
                            {int.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
             )}
           </div>
        </div>
      </div>

      <InterventoModal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        initialDate={selectedDate} 
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

export default CalendarioPage;
