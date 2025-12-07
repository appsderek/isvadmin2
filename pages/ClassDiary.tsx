
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { SchoolClass } from '../types';
import { ArrowLeftIcon } from '../components/icons';
import GradeEntryPage from './GradeEntryPage';

interface ClassDiaryProps {
    schoolClass: SchoolClass;
    onBack: () => void;
}

const NON_GRADED_CLASSES = [
    'CRECHE III', 
    'CRECHE IV', 
    'PRÉ I MANHÃ', 
    'PRÉ I TARDE', 
    'PRÉ II MANHÃ', 
    'PRÉ II TARDE'
];

type DiaryTab = 'attendance' | 'grades';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const ClassDiary: React.FC<ClassDiaryProps> = ({ schoolClass, onBack }) => {
    const { students, attendance, saveAttendance } = useData();
    const [activeTab, setActiveTab] = useState<DiaryTab>('attendance');
    
    // Attendance State
    const [attendanceDate, setAttendanceDate] = useState(getTodayDateString());
    const [attendanceRecords, setAttendanceRecords] = useState<Map<string, boolean>>(new Map());

    const classStudents = students.filter(s => schoolClass.studentIds.includes(s.id));
    const isGraded = !NON_GRADED_CLASSES.includes(schoolClass.name.toUpperCase());

    useEffect(() => {
        const todaysAttendance = new Map<string, boolean>();
        classStudents.forEach(student => {
            const record = attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
            todaysAttendance.set(student.id, record ? record.present : true);
        });
        setAttendanceRecords(todaysAttendance);
    }, [attendanceDate, attendance, classStudents]);

    const handleAttendanceChange = (studentId: string, present: boolean) => {
        setAttendanceRecords(prev => new Map(prev).set(studentId, present));
    };
    
    const handleSaveAttendance = () => {
        const recordsToSave = Array.from(attendanceRecords.entries()).map(([studentId, present]) => ({ studentId, present }));
        saveAttendance(schoolClass.id, attendanceDate, recordsToSave);
        alert('Frequência salva com sucesso!');
    };


    return (
        <div>
            <button onClick={onBack} className="flex items-center gap-2 text-yellow-400 font-semibold hover:text-yellow-500 mb-4">
                <ArrowLeftIcon className="w-5 h-5" />
                Voltar para Minhas Turmas
            </button>
            <h1 className="text-3xl font-bold font-display text-white mb-2">Diário de Classe: <span className="text-yellow-400">{schoolClass.name}</span></h1>

            <div className="mb-6 border-b border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('attendance')} className={`${activeTab === 'attendance' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Frequência</button>
                    {isGraded && (
                        <button onClick={() => setActiveTab('grades')} className={`${activeTab === 'grades' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Notas (Lote)</button>
                    )}
                </nav>
            </div>
            
            {activeTab === 'attendance' && (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <label htmlFor="attendanceDate" className="text-white font-semibold">Data:</label>
                        <input id="attendanceDate" type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                    </div>
                    <div className="space-y-3">
                        {classStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                <span className="text-white">{student.name}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleAttendanceChange(student.id, true)} className={`px-4 py-1 rounded-full text-sm font-semibold ${attendanceRecords.get(student.id) ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}>Presente</button>
                                    <button onClick={() => handleAttendanceChange(student.id, false)} className={`px-4 py-1 rounded-full text-sm font-semibold ${!attendanceRecords.get(student.id) ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'}`}>Faltou</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSaveAttendance} className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-500 transition-colors">Salvar Frequência</button>
                    </div>
                </div>
            )}

            {activeTab === 'grades' && isGraded && (
                 <GradeEntryPage classId={schoolClass.id} embedded={true} />
            )}

        </div>
    );
};

export default ClassDiary;
