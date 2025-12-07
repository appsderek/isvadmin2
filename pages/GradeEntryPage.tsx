
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { CloudIcon } from '../components/icons';
import { Grade } from '../types';

// Constants to map Bimestre to a fixed date for storage consistency
// We use 2025 as the base year as requested
const BIMESTRE_DATES: Record<string, string> = {
    '1': '2025-04-30', // End of 1st Quarter
    '2': '2025-07-31', // End of 2nd Quarter
    '3': '2025-09-30', // End of 3rd Quarter
    '4': '2025-12-20', // End of 4th Quarter
};

const NON_GRADED_CLASSES = [
    'CRECHE III', 
    'CRECHE IV', 
    'PRÉ I MANHÃ', 
    'PRÉ I TARDE', 
    'PRÉ II MANHÃ', 
    'PRÉ II TARDE'
];

// Specific order requested for grade entry
const SUBJECT_SORT_ORDER = [
    'Ciências',
    'Geografia',
    'História',
    'Português',
    'Matemática'
];

interface GradeEntryPageProps {
    teacherId?: string;
    classId?: string; // Pre-selected class ID for embedded mode
    embedded?: boolean; // Controls UI elements like headers
}

const GradeEntryPage: React.FC<GradeEntryPageProps> = ({ teacherId, classId, embedded = false }) => {
    const { classes, subjects, students, grades, saveGrades, saveStatus, importGrades } = useData();

    // Selectors State
    // If classId prop is provided, we use it as the initial and fixed value
    const [selectedClassId, setSelectedClassId] = useState(classId || '');
    const [selectedBimestre, setSelectedBimestre] = useState('1');
    
    // Matrix State: studentId -> subjectId -> value (STRING to allow formatting control)
    const [gradeMatrix, setGradeMatrix] = useState<Record<string, Record<string, string>>>({});
    const [originalMatrix, setOriginalMatrix] = useState<Record<string, Record<string, string>>>({});
    
    // Error State: Set of "studentId-subjectId" strings
    const [errors, setErrors] = useState<Set<string>>(new Set());

    // Import State
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update selected class if prop changes
    useEffect(() => {
        if (classId) setSelectedClassId(classId);
    }, [classId]);

    // Filter classes if teacherId is present (only used for dropdown if not embedded)
    const availableClasses = useMemo(() => {
        let filtered = classes;
        if (teacherId) {
            filtered = classes.filter(c => c.teacherIds.includes(teacherId));
        }
        // Exclude Non-Graded Classes
        return filtered.filter(c => !NON_GRADED_CLASSES.includes(c.name.toUpperCase()));
    }, [classes, teacherId]);
    
    // Derived Data
    // Note: If embedded, we might need to find from ALL classes if teacherId isn't passed, but classId is known.
    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
    
    const classSubjects = useMemo(() => {
        if (!selectedClass) return [];
        const filtered = subjects.filter(s => selectedClass.subjectIds.includes(s.id));
        
        // Sort subjects based on the predefined list, others fall back to alphabetical
        return filtered.sort((a, b) => {
            const indexA = SUBJECT_SORT_ORDER.indexOf(a.name);
            const indexB = SUBJECT_SORT_ORDER.indexOf(b.name);

            // Both are in the priority list
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            
            // Only A is in the priority list (A comes first)
            if (indexA !== -1) return -1;
            
            // Only B is in the priority list (B comes first)
            if (indexB !== -1) return 1;

            // Neither is in the priority list, sort alphabetically
            return a.name.localeCompare(b.name);
        });
    }, [selectedClass, subjects]);

    const classStudents = useMemo(() => {
        if (!selectedClass) return [];
        const filtered = students.filter(s => selectedClass.studentIds.includes(s.id));
        // Sort students alphabetically
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedClass, students]);

    // Load existing grades into Matrix
    useEffect(() => {
        if (!selectedClass) return;

        const targetDate = BIMESTRE_DATES[selectedBimestre];
        const newMatrix: Record<string, Record<string, string>> = {};
        const newErrors = new Set<string>();

        classStudents.forEach(student => {
            newMatrix[student.id] = {};
            classSubjects.forEach(subject => {
                // Find existing grade for this Student + Subject + Bimestre (Date)
                const existingGrade = grades.find(g => 
                    g.studentId === student.id && 
                    g.subjectId === subject.id && 
                    (g.date === targetDate || g.date.split('T')[0] === targetDate)
                );
                // Store as string formatted to 1 decimal place if exists
                newMatrix[student.id][subject.id] = existingGrade !== undefined ? existingGrade.grade.toFixed(1) : '';
            });
        });

        setGradeMatrix(newMatrix);
        setOriginalMatrix(JSON.parse(JSON.stringify(newMatrix))); // Deep copy for dirty checking
        setErrors(newErrors); // Reset errors on load
    }, [selectedClass, selectedBimestre, grades, classStudents, classSubjects]);


    const handleGradeChange = (studentId: string, subjectId: string, value: string) => {
        const key = `${studentId}-${subjectId}`;
        const numericValue = parseFloat(value);
        
        // Update Matrix State
        setGradeMatrix(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [subjectId]: value
            }
        }));

        // Real-time Validation
        if (value !== '') {
            if (isNaN(numericValue) || numericValue < 0 || numericValue > 10) {
                setErrors(prev => new Set(prev).add(key));
            } else {
                setErrors(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }
        } else {
            // Empty is valid (clearing a grade)
            setErrors(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const handleBlur = (studentId: string, subjectId: string) => {
        const val = gradeMatrix[studentId]?.[subjectId];
        const key = `${studentId}-${subjectId}`;
        
        // Do not auto-format if there is an error or empty
        if (!val || errors.has(key)) return;

        const num = parseFloat(val);
        if (!isNaN(num)) {
            // Auto-format to 1 decimal place (e.g., "7" -> "7.0")
            setGradeMatrix(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    [subjectId]: num.toFixed(1)
                }
            }));
        }
    };

    const handleSave = () => {
        if (!selectedClassId) {
            alert('Por favor, selecione uma Turma.');
            return;
        }

        if (errors.size > 0) {
            alert('Existem notas inválidas (fora de 0 a 10). Por favor, corrija os campos em vermelho antes de salvar.');
            return;
        }

        const targetDate = BIMESTRE_DATES[selectedBimestre];

        // We need to save per subject, as the context function is designed per subject/date batch
        let totalSaved = 0;

        classSubjects.forEach(subject => {
            const recordsToSave: { studentId: string, grade: number }[] = [];
            
            classStudents.forEach(student => {
                const gradeStr = gradeMatrix[student.id]?.[subject.id];
                if (gradeStr !== '' && gradeStr !== undefined) {
                    const gradeNum = parseFloat(gradeStr);
                    if (!isNaN(gradeNum)) {
                         recordsToSave.push({ studentId: student.id, grade: gradeNum });
                    }
                }
            });

            saveGrades(selectedClassId, subject.id, targetDate, recordsToSave);
            totalSaved += recordsToSave.length;
        });
        
        // Update original to match current
        setOriginalMatrix(JSON.parse(JSON.stringify(gradeMatrix)));
        
        alert(`Notas do ${selectedBimestre}º Bimestre salvas com sucesso! (${totalSaved} registros processados)`);
    };

    const isDirty = (studentId: string, subjectId: string) => {
        return gradeMatrix[studentId]?.[subjectId] !== originalMatrix[studentId]?.[subjectId];
    };

    // --- CSV IMPORT LOGIC ---

    const handleImportClick = () => {
        if (!selectedClassId) {
            alert("Selecione uma turma antes de importar.");
            return;
        }
        fileInputRef.current?.click();
    };

    const normalizeString = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const parseCSVFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') return;

                // Regex to split CSV by comma, ignoring commas inside quotes
                const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
                
                const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
                const targetDate = BIMESTRE_DATES[selectedBimestre];
                const newGrades: Grade[] = [];
                let matchCount = 0;

                // Skip header (idx 0)
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                    
                    if (matches && matches.length >= 8) {
                        // Clean quotes from matches
                        const cols = matches.map(m => m.replace(/^"|"$/g, '').trim());
                        
                        // Structure based on provided CSV:
                        // 0: Matrícula, 1: Nome, 7: Detalhes por Disciplina
                        const enrollmentId = cols[0];
                        const details = cols[7];

                        // Find student in current class
                        // First try by Enrollment ID
                        let student = classStudents.find(s => s.enrollmentId === enrollmentId);
                        
                        // Fallback to Name matching if ID not found or empty
                        if (!student && cols[1]) {
                             student = classStudents.find(s => normalizeString(s.name) === normalizeString(cols[1]));
                        }

                        if (student && details) {
                            // Parse Details: "Subject: Nota X.X, ...; Subject: ..."
                            const subjectParts = details.split(';');
                            
                            subjectParts.forEach(part => {
                                // Extract Subject Name and Grade
                                // Regex looks for: Start -> Name -> : -> Nota -> Value
                                const gradeMatch = part.match(/^(.*?):\s*Nota\s*([\d\.]+)/);
                                
                                if (gradeMatch) {
                                    const subjectNameRaw = gradeMatch[1].trim();
                                    const gradeValue = parseFloat(gradeMatch[2]);

                                    if (!isNaN(gradeValue)) {
                                        // Match Subject Name to App Subject ID
                                        // We use fuzzy matching (includes) because CSV names might be "Língua Portuguesa" vs "Português"
                                        const appSubject = subjects.find(s => 
                                            normalizeString(subjectNameRaw).includes(normalizeString(s.name)) || 
                                            normalizeString(s.name).includes(normalizeString(subjectNameRaw))
                                        );

                                        if (appSubject) {
                                            newGrades.push({
                                                studentId: student!.id,
                                                subjectId: appSubject.id,
                                                grade: gradeValue,
                                                date: targetDate
                                            });
                                            matchCount++;
                                        }
                                    }
                                }
                            });
                        }
                    }
                }

                if (newGrades.length > 0) {
                    importGrades(newGrades);
                    alert(`Importação concluída! ${matchCount} notas foram processadas para o ${selectedBimestre}º Bimestre.`);
                    // Refresh matrix is handled by useEffect dependency on `grades`
                } else {
                    alert("Nenhuma nota válida encontrada no arquivo para os alunos desta turma.");
                }

            } catch (err) {
                console.error(err);
                alert("Erro ao processar arquivo CSV.");
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            {!embedded && (
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold font-display text-white">Lançamento de Notas em Lote</h1>
                        <p className="text-gray-400 text-sm mt-1">Preencha as notas de todas as disciplinas por bimestre</p>
                    </div>
                    <div className="flex gap-4 items-center">
                         <input type="file" ref={fileInputRef} onChange={parseCSVFile} accept=".csv" className="hidden" />
                         <button 
                            onClick={handleImportClick}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
                         >
                            <CloudIcon className="w-5 h-5" />
                            Importar CSV
                         </button>
                        <div className={`px-4 py-2 rounded text-sm font-bold ${saveStatus.includes('Erro') || saveStatus.includes('Inválida') ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'}`}>
                            Status: {saveStatus}
                        </div>
                    </div>
                </div>
            )}
            
            <div className={`bg-gray-800 rounded-lg shadow-lg mb-8 border border-gray-700 ${embedded ? 'p-4 mb-4' : 'p-6'}`}>
                <div className={`grid grid-cols-1 ${!classId ? 'md:grid-cols-2' : ''} gap-6`}>
                    {!classId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Selecione a Turma</label>
                            <select 
                                value={selectedClassId} 
                                onChange={e => setSelectedClassId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500 text-lg"
                            >
                                <option value="">Selecione...</option>
                                {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Selecione o Bimestre</label>
                            <select 
                                value={selectedBimestre} 
                                onChange={e => setSelectedBimestre(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500 text-lg"
                            >
                                <option value="1">1º Bimestre</option>
                                <option value="2">2º Bimestre</option>
                                <option value="3">3º Bimestre</option>
                                <option value="4">4º Bimestre</option>
                            </select>
                        </div>
                        
                        {embedded && (
                            <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} onChange={parseCSVFile} accept=".csv" className="hidden" />
                                <button 
                                    onClick={handleImportClick}
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-lg h-[52px]"
                                    title="Importar Notas via CSV"
                                >
                                    <CloudIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedClassId ? (
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                    <div className="p-4 bg-gray-750 border-b border-gray-600 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-yellow-400">
                             Grade de Notas - {selectedClass?.name}
                        </h2>
                        <span className="text-gray-400 text-sm">
                            {classStudents.length} Alunos | {classSubjects.length} Disciplinas
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10 border-r border-gray-700">
                                        Aluno
                                    </th>
                                    {classSubjects.map(subject => (
                                        <th key={subject.id} scope="col" className="px-4 py-4 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider min-w-[100px]">
                                            {subject.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {classStudents.length > 0 ? classStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white sticky left-0 bg-gray-800 border-r border-gray-700 z-10">
                                            {student.name}
                                        </td>
                                        {classSubjects.map(subject => {
                                            const dirty = isDirty(student.id, subject.id);
                                            const val = gradeMatrix[student.id]?.[subject.id] ?? '';
                                            const hasError = errors.has(`${student.id}-${subject.id}`);
                                            
                                            return (
                                                <td key={subject.id} className="px-2 py-3 whitespace-nowrap text-center relative group">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="10"
                                                        value={val}
                                                        onChange={e => handleGradeChange(student.id, subject.id, e.target.value)}
                                                        onBlur={() => handleBlur(student.id, subject.id)}
                                                        className={`w-20 px-2 py-1.5 border rounded-md text-center font-bold focus:outline-none transition-all
                                                            ${hasError
                                                                ? 'border-red-500 bg-red-900/20 text-red-100 focus:ring-2 focus:ring-red-500'
                                                                : dirty 
                                                                    ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] bg-gray-600 text-white' 
                                                                    : val !== '' ? 'border-green-500/50 bg-gray-700 text-white' : 'border-gray-500 bg-gray-700 text-white'
                                                            }
                                                        `}
                                                        placeholder="-"
                                                    />
                                                    {hasError && (
                                                        <div className="absolute -bottom-2 left-0 w-full text-center">
                                                            <span className="text-[10px] bg-red-600 text-white px-1 rounded">0-10</span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={classSubjects.length + 1} className="px-6 py-12 text-center text-gray-400">
                                            Nenhum aluno matriculado nesta turma.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 bg-gray-750 border-t border-gray-700 flex justify-end">
                        <button 
                            onClick={handleSave} 
                            disabled={errors.size > 0}
                            className={`font-bold py-3 px-8 rounded-lg transition-colors shadow-lg transform duration-200 flex items-center gap-2
                                ${errors.size > 0 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70' 
                                    : 'bg-yellow-400 text-black hover:bg-yellow-500 hover:scale-105'
                                }
                            `}
                            title={errors.size > 0 ? "Corrija os erros em vermelho antes de salvar" : "Salvar Notas"}
                        >
                            <span>Salvar Todas as Notas</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-12 rounded-lg text-center border-2 border-dashed border-gray-700">
                    <p className="text-gray-400 text-lg">Selecione uma Turma para visualizar a grade de notas.</p>
                </div>
            )}
        </div>
    );
};

export default GradeEntryPage;
