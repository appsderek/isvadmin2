
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { TrashIcon, XIcon, CloudIcon } from '../components/icons';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface CalendarPageProps {
    canEdit?: boolean;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ canEdit = false }) => {
    const { calendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, forceCloudSync, saveStatus } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, title: string} | null>(null);
    const [isSavingCloud, setIsSavingCloud] = useState(false);
    
    // Drag & Drop State
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
    const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: today.toLocaleDateString('fr-CA'), // YYYY-MM-DD in local time
        endDate: today.toLocaleDateString('fr-CA'),
        description: ''
    });

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = [];
        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.push(null);
        }
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            grid.push(new Date(year, month, day));
        }
        return grid;
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleOpenModal = (date?: Date) => {
        if (!canEdit) return;
        // Use local date string instead of ISO UTC to avoid day shift
        const dateStr = date ? date.toLocaleDateString('fr-CA') : today.toLocaleDateString('fr-CA');
        setNewEvent({
            title: '',
            date: dateStr,
            endDate: dateStr,
            description: ''
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleNewEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewEvent(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newEvent.title && newEvent.date) {
            setIsSavingCloud(true);
            try {
                // Ensure endDate is at least start date
                const finalEndDate = newEvent.endDate < newEvent.date ? newEvent.date : newEvent.endDate;
                addCalendarEvent({ ...newEvent, endDate: finalEndDate });
                
                // Force sync immediately for feedback
                await forceCloudSync();
                
                handleCloseModal();
            } catch (error) {
                console.error("Erro ao salvar:", error);
                alert("Erro ao sincronizar com a nuvem, mas salvo localmente.");
                handleCloseModal();
            } finally {
                setIsSavingCloud(false);
            }
        } else {
            alert('Por favor, preencha o título e a data do evento.');
        }
    };

    const handleManualSync = async () => {
        setIsSavingCloud(true);
        try {
            await forceCloudSync();
        } catch (e) {
            alert('Erro na sincronização manual.');
        } finally {
            setIsSavingCloud(false);
        }
    };

    // --- DRAG AND DROP HANDLERS ---

    const handleDragStart = (e: React.DragEvent, eventId: string, type: 'move' | 'resize') => {
        if (!canEdit) return;
        setDraggedEventId(eventId);
        setDragType(type);
        // Set drag image or allow default. Default is usually fine.
        e.dataTransfer.effectAllowed = 'move';
        
        // If resizing, we might want to stop propagation so we don't drag the whole container
        if (type === 'resize') {
            e.stopPropagation();
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!canEdit) return;
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        if (!canEdit || !draggedEventId || !dragType) return;
        e.preventDefault();

        const event = calendarEvents.find(ev => ev.id === draggedEventId);
        if (!event) return;

        // Use local date string
        const targetDateStr = targetDate.toLocaleDateString('fr-CA');

        if (dragType === 'move') {
            // Calculate duration to shift endDate accordingly
            // Use local date parsing to avoid UTC shifts
            const oldStart = new Date(event.date + 'T00:00:00');
            // Default endDate to start date if missing
            const oldEnd = new Date((event.endDate || event.date) + 'T00:00:00');
            
            // Calculate difference in milliseconds
            const durationMs = oldEnd.getTime() - oldStart.getTime();
            
            // New Start is the drop target
            const newStart = new Date(targetDateStr + 'T00:00:00'); // Force local time
            // New End is New Start + Duration
            const newEnd = new Date(newStart.getTime() + durationMs);
            const newEndStr = newEnd.toLocaleDateString('fr-CA');

            updateCalendarEvent(draggedEventId, {
                date: targetDateStr,
                endDate: newEndStr
            });
        } else if (dragType === 'resize') {
            // Only update End Date
            // Ensure end date is not before start date
            if (targetDateStr < event.date) {
                return; 
            }
            updateCalendarEvent(draggedEventId, {
                endDate: targetDateStr
            });
        }

        setDraggedEventId(null);
        setDragType(null);
    };

    // Helper to check if a date falls within an event's range
    const isDateInEvent = (date: Date, event: any) => {
        // Use local date string to match stored string
        const d = date.toLocaleDateString('fr-CA');
        const start = event.date;
        const end = event.endDate || event.date;
        return d >= start && d <= end;
    };

    const isEventStart = (date: Date, event: any) => {
        return date.toLocaleDateString('fr-CA') === event.date;
    };

    const isEventEnd = (date: Date, event: any) => {
        return date.toLocaleDateString('fr-CA') === (event.endDate || event.date);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold font-display text-white">Calendário Escolar</h1>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleManualSync}
                        disabled={isSavingCloud}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${saveStatus.includes('Erro') ? 'border-red-500 text-red-400 bg-red-900/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                    >
                        <CloudIcon className={`w-4 h-4 ${isSavingCloud ? 'animate-pulse text-yellow-400' : ''}`} />
                        {isSavingCloud ? 'Sincronizando...' : saveStatus}
                    </button>

                    {canEdit && (
                        <button onClick={() => handleOpenModal()} className="bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-500 transition-colors shadow-lg">
                            + Novo Evento
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="text-yellow-400 hover:text-yellow-300 font-bold">&lt; Anterior</button>
                    <h2 className="text-xl font-bold text-white font-display">
                        {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} className="text-yellow-400 hover:text-yellow-300 font-bold">Próximo &gt;</button>
                </div>

                <div className="grid grid-cols-7 gap-px">
                    {daysOfWeek.map(day => (
                        <div key={day} className="text-center font-semibold text-yellow-400 text-sm py-2">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-gray-700 select-none">
                    {calendarGrid.map((date, index) => {
                        const isToday = date?.getTime() === today.getTime();
                        
                        // Find events relevant to this date cell
                        const cellEvents = date ? calendarEvents.filter(event => isDateInEvent(date, event)) : [];

                        return (
                            <div 
                                key={index} 
                                className={`bg-gray-800 p-2 min-h-[120px] relative transition-colors ${date ? (canEdit ? 'hover:bg-gray-750' : '') : 'opacity-50'}`}
                                onDragOver={date ? handleDragOver : undefined}
                                onDrop={date ? (e) => handleDrop(e, date) : undefined}
                                onClick={() => date && canEdit && handleOpenModal(date)} // Optional: click empty space to add
                            >
                                {date && (
                                    <>
                                        <div className={`text-right text-sm font-semibold mb-1 ${isToday ? 'text-yellow-400' : 'text-gray-300'}`}>{date.getDate()}</div>
                                        <div className="space-y-1">
                                            {cellEvents.map(event => {
                                                const isStart = isEventStart(date, event);
                                                const isEnd = isEventEnd(date, event);
                                                
                                                return (
                                                    <div 
                                                        key={event.id} 
                                                        draggable={canEdit}
                                                        onDragStart={(e) => {
                                                            e.stopPropagation(); // Prevent cell drag if any
                                                            handleDragStart(e, event.id, 'move');
                                                        }}
                                                        onClick={(e) => e.stopPropagation()} // Stop propagation to cell click
                                                        className={`
                                                            text-xs p-1 flex justify-between items-center gap-1 group relative
                                                            ${isStart ? 'rounded-l-md ml-0' : '-ml-2'} 
                                                            ${isEnd ? 'rounded-r-md mr-0' : '-mr-2'}
                                                            ${canEdit ? 'cursor-move hover:z-10' : ''}
                                                            bg-yellow-900/60 text-yellow-200 border-y border-yellow-700/50
                                                            ${isStart ? 'border-l pl-2' : ''} ${isEnd ? 'border-r pr-2' : ''}
                                                        `}
                                                        title={`${event.title} (${event.date} - ${event.endDate || event.date})`}
                                                    >
                                                       {isStart && <span className="font-semibold break-words truncate">{event.title}</span>}
                                                       {!isStart && <span className="text-transparent">&nbsp;</span>} {/* Spacer for middle segments */}
                                                       
                                                       {/* Controls (Only show on End or Hover) */}
                                                       {canEdit && (
                                                           <div className={`flex items-center ${isEnd ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                                               {isEnd && (
                                                                   <>
                                                                    <button 
                                                                            onClick={(e) => { e.stopPropagation(); setItemToDelete({id: event.id, title: event.title}); }} 
                                                                            className="text-yellow-300 hover:text-red-400 mr-1 z-20"
                                                                            title="Excluir"
                                                                    >
                                                                            <TrashIcon className="w-3 h-3" />
                                                                    </button>
                                                                    {/* Resize Handle */}
                                                                    <div 
                                                                        draggable
                                                                        onDragStart={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDragStart(e, event.id, 'resize');
                                                                        }}
                                                                        className="w-2 h-4 bg-yellow-500/50 hover:bg-yellow-400 cursor-ew-resize rounded-sm z-20"
                                                                        title="Redimensionar (Arraste para mudar duração)"
                                                                    ></div>
                                                                   </>
                                                               )}
                                                           </div>
                                                       )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {isModalOpen && canEdit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-gray-700">
                         <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                             <XIcon className="w-6 h-6" />
                         </button>
                         <h2 className="text-2xl font-bold font-display text-yellow-400 mb-6 flex items-center gap-2">
                            <CloudIcon className="w-6 h-6" />
                            Novo Evento
                         </h2>
                         <form onSubmit={handleAddEvent} className="space-y-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Título do Evento</label>
                                 <input type="text" name="title" value={newEvent.title} onChange={handleNewEventChange} required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Início</label>
                                    <input type="date" name="date" value={newEvent.date} onChange={handleNewEventChange} required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Fim</label>
                                    <input type="date" name="endDate" value={newEvent.endDate} onChange={handleNewEventChange} required className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" />
                                </div>
                             </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Descrição (Opcional)</label>
                                 <textarea name="description" value={newEvent.description} onChange={handleNewEventChange} rows={3} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500" />
                             </div>
                             <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                                <button type="button" onClick={handleCloseModal} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors">Cancelar</button>
                                <button 
                                    type="submit" 
                                    disabled={isSavingCloud}
                                    className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-500 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingCloud ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar na Nuvem'
                                    )}
                                </button>
                            </div>
                         </form>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => itemToDelete && deleteCalendarEvent(itemToDelete.id)}
                title="Excluir Evento"
                message={`Tem certeza que deseja excluir o evento "${itemToDelete?.title}"?`}
            />
        </div>
    );
};

export default CalendarPage;
