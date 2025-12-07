
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Role, User } from '../types';
import { CheckCircleIcon, XCircleIcon, ClipboardListIcon, CalendarIcon, CoinIcon, SparklesIcon, FireIcon } from '../components/icons';

interface AttendancePageProps {
    user?: User; // Optional user to filter classes (e.g. for Teachers)
}

// Brazilian National Holidays 2025 (YYYY-MM-DD)
const HOLIDAYS_2025 = [
    '2025-01-01', // Confraternização Universal
    '2025-03-03', // Carnaval
    '2025-03-04', // Carnaval
    '2025-04-18', // Paixão de Cristo
    '2025-04-21', // Tiradentes
    '2025-05-01', // Dia do Trabalho
    '2025-06-19', // Corpus Christi
    '2025-09-07', // Independência do Brasil
    '2025-10-12', // Nossa Senhora Aparecida
    '2025-11-02', // Finados
    '2025-11-15', // Proclamação da República
    '2025-11-20', // Dia Nacional de Zumbi e da Consciência Negra
    '2025-12-25', // Natal
];

const FAVOCOIN_ACTIONS = [
    // CRITÉRIOS DE GANHOS
    { label: 'Realizar Tarefa de Casa', amount: 10, icon: '🏠', type: 'EARN' },
    { label: 'Bom Comportamento', amount: 10, icon: '😇', type: 'EARN' },
    { label: 'Realizar Tarefa em Aula', amount: 10, icon: '📚', type: 'EARN' },
    { label: 'Contribuição/Ideias', amount: 20, icon: '💡', type: 'EARN' },
    { label: 'Participar de Eventos', amount: 30, icon: '🎉', type: 'EARN' },
    { label: 'Ajudar Colega', amount: 10, icon: '🤝', type: 'EARN' },
    
    // CRITÉRIOS DE PERDA
    { label: 'Não Fez Tarefa de Casa', amount: -10, icon: '🏚️', type: 'PENALTY' },
    { label: 'Mau Comportamento', amount: -20, icon: '👿', type: 'PENALTY' },
    { label: 'Não Fez Tarefa em Aula', amount: -10, icon: '💤', type: 'PENALTY' },
    { label: 'Falta Injustificada', amount: -10, icon: '❌', type: 'PENALTY' },
    { label: 'Desrespeitar Colega', amount: -20, icon: '🚫', type: 'PENALTY' },
    { label: 'Não Participar Eventos', amount: -20, icon: '👻', type: 'PENALTY' },
    { label: 'Desrespeitar Funcionário', amount: -50, icon: '🤬', type: 'PENALTY' },
];

const AttendancePage: React.FC<AttendancePageProps> = ({ user }) => {
    const { classes, students, attendance, saveAttendance, addFavocoinTransaction, getStudentFavocoinBalance } = useData();

    // Mode State
    const [mode, setMode] = useState<'daily' | 'batch'>('daily');

    // General State
    const [selectedClassId, setSelectedClassId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Daily Mode State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceMap, setAttendanceMap] = useState<Map<string, boolean>>(new Map());

    // Favocoin Panel State
    const [selectedStudentForCoins, setSelectedStudentForCoins] = useState<string | null>(null);

    // Batch Mode State
    const [batchStartDate, setBatchStartDate] = useState('');
    const [batchEndDate, setBatchEndDate] = useState('');
    const [batchDefaultPresence, setBatchDefaultPresence] = useState(true); // true = Present, false = Absent
    const [batchStudentSelection, setBatchStudentSelection] = useState<string[]>([]); // Ids of students to apply

    // Filter classes based on user role (Teacher sees only their classes, Admin sees all)
    const availableClasses = useMemo(() => {
        if (!user || user.role === Role.Admin) {
            return classes;
        }
        if (user.role === Role.Teacher) {
            return classes.filter(c => c.teacherIds.includes(user.id));
        }
        return [];
    }, [classes, user]);

    // Check if current class is eligible for Favocoin (1st to 5th grade)
    const isFavocoinEligible = useMemo(() => {
        const cls = classes.find(c => c.id === selectedClassId);
        if (!cls) return false;
        const name = cls.name.toUpperCase();
        return name.includes('1º') || name.includes('2º') || name.includes('3º') || name.includes('4º') || name.includes('5º');
    }, [selectedClassId, classes]);

    // Select the first class by default if none selected
    useEffect(() => {
        if (!selectedClassId && availableClasses.length > 0) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    // --- DAILY LOGIC ---

    // Load attendance data when Class or Date changes (Daily Mode)
    useEffect(() => {
        if (!selectedClassId || mode !== 'daily') return;

        const schoolClass = classes.find(c => c.id === selectedClassId);
        if (!schoolClass) return;

        const classStudents = students.filter(s => schoolClass.studentIds.includes(s.id));
        const newMap = new Map<string, boolean>();

        classStudents.forEach(student => {
            const record = attendance.find(a => a.studentId === student.id && a.date === date);
            // Default to TRUE (Present) if no record exists
            newMap.set(student.id, record ? record.present : true);
        });

        setAttendanceMap(newMap);
    }, [selectedClassId, date, attendance, classes, students, mode]);

    const handleToggle = (studentId: string) => {
        setAttendanceMap(prev => {
            const newMap = new Map(prev);
            newMap.set(studentId, !prev.get(studentId));
            return newMap;
        });
    };

    const handleSaveDaily = () => {
        if (!selectedClassId) return;

        setIsSaving(true);
        const recordsToSave = Array.from(attendanceMap.entries()).map(([studentId, present]) => ({
            studentId,
            present
        }));

        saveAttendance(selectedClassId, date, recordsToSave);
        
        setTimeout(() => {
            setIsSaving(false);
            alert(isFavocoinEligible 
                ? 'Chamada salva! Favocoins de presença atualizados.' 
                : 'Chamada diária salva com sucesso!');
        }, 500);
    };

    const markAllDaily = (present: boolean) => {
        setAttendanceMap(prev => {
            const newMap = new Map(prev);
            for (const key of newMap.keys()) {
                newMap.set(key, present);
            }
            return newMap;
        });
    };

    const handleApplyFavocoinRule = (action: typeof FAVOCOIN_ACTIONS[0]) => {
        if (!selectedStudentForCoins) return;
        addFavocoinTransaction(
            selectedStudentForCoins, 
            action.amount, 
            action.label, 
            action.type as any
        );
        setSelectedStudentForCoins(null); // Close modal
    };

    // Stats for the current selection
    const dailyStats = useMemo(() => {
        let present = 0;
        let absent = 0;
        attendanceMap.forEach(v => v ? present++ : absent++);
        return { present, absent, total: present + absent };
    }, [attendanceMap]);

    // --- BATCH LOGIC ---

    // Initialize all students selected when class changes in batch mode
    useEffect(() => {
        if (selectedClassId && mode === 'batch') {
            const cls = classes.find(c => c.id === selectedClassId);
            if (cls) {
                setBatchStudentSelection(cls.studentIds);
            }
        }
    }, [selectedClassId, mode, classes]);

    const validBatchDates = useMemo(() => {
        if (!batchStartDate || !batchEndDate) return [];
        
        const start = new Date(batchStartDate + 'T00:00:00');
        const end = new Date(batchEndDate + 'T00:00:00');
        const validDates: string[] = [];

        // Safety check to prevent infinite loops or massive ranges
        if (start > end) return [];

        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
            const isoDate = current.toISOString().split('T')[0];

            // Exclude Weekends (0 and 6) and Holidays
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS_2025.includes(isoDate)) {
                validDates.push(isoDate);
            }

            // Next day
            current.setDate(current.getDate() + 1);
        }
        return validDates;
    }, [batchStartDate, batchEndDate]);

    const handleToggleBatchStudent = (studentId: string) => {
        setBatchStudentSelection(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const toggleAllBatchStudents = () => {
        const cls = classes.find(c => c.id === selectedClassId);
        if (!cls) return;
        
        if (batchStudentSelection.length === cls.studentIds.length) {
            setBatchStudentSelection([]);
        } else {
            setBatchStudentSelection(cls.studentIds);
        }
    };

    const handleSaveBatch = () => {
        if (!selectedClassId || validBatchDates.length === 0 || batchStudentSelection.length === 0) {
            alert("Verifique os dados: Selecione uma turma, um período válido e pelo menos um aluno.");
            return;
        }

        setIsSaving(true);

        // Iterate over all calculated valid dates
        validBatchDates.forEach(validDate => {
            // For this date, create records for ALL selected students
            const recordsToSave = batchStudentSelection.map(studentId => ({
                studentId,
                present: batchDefaultPresence
            }));

            // Note: In a real backend, this would likely be a single bulk API call.
            // Here we simulate by calling the context method multiple times.
            saveAttendance(selectedClassId, validDate, recordsToSave);
        });

        setTimeout(() => {
            setIsSaving(false);
            alert(`Lançamento em lote concluído! ${validBatchDates.length} dias letivos registrados para ${batchStudentSelection.length} alunos.`);
            // Reset dates to prevent accidental double submission
            setBatchStartDate('');
            setBatchEndDate('');
        }, 1000);
    };

    // --- RENDER ---

    if (availableClasses.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-800 rounded-2xl border border-gray-700">
                <ClipboardListIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white">Nenhuma turma disponível</h2>
                <p className="text-gray-400">Você não possui turmas vinculadas para realizar a chamada.</p>
            </div>
        );
    }

    const currentClassObj = classes.find(c => c.id === selectedClassId);

    return (
        <div className="animate-fade-in max-w-6xl mx-auto pb-10 flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-lg">
                            <ClipboardListIcon className="w-8 h-8 text-black" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold font-display text-white">Controle de Frequência</h1>
                            <p className="text-gray-400">Gerencie a presença {isFavocoinEligible && 'e as Favocoins'} dos alunos.</p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="bg-gray-800 p-1 rounded-xl flex shadow-lg border border-gray-700">
                        <button
                            onClick={() => setMode('daily')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                mode === 'daily' 
                                ? 'bg-yellow-400 text-black shadow-md' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Chamada Diária
                        </button>
                        <button
                            onClick={() => setMode('batch')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                mode === 'batch' 
                                ? 'bg-yellow-400 text-black shadow-md' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Lançamento em Lote
                        </button>
                    </div>
                </div>

                {/* CLASS SELECTOR (Common) */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Selecione a Turma</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full md:w-1/3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-yellow-500 focus:border-yellow-500 text-lg shadow-md"
                    >
                        {availableClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* === DAILY MODE VIEW === */}
                {mode === 'daily' && (
                    <>
                        <div className="glass-panel p-6 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Data da Chamada</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-yellow-500 focus:border-yellow-500 text-lg"
                                />
                            </div>
                            <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-xl border border-gray-600 h-[54px]">
                                <div className="text-center px-4">
                                    <span className="block text-xs text-gray-400 uppercase font-bold">Total</span>
                                    <span className="text-xl font-bold text-white">{dailyStats.total}</span>
                                </div>
                                <div className="text-center px-4 border-l border-gray-600">
                                    <span className="block text-xs text-green-400 uppercase font-bold">Presentes</span>
                                    <span className="text-xl font-bold text-green-400">{dailyStats.present}</span>
                                </div>
                                <div className="text-center px-4 border-l border-gray-600">
                                    <span className="block text-xs text-red-400 uppercase font-bold">Ausentes</span>
                                    <span className="text-xl font-bold text-red-400">{dailyStats.absent}</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                            <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-white pl-2">Lista de Alunos</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => markAllDaily(true)} className="px-3 py-1 bg-green-900/40 text-green-400 border border-green-600/50 rounded-lg text-xs font-bold hover:bg-green-900/60 transition-colors">
                                        Todos Presentes
                                    </button>
                                    <button onClick={() => markAllDaily(false)} className="px-3 py-1 bg-red-900/40 text-red-400 border border-red-600/50 rounded-lg text-xs font-bold hover:bg-red-900/60 transition-colors">
                                        Todos Ausentes
                                    </button>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {Array.from(attendanceMap.entries()).map(([studentId, isPresent]) => {
                                    const student = students.find(s => s.id === studentId);
                                    if (!student) return null;
                                    const balance = getStudentFavocoinBalance(studentId);

                                    return (
                                        <div key={studentId} className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${!isPresent ? 'bg-red-900/10' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isPresent ? 'bg-gray-700 text-gray-300' : 'bg-red-900 text-red-200'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className={`font-medium text-lg ${isPresent ? 'text-white' : 'text-red-300'}`}>{student.name}</p>
                                                    {isFavocoinEligible && (
                                                        <p className="text-xs text-yellow-400 flex items-center gap-1 font-bold">
                                                            <CoinIcon className="w-3 h-3" />
                                                            {balance} Favocoins
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {isFavocoinEligible && (
                                                    <button 
                                                        onClick={() => setSelectedStudentForCoins(studentId)}
                                                        className="text-gray-400 hover:text-yellow-400 p-2 rounded-lg hover:bg-yellow-400/10 transition-colors"
                                                        title="Aplicar Multa ou Bônus (Favocoins)"
                                                    >
                                                        <SparklesIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleToggle(studentId)}
                                                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg ${
                                                        isPresent 
                                                        ? 'bg-green-600 text-white hover:bg-green-500' 
                                                        : 'bg-red-600 text-white hover:bg-red-500'
                                                    }`}
                                                >
                                                    {isPresent ? (
                                                        <>
                                                            <CheckCircleIcon className="w-5 h-5" />
                                                            <span>Presente</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircleIcon className="w-5 h-5" />
                                                            <span>Ausente</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {attendanceMap.size === 0 && (
                                    <div className="p-8 text-center text-gray-500">
                                        Nenhum aluno encontrado nesta turma.
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end">
                                <button
                                    onClick={handleSaveDaily}
                                    disabled={isSaving || attendanceMap.size === 0}
                                    className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Chamada Diária'}
                                    <CheckCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* === BATCH MODE VIEW === */}
                {mode === 'batch' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Configuration Panel */}
                            <div className="space-y-6">
                                <div className="glass-panel p-6 rounded-2xl">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                                        <CalendarIcon className="w-5 h-5 text-yellow-400" />
                                        1. Defina o Período
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Início</label>
                                            <input
                                                type="date"
                                                value={batchStartDate}
                                                onChange={(e) => setBatchStartDate(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Fim</label>
                                            <input
                                                type="date"
                                                value={batchEndDate}
                                                onChange={(e) => setBatchEndDate(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-yellow-500 focus:border-yellow-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg flex items-start gap-3">
                                        <div className="p-1 bg-blue-500 rounded-full mt-0.5">
                                            <CheckCircleIcon className="w-3 h-3 text-white" />
                                        </div>
                                        <p className="text-xs text-blue-200">
                                            O sistema excluirá automaticamente <strong>Sábados</strong>, <strong>Domingos</strong> e <strong>Feriados Nacionais de 2025</strong> do lançamento.
                                        </p>
                                    </div>
                                </div>

                                <div className="glass-panel p-6 rounded-2xl">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                                        <CheckCircleIcon className="w-5 h-5 text-yellow-400" />
                                        2. Status a Aplicar
                                    </h3>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setBatchDefaultPresence(true)}
                                            className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${batchDefaultPresence ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600'}`}
                                        >
                                            PRESENTE
                                        </button>
                                        <button 
                                            onClick={() => setBatchDefaultPresence(false)}
                                            className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${!batchDefaultPresence ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600'}`}
                                        >
                                            AUSENTE (FALTA)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Selection and Preview */}
                            <div className="space-y-6">
                                 <div className="glass-panel p-6 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                        <h3 className="text-white font-bold flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center text-xs font-bold">3</div>
                                            Alunos Afetados
                                        </h3>
                                        <button onClick={toggleAllBatchStudents} className="text-xs font-bold text-yellow-400 hover:text-yellow-300">
                                            {batchStudentSelection.length === (currentClassObj?.studentIds.length || 0) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {currentClassObj && currentClassObj.studentIds.map(sid => {
                                            const s = students.find(stu => stu.id === sid);
                                            if (!s) return null;
                                            return (
                                                <label key={sid} className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors border ${batchStudentSelection.includes(sid) ? 'bg-yellow-400/10 border-yellow-400/50' : 'bg-gray-800 border-transparent hover:bg-gray-750'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={batchStudentSelection.includes(sid)}
                                                        onChange={() => handleToggleBatchStudent(sid)}
                                                        className="rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-500"
                                                    />
                                                    <span className={`text-sm ${batchStudentSelection.includes(sid) ? 'text-white font-medium' : 'text-gray-400'}`}>{s.name}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="glass-panel p-6 rounded-2xl">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Dias Letivos:</span>
                                        <span className="text-white font-bold">{validBatchDates.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Alunos:</span>
                                        <span className="text-white font-bold">{batchStudentSelection.length}</span>
                                    </div>
                                    <div className="border-t border-gray-600 my-2"></div>
                                    <div className="flex justify-between text-sm mb-4">
                                        <span className="text-gray-400">Total Registros:</span>
                                        <span className="text-yellow-400 font-bold text-lg">{validBatchDates.length * batchStudentSelection.length}</span>
                                    </div>

                                    <button
                                        onClick={handleSaveBatch}
                                        disabled={isSaving || validBatchDates.length === 0 || batchStudentSelection.length === 0}
                                        className="w-full bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? 'Processando...' : 'Confirmar Lançamento'}
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* FAVOCOIN RULES MODAL - FIXED POSITION RIGHT */}
            {isFavocoinEligible && selectedStudentForCoins && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm lg:relative lg:bg-transparent lg:w-96 lg:inset-auto lg:backdrop-blur-none lg:flex-none">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 lg:m-0 lg:sticky lg:top-4 h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                                <CoinIcon className="w-6 h-6" />
                                Ações Favocoin
                            </h3>
                            <button onClick={() => setSelectedStudentForCoins(null)} className="text-gray-400 hover:text-white lg:hidden">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4">Aplicar para: <span className="text-white font-bold">{students.find(s => s.id === selectedStudentForCoins)?.name}</span></p>

                        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
                            <h4 className="text-green-400 text-xs font-bold uppercase mb-2">Ganhos (Crédito)</h4>
                            {FAVOCOIN_ACTIONS.filter(a => a.type === 'EARN').map((action, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleApplyFavocoinRule(action)}
                                    className="w-full flex justify-between items-center p-3 bg-gray-700/50 hover:bg-green-900/30 border border-transparent hover:border-green-500/50 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{action.icon}</span>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white">{action.label}</span>
                                    </div>
                                    <span className="text-green-400 font-bold">+{action.amount}</span>
                                </button>
                            ))}

                            <h4 className="text-red-400 text-xs font-bold uppercase mt-4 mb-2">Perdas (Débito)</h4>
                            {FAVOCOIN_ACTIONS.filter(a => a.type === 'PENALTY').map((action, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleApplyFavocoinRule(action)}
                                    className="w-full flex justify-between items-center p-3 bg-gray-700/50 hover:bg-red-900/30 border border-transparent hover:border-red-500/50 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{action.icon}</span>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white">{action.label}</span>
                                    </div>
                                    <span className="text-red-400 font-bold">{action.amount}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
