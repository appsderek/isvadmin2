
import React, { useState, useRef, useEffect } from 'react';
import ReportsPage from './ReportsPage';
import CalendarPage from './CalendarPage';
import FinancialPage from './FinancialPage';
import SettingsPage from './SettingsPage';
import GradeEntryPage from './GradeEntryPage';
import VocationalAnalysisPage from './VocationalAnalysisPage';
import AiDepartmentPage from './AiDepartmentPage';
import ClassAnalysisPage from './ClassAnalysisPage'; // Import new page
import SchoolTranscriptPage from './SchoolTranscriptPage'; // Import Transcript page
import ReportCard from '../components/ReportCard';
import FavocoinPage from './FavocoinPage';
import { useData } from '../contexts/DataContext';
import { TrashIcon, ClipboardCheckIcon, ArrowLeftIcon, XIcon, CloudIcon, UserCircleIcon, AcademicCapIcon, BookOpenIcon, PencilIcon, SwitchHorizontalIcon, CameraIcon, IdCardIcon, DocumentTextIcon, CoinIcon, PrinterIcon } from '../components/icons';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Role, Student, Parent, SchoolClass } from '../types';


interface AdminDashboardProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

// CLASSES THAT DO NOT HAVE GRADES/REPORT CARDS
const NON_GRADED_CLASSES = [
    'CRECHE III', 
    'CRECHE IV', 
    'PRÉ I MANHÃ', 
    'PRÉ I TARDE', 
    'PRÉ II MANHÃ', 
    'PRÉ II TARDE'
];

// -- REUSABLE UI COMPONENTS (UPDATED STYLE) --

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="glass-panel p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-2xl relative animate-fade-in-up max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                    <XIcon className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold font-display text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                    <span className="w-1 h-8 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></span>
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
};

const FormField: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-5">
        <label className="block text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all duration-300" />
);

const SelectInput: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
     <select {...props} className="glass-input w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-300 appearance-none cursor-pointer">
        {props.children}
     </select>
);

const CheckboxGroup: React.FC<{ options: {id: string, name: string}[], selected: string[], onChange: (id: string) => void }> = ({ options, selected, onChange }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/20 p-4 rounded-xl max-h-72 overflow-y-auto border border-white/5 inner-shadow custom-scrollbar">
        {options.map(option => (
            <label key={option.id} className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-all border ${selected.includes(option.id) ? 'bg-yellow-400/10 border-yellow-400/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${selected.includes(option.id) ? 'bg-yellow-400 border-yellow-400' : 'border-gray-600'}`}>
                    {selected.includes(option.id) && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => onChange(option.id)}
                    className="hidden"
                />
                <span className={`text-sm select-none font-medium ${selected.includes(option.id) ? 'text-yellow-400' : 'text-gray-300'}`} title={option.name}>{option.name}</span>
            </label>
        ))}
        {options.length === 0 && <p className="col-span-full text-gray-500 text-center text-sm italic">Nenhuma opção disponível.</p>}
    </div>
);

// --- BATCH ID CARD GENERATOR ---
const BatchIdCardGenerator: React.FC = () => {
    const { classes, students, parents } = useData();
    const [selectedClassId, setSelectedClassId] = useState('');

    const generateIdCardHTML = (student: Student, classObj: SchoolClass | undefined, parent: Parent | undefined) => {
        const photoHtml = student.photoUrl 
            ? `<img src="${student.photoUrl}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<div style="width: 100%; height: 100%; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center;"><svg style="width: 48px; height: 48px; color: #9ca3af;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg></div>`;

        // Format Birth Date. Append T00:00:00 to ensure local time interpretation or simple split.
        // Assuming string is YYYY-MM-DD
        const birthDateFormatted = student.birthDate ? student.birthDate.split('-').reverse().join('/') : '--/--/----';

        return `
            <div class="card-wrapper" style="break-inside: avoid; page-break-inside: avoid;">
                <div class="id-card" style="
                    width: 85.6mm; 
                    height: 53.98mm; 
                    background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%);
                    border-radius: 8px;
                    padding: 4mm;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    font-family: 'Arial', sans-serif;
                    position: relative;
                    overflow: hidden;
                    color: black;
                    border: 1px solid rgba(0,0,0,0.1);
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 2mm; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 1mm;">
                        <div style="width: 6mm; height: 6mm; background-color: black; border-radius: 50%; margin-right: 2mm; display: flex; justify-content: center; align-items: center; color: #FFC107; font-weight: bold; font-size: 8px;">ISV</div>
                        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Instituto Sampaio Viegas</span>
                    </div>
                    
                    <div style="display: flex; gap: 3mm; flex: 1;">
                        <div style="width: 22mm; height: 28mm; background-color: white; border: 1px solid black; border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                            ${photoHtml}
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0;">
                            <div style="margin-bottom: 1mm;">
                                <div style="font-size: 6px; text-transform: uppercase; font-weight: 700; opacity: 0.6;">Nome do Aluno</div>
                                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; leading-tight: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${student.name}</div>
                            </div>
                            <div style="display: flex; gap: 2mm;">
                                <div style="flex: 1;">
                                    <div style="font-size: 6px; text-transform: uppercase; font-weight: 700; opacity: 0.6;">Matrícula</div>
                                    <div style="font-size: 8px; font-weight: 700;">${student.enrollmentId || '---'}</div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 6px; text-transform: uppercase; font-weight: 700; opacity: 0.6;">Turma</div>
                                    <div style="font-size: 8px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${classObj?.name || '---'}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 2mm; margin-top: 1mm;">
                                 <div style="flex: 1;">
                                    <div style="font-size: 6px; text-transform: uppercase; font-weight: 700; opacity: 0.6;">Nascimento</div>
                                    <div style="font-size: 8px; font-weight: 700;">${birthDateFormatted}</div>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 6px; text-transform: uppercase; font-weight: 700; opacity: 0.6;">Responsável</div>
                                    <div style="font-size: 8px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${parent?.name || '---'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: auto; padding-top: 1mm;">
                        <div style="height: 4mm; width: 100%; background: repeating-linear-gradient(90deg, black, black 1px, transparent 1px, transparent 2px); opacity: 0.8;"></div>
                    </div>
                    
                    <div style="position: absolute; bottom: 1mm; right: 1mm; font-size: 14px; font-weight: 900; opacity: 0.15; transform: rotate(-15deg);">2025</div>
                </div>
            </div>
        `;
    };

    const handlePrintBatch = () => {
        if (!selectedClassId) return;

        const schoolClass = classes.find(c => c.id === selectedClassId);
        if (!schoolClass) return;

        const classStudents = students
            .filter(s => schoolClass.studentIds.includes(s.id))
            .sort((a, b) => a.name.localeCompare(b.name));

        const printWindow = window.open('', '', 'height=800,width=1200');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Carteirinhas - ' + schoolClass.name + '</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @page { size: A4; margin: 10mm; }
            body { 
                margin: 0; 
                padding: 0; 
                background-color: white; 
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .grid-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 5mm;
                justify-content: center;
            }
            .card-wrapper {
                margin-bottom: 5mm;
                display: flex;
                justify-content: center;
            }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="grid-container">');
        
        classStudents.forEach(student => {
            const parent = parents.find(p => p.id === student.parentId);
            printWindow.document.write(generateIdCardHTML(student, schoolClass, parent));
        });

        printWindow.document.write('</div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold font-display text-white mb-8 flex items-center gap-3">
                <IdCardIcon className="w-8 h-8 text-yellow-400" />
                Carteirinhas em Lote
            </h1>

            <div className="glass-panel p-8 rounded-2xl mb-8 border border-white/10">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-400 uppercase mb-2">Selecione a Turma</label>
                        <select 
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:ring-yellow-500 focus:border-yellow-500 text-lg shadow-inner"
                        >
                            <option value="">Selecione...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.studentIds.length} alunos)</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={handlePrintBatch}
                        disabled={!selectedClassId}
                        className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all flex items-center gap-2 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <div className="p-1 bg-black/10 rounded-full">
                            <PrinterIcon className="w-5 h-5" />
                        </div>
                        Imprimir Carteirinhas
                    </button>
                </div>
            </div>

            {/* PREVIEW AREA */}
            {selectedClassId && (
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-white/5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <UserCircleIcon className="w-5 h-5 text-gray-400" />
                        Pré-visualização da Turma ({classes.find(c => c.id === selectedClassId)?.studentIds.length} alunos)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {students
                            .filter(s => classes.find(c => c.id === selectedClassId)?.studentIds.includes(s.id))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(student => {
                                const parent = parents.find(p => p.id === student.parentId);
                                return (
                                    <div key={student.id} className="bg-white rounded-lg p-3 shadow-lg relative overflow-hidden h-[180px] flex flex-col scale-90 origin-top-left w-full">
                                        {/* CSS-only mini card preview */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 opacity-90"></div>
                                        <div className="relative z-10 text-black flex flex-col h-full">
                                            <div className="flex items-center mb-2 border-b border-black/10 pb-1">
                                                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center text-yellow-400 text-[8px] font-bold mr-1">ISV</div>
                                                <span className="text-[10px] font-bold uppercase">Instituto SV</span>
                                            </div>
                                            <div className="flex gap-2 flex-1">
                                                <div className="w-16 h-20 bg-white border border-black/20 flex-shrink-0 overflow-hidden rounded-sm">
                                                    {student.photoUrl ? (
                                                        <img src={student.photoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-100"><UserCircleIcon className="w-8 h-8 text-gray-300"/></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="text-[8px] font-bold uppercase truncate">{student.name}</div>
                                                    <div className="text-[7px] text-gray-800">Mat: {student.enrollmentId || '-'}</div>
                                                    <div className="text-[7px] text-gray-800 truncate">Resp: {parent?.name || '-'}</div>
                                                </div>
                                            </div>
                                            <div className="mt-auto h-2 w-full bg-black/10"></div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DASHBOARD CONTENT ---

const DashboardContent: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    // ... (Mantido igual ao original - Sem alterações aqui)
    const { data, setData, students, teachers, classes, calendarEvents, forceCloudSync } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importConfirmOpen, setImportConfirmOpen] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const handleExport = () => {
        try {
            if (!data) throw new Error("Sem dados para exportar.");
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(data, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = "gestao-isv-pro-dados.json";
            link.click();
        } catch (error) {
            console.error("Erro ao exportar dados:", error);
            alert("Ocorreu um erro ao tentar exportar os dados.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleCloudUpload = async () => {
        setIsUploading(true);
        try {
            await forceCloudSync();
            alert("Upload para nuvem realizado com sucesso!");
        } catch (error) {
            alert("Erro ao fazer upload: " + (error as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    const parseCSVLine = (line: string): string[] => {
        const result = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                let field = line.substring(start, i).trim();
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.substring(1, field.length - 1);
                }
                result.push(field);
                start = i + 1;
            }
        }
        let lastField = line.substring(start).trim();
        if (lastField.startsWith('"') && lastField.endsWith('"')) {
            lastField = lastField.substring(1, lastField.length - 1);
        }
        result.push(lastField);
        return result;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string' || !text.trim()) {
                     throw new Error("O arquivo está vazio ou ilegível.");
                }

                if (file.name.endsWith('.csv')) {
                    // PROCESS CSV IMPORT
                    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
                    // Skip header if present (assuming line 0 is header)
                    const dataLines = lines.slice(1);
                    
                    const newStudents: Student[] = [];
                    const newParents: Parent[] = [];
                    const newClasses: SchoolClass[] = [];
                    // Clone existing data to allow checking for dupes/existing items during loop
                    const currentClasses = [...classes]; 
                    
                    let addedClassesCount = 0;

                    dataLines.forEach((line, idx) => {
                        const cols = parseCSVLine(line);
                        // EXPECTED CSV STRUCTURE:
                        // 0: Matrícula, 1: Nome Completo, 2: Data Nascimento, 3: CPF, 4: Email Aluno, 
                        // 5: Tel Aluno, 6: Endereço, 7: Naturalidade, 8: Nome Resp, 9: Tel Resp, 
                        // 10: Email Resp, 11: Data Nasc Resp, 12: Turma, 13: Status

                        if (cols.length < 5) return; // Skip invalid lines

                        const className = cols[12] || 'Sem Turma';
                        
                        // 1. Find or Create Class
                        let targetClassId = '';
                        let targetClass = currentClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
                        
                        if (!targetClass) {
                            targetClassId = `class-imp-${Date.now()}-${idx}`;
                            targetClass = {
                                id: targetClassId,
                                name: className,
                                teacherIds: [],
                                studentIds: [],
                                subjectIds: []
                            };
                            newClasses.push(targetClass);
                            currentClasses.push(targetClass); // Add to local lookup
                            addedClassesCount++;
                        } else {
                            targetClassId = targetClass.id;
                        }

                        // 2. Create Parent
                        const parentId = `parent-imp-${Date.now()}-${idx}`;
                        const studentId = `stu-imp-${Date.now()}-${idx}`;

                        const parent: Parent = {
                            id: parentId,
                            name: cols[8] || 'Responsável não informado',
                            email: cols[10] || '',
                            role: Role.Parent,
                            studentId: studentId,
                            phone: cols[9] || '',
                            birthDate: cols[11] || ''
                        };
                        newParents.push(parent);

                        // 3. Create Student
                        const student: Student = {
                            id: studentId,
                            name: cols[1] || 'Aluno Desconhecido',
                            classId: targetClassId,
                            parentId: parentId,
                            enrollmentId: cols[0],
                            birthDate: cols[2],
                            cpf: cols[3],
                            email: cols[4],
                            phone: cols[5],
                            address: cols[6],
                            cityOfBirth: cols[7],
                            status: cols[13] || 'ativo'
                        };
                        newStudents.push(student);

                        // Link student to class in memory for immediate consistency
                        targetClass.studentIds.push(studentId);
                    });

                    if (newStudents.length > 0) {
                        const mergedData = {
                            ...data,
                            students: [...data.students, ...newStudents],
                            parents: [...data.parents, ...newParents],
                            users: [...data.users, ...newParents], // Parents are users
                            classes: currentClasses, // Contains old + new classes with updated studentIds
                            lastUpdated: Date.now()
                        };
                        setPendingImportData(mergedData);
                        setImportConfirmOpen(true);
                    } else {
                        throw new Error("Nenhum dado válido encontrado no CSV.");
                    }

                } else {
                    // PROCESS JSON IMPORT (Legacy)
                    let importedData;
                    try {
                        importedData = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error("O arquivo não é um JSON válido.");
                    }
                    
                    if (importedData && typeof importedData === 'object' && (Array.isArray(importedData.students) || Array.isArray(importedData.classes))) {
                         setPendingImportData(importedData);
                         setImportConfirmOpen(true);
                    } else {
                        throw new Error("Estrutura de dados inválida.");
                    }
                }
            } catch (error) {
                alert(`Erro: ${(error as Error).message}`);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
                event.target.value = ''; 
            }
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if(pendingImportData) {
            setData({ ...pendingImportData, lastUpdated: Date.now() });
            setPendingImportData(null);
            alert(`Importação concluída com sucesso! ${pendingImportData.students.length - data.students.length} novos registros adicionados.`);
        }
    };

    const StatCard = ({ title, value, onClick, subtext }: any) => (
        <div onClick={onClick} className="glass-panel p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all duration-300 group neon-border">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
            <p className="text-4xl font-bold text-white mt-2 font-display group-hover:text-yellow-400 transition-colors neon-text">{value}</p>
            {subtext && <p className="text-xs text-gray-500 mt-2 truncate">{subtext}</p>}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <h1 className="text-4xl font-bold font-display text-white mb-8 tracking-tight">Visão Geral</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total de Alunos" value={students.length} onClick={() => onNavigate('Alunos')} />
                <StatCard title="Professores" value={teachers.length} onClick={() => onNavigate('Professores')} />
                <StatCard title="Turmas Ativas" value={classes.length} onClick={() => onNavigate('Turmas')} />
                <StatCard 
                    title="Próximo Evento" 
                    // Fixed: Use string split instead of Date() to avoid timezone issues (e.g. day 16 becoming 15)
                    value={calendarEvents[0] ? calendarEvents[0].date.split('-')[2] : '-'} 
                    subtext={calendarEvents[0]?.title || 'Nenhum'} 
                    onClick={() => onNavigate('Calendário')} 
                />
            </div>
            
            <div className="glass-panel p-8 rounded-2xl mb-8">
                <h2 className="text-xl font-bold font-display text-white mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,1)]"></span>
                    Acesso Rápido
                </h2>
                <div className="flex flex-wrap gap-4">
                    {[
                        { name: 'Gerenciar Alunos', view: 'Alunos', color: 'bg-yellow-400' },
                        { name: 'Professores', view: 'Professores', color: 'bg-gray-700' },
                        { name: 'Turmas', view: 'Turmas', color: 'bg-gray-700' },
                        { name: 'Lançar Notas', view: 'Lançamento de Notas', color: 'bg-gray-700' },
                        { name: 'Favocoin', view: 'Favocoin', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
                        { name: 'Carteirinhas em Lote', view: 'Carteirinhas', color: 'bg-indigo-600', icon: <IdCardIcon className="w-4 h-4 inline mr-2"/> }
                    ].map(btn => (
                        <button 
                            key={btn.name}
                            onClick={() => onNavigate(btn.view)} 
                            className={`py-3 px-6 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white/5 ${
                                btn.color.includes('gradient') || btn.color.includes('indigo') ? btn.color + ' text-white' :
                                btn.color === 'bg-yellow-400' ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:bg-yellow-300' : 'bg-white/5 text-white hover:bg-white/10'
                            }`}
                        >
                            {btn.icon}
                            {btn.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-8 rounded-2xl">
                 <h2 className="text-xl font-bold font-display text-white mb-6 flex items-center gap-2">
                    <CloudIcon className="w-5 h-5 text-blue-400" />
                    Backup & Dados
                 </h2>
                 <div className="flex flex-wrap gap-4">
                    <button onClick={handleCloudUpload} disabled={isUploading} className="bg-blue-600/80 backdrop-blur text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 disabled:opacity-50">
                        <CloudIcon className="w-5 h-5" />
                        {isUploading ? 'Enviando...' : 'Upload para Nuvem'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.csv" className="hidden" />
                    <button onClick={handleImportClick} className="bg-white/5 border border-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2">Importar Dados (JSON/CSV)</button>
                    <button onClick={handleExport} className="bg-white/5 border border-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2">Exportar Dados</button>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={importConfirmOpen}
                onClose={() => setImportConfirmOpen(false)}
                onConfirm={confirmImport}
                title="Confirmar Importação"
                message={`Atenção: Você está prestes a importar dados. Isso irá mesclar os novos alunos e turmas com seus dados existentes. Deseja continuar?`}
                confirmText="Sim, Importar"
            />
        </div>
    );
}

// -- MANAGEMENT COMPONENTS --

const SubjectManagement: React.FC = () => {
    // ... (Mantido igual)
    const { subjects, addSubject, deleteSubject } = useData();
    const [newSubjectName, setNewSubjectName] = useState('');
    const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);

    const handleAddSubject = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSubjectName.trim()) {
            addSubject(newSubjectName.trim());
            setNewSubjectName('');
        }
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold font-display text-white mb-8">Gerenciamento de Disciplinas</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <form onSubmit={handleAddSubject} className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-6">Nova Disciplina</h3>
                        <FormField label="Nome">
                            <TextInput
                                type="text"
                                value={newSubjectName}
                                onChange={e => setNewSubjectName(e.target.value)}
                                placeholder="Ex: Robótica"
                                required
                            />
                        </FormField>
                        <button type="submit" className="mt-2 w-full bg-yellow-400 text-black font-bold py-3 px-4 rounded-xl hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all">
                            Adicionar
                        </button>
                    </form>
                </div>
                <div className="md:col-span-2 glass-panel p-6 rounded-2xl">
                     <h3 className="text-lg font-bold text-white mb-6">Disciplinas Cadastradas ({subjects.length})</h3>
                     <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {subjects.length > 0 ? subjects.map(subject => (
                            <div key={subject.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group">
                                <span className="text-white font-medium tracking-wide">{subject.name}</span>
                                <button 
                                    onClick={() => setItemToDelete({id: subject.id, name: subject.name})} 
                                    className="text-gray-500 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100" 
                                    title="Excluir disciplina"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )) : <p className="text-gray-500 italic text-center py-8">Nenhuma disciplina cadastrada.</p>}
                     </div>
                </div>
            </div>
            
            <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => itemToDelete && deleteSubject(itemToDelete.id)}
                title="Excluir Disciplina"
                message={`Tem certeza que deseja excluir a disciplina "${itemToDelete?.name}"?`}
            />
        </div>
    );
};

// --- STUDENT ID CARD MODAL ---
// (Mantido igual)
const StudentIdCardModal: React.FC<{ isOpen: boolean, onClose: () => void, student: Student, classData?: SchoolClass, parent?: Parent }> = ({ isOpen, onClose, student, classData, parent }) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            const cardContent = document.getElementById('student-id-card');
            printWindow.document.write('<html><head><title>Carteirinha</title>');
            printWindow.document.write('<style>');
            printWindow.document.write(`
                @page { size: auto; margin: 0mm; }
                body { margin: 20px; display: flex; justify-content: center; align-items: center; background-color: #f0f0f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .card-container { 
                    width: 323px; 
                    height: 204px; 
                    background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%);
                    border-radius: 10px;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    font-family: 'Arial', sans-serif;
                    position: relative;
                    overflow: hidden;
                    color: black;
                }
                .header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    border-bottom: 2px solid rgba(0,0,0,0.1);
                    padding-bottom: 5px;
                }
                .logo-placeholder {
                    width: 30px;
                    height: 30px;
                    background-color: black;
                    border-radius: 50%;
                    margin-right: 10px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: #FFC107;
                    font-weight: bold;
                    font-size: 14px;
                }
                .school-name {
                    font-size: 14px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .content {
                    display: flex;
                    gap: 15px;
                    flex: 1;
                }
                .photo-area {
                    width: 80px;
                    height: 100px;
                    background-color: white;
                    border: 2px solid black;
                    border-radius: 5px;
                    overflow: hidden;
                }
                .photo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 4px;
                }
                .label {
                    font-size: 8px;
                    text-transform: uppercase;
                    color: rgba(0,0,0,0.6);
                    font-weight: 700;
                }
                .value {
                    font-size: 11px;
                    font-weight: 600;
                    margin-bottom: 2px;
                    white-space: pre-wrap;
                    line-height: 1.1;
                }
                .name-value {
                    font-size: 13px;
                    font-weight: 800;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                .footer {
                    margin-top: auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .barcode {
                    height: 25px;
                    width: 100%;
                    background: repeating-linear-gradient(
                        90deg,
                        #000,
                        #000 2px,
                        transparent 2px,
                        transparent 4px
                    );
                    opacity: 0.8;
                }
                .year-tag {
                    position: absolute;
                    bottom: 10px;
                    right: 10px;
                    font-size: 20px;
                    font-weight: 900;
                    opacity: 0.15;
                    transform: rotate(-15deg);
                }
            `);
            printWindow.document.write('</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(cardContent?.outerHTML || '');
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    const birthDateFormatted = student.birthDate ? student.birthDate.split('-').reverse().join('/') : '--/--/----';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Carteirinha do Aluno">
            <div className="flex flex-col items-center gap-6">
                <div className="bg-gray-900 p-4 rounded-xl border border-white/10">
                    <div id="student-id-card" className="w-[323px] h-[204px] bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-4 flex flex-col shadow-lg relative text-black font-sans overflow-hidden">
                        <div className="flex items-center mb-2 border-b border-black/10 pb-1">
                            <div className="w-8 h-8 bg-black rounded-full mr-2 flex items-center justify-center text-yellow-400 font-bold text-xs">ISV</div>
                            <span className="text-sm font-extrabold uppercase tracking-wide">Instituto Sampaio Viegas</span>
                        </div>
                        
                        <div className="flex gap-3 flex-1">
                            <div className="w-20 h-24 bg-white border-2 border-black rounded overflow-hidden flex-shrink: 0">
                                {student.photoUrl ? (
                                    <img src={student.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                        <UserCircleIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-center flex-1 min-w-0">
                                <div>
                                    <div className="text-[8px] uppercase font-bold opacity-60">Nome do Aluno</div>
                                    <div className="text-xs font-extrabold uppercase leading-tight mb-1 truncate">{student.name}</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <div className="text-[7px] uppercase font-bold opacity-60">Matrícula</div>
                                        <div className="text-[10px] font-bold">{student.enrollmentId || '---'}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[7px] uppercase font-bold opacity-60">Turma</div>
                                        <div className="text-[10px] font-bold truncate">{classData?.name || '---'}</div>
                                    </div>
                                </div>
                                <div className="mt-1 flex gap-2">
                                     <div className="flex-1">
                                        <div className="text-[7px] uppercase font-bold opacity-60">Nascimento</div>
                                        <div className="text-[10px] font-bold">{birthDateFormatted}</div>
                                    </div>
                                     <div className="flex-1 min-w-0">
                                        <div className="text-[7px] uppercase font-bold opacity-60">Responsável</div>
                                        <div className="text-[10px] font-bold truncate" title={parent?.name}>{parent?.name || '---'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-2">
                            <div className="h-6 w-full bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_4px)] opacity-80"></div>
                        </div>
                        
                        <div className="absolute bottom-2 right-2 text-2xl font-black opacity-15 -rotate-12 pointer-events-none">2025</div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 rounded-lg bg-gray-700 text-white font-bold hover:bg-gray-600 transition-colors"
                    >
                        Fechar
                    </button>
                    <button 
                        onClick={handlePrint} 
                        className="px-6 py-2 rounded-lg bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-colors shadow-lg flex items-center gap-2"
                    >
                        <IdCardIcon className="w-5 h-5" />
                        Imprimir Carteirinha
                    </button>
                </div>
            </div>
        </Modal>
    );
};

interface StudentManagementProps {
    onNavigate: (view: string, data?: any) => void;
    title?: string;
    hideAddButton?: boolean;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ onNavigate, title, hideAddButton }) => {
    // ... (Mantido igual)
    const { students, classes, parents, deleteStudent, addStudent, updateStudent } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
    const [studentInFocus, setStudentInFocus] = useState<any | null>(null);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

    // ID Card State
    const [idCardModalOpen, setIdCardModalOpen] = useState(false);
    const [studentForCard, setStudentForCard] = useState<Student | null>(null);

    // Transfer State
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [studentToTransfer, setStudentToTransfer] = useState<{id: string, name: string, currentClassId: string} | null>(null);
    const [transferTargetId, setTransferTargetId] = useState('');

    // Form State
    const [studentName, setStudentName] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentEmail, setParentEmail] = useState('');
    const [classId, setClassId] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    
    // Extended Form State
    const [enrollmentId, setEnrollmentId] = useState('');
    const [studentBirthDate, setStudentBirthDate] = useState('');
    const [studentCpf, setStudentCpf] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentPhone, setStudentPhone] = useState('');
    const [address, setAddress] = useState('');
    const [cityOfBirth, setCityOfBirth] = useState('');
    const [status, setStatus] = useState('ativo');
    const [parentPhone, setParentPhone] = useState('');
    const [parentBirthDate, setParentBirthDate] = useState('');

    const photoInputRef = useRef<HTMLInputElement>(null);

    // Filter State
    const [filterName, setFilterName] = useState('');
    const [filterEnrollmentId, setFilterEnrollmentId] = useState('');
    const [filterClassId, setFilterClassId] = useState('');

    const handleOpenModal = (studentToEdit?: any) => {
        if (studentToEdit) {
            setEditingStudentId(studentToEdit.id);
            setStudentName(studentToEdit.name);
            setEnrollmentId(studentToEdit.enrollmentId || '');
            setStudentBirthDate(studentToEdit.birthDate || '');
            setStudentCpf(studentToEdit.cpf || '');
            setStudentEmail(studentToEdit.email || '');
            setStudentPhone(studentToEdit.phone || '');
            setAddress(studentToEdit.address || '');
            setCityOfBirth(studentToEdit.cityOfBirth || '');
            setStatus(studentToEdit.status || 'ativo');
            setPhotoUrl(studentToEdit.photoUrl || '');
            
            const parent = parents.find(p => p.id === studentToEdit.parentId);
            setParentName(parent?.name || '');
            setParentEmail(parent?.email || '');
            setParentPhone(parent?.phone || '');
            setParentBirthDate(parent?.birthDate || '');
            
            setClassId(studentToEdit.classId);
        } else {
            setEditingStudentId(null);
            setStudentName('');
            setParentName('');
            setParentEmail('');
            setEnrollmentId('');
            setStudentBirthDate('');
            setStudentCpf('');
            setStudentEmail('');
            setStudentPhone('');
            setAddress('');
            setCityOfBirth('');
            setStatus('ativo');
            setParentPhone('');
            setParentBirthDate('');
            setPhotoUrl('');
            setClassId(classes[0]?.id || '');
        }
        setIsModalOpen(true);
    };

    const handleTransferClick = (student: Student) => {
        setStudentToTransfer({ id: student.id, name: student.name, currentClassId: student.classId });
        setTransferTargetId('');
        setTransferModalOpen(true);
    };

    const handleGenerateIdCard = (student: Student) => {
        setStudentInFocus(null); // Close detail modal if open
        setStudentForCard(student);
        setIdCardModalOpen(true);
    }

    const handleConfirmTransfer = () => {
        if (studentToTransfer && transferTargetId) {
            // Use updateStudent to change only the classId
            updateStudent(studentToTransfer.id, { classId: transferTargetId }, {});
            setTransferModalOpen(false);
            setStudentToTransfer(null);
            alert(`Aluno transferido com sucesso!`);
        }
    };

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Basic Size Check before processing (soft limit)
            // if (file.size > 5 * 1024 * 1024) { alert("Arquivo muito grande!"); return; }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Resize to max 300x300 for storage efficiency
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG 0.7
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    setPhotoUrl(compressedBase64);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentName || !parentName || !classId) return;
        
        const studentData = {
            name: studentName,
            classId,
            enrollmentId,
            birthDate: studentBirthDate,
            cpf: studentCpf,
            email: studentEmail,
            phone: studentPhone,
            address,
            cityOfBirth,
            status,
            photoUrl
        };

        const parentData = {
            name: parentName,
            email: parentEmail,
            phone: parentPhone,
            birthDate: parentBirthDate
        };

        if (editingStudentId) {
            updateStudent(editingStudentId, studentData, parentData);
        } else {
            addStudent(studentData, parentData);
        }
        setIsModalOpen(false);
    };

    const filteredStudents = students.filter(student => {
        const matchName = student.name.toLowerCase().includes(filterName.toLowerCase());
        const matchEnrollment = filterEnrollmentId ? (student.enrollmentId || '').includes(filterEnrollmentId) : true;
        const matchClass = filterClassId ? student.classId === filterClassId : true;
        return matchName && matchEnrollment && matchClass;
    });

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                 <h1 className="text-3xl font-bold font-display text-white tracking-tight">{title || "Gerenciamento de Alunos"}</h1>
                 {!hideAddButton && (
                    <button onClick={() => handleOpenModal()} className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:scale-105">
                        + Novo Aluno
                    </button>
                 )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="glass-input w-full px-5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-shadow pl-12"
                    />
                    <svg className="w-5 h-5 text-gray-500 absolute left-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar por matrícula..."
                        value={filterEnrollmentId}
                        onChange={(e) => setFilterEnrollmentId(e.target.value)}
                        className="glass-input w-full px-5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-shadow"
                    />
                </div>
                <div className="relative">
                    <select 
                        value={filterClassId} 
                        onChange={(e) => setFilterClassId(e.target.value)}
                        className="glass-input w-full px-5 py-3 rounded-xl text-white focus:outline-none transition-shadow appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-gray-900">Todas as Turmas</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                 <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                     <table className="min-w-full">
                        <thead className="bg-black/20 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Nome</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Matrícula</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Turma</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Responsável</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                const studentClass = classes.find(c => c.id === student.classId);
                                const studentParent = parents.find(p => p.id === student.parentId);
                                const isNonGraded = NON_GRADED_CLASSES.includes(studentClass?.name.toUpperCase() || '');

                                return (
                                    <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                                        <td 
                                            className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white cursor-pointer group-hover:text-yellow-400 transition-colors flex items-center gap-3"
                                            onClick={() => setStudentInFocus(student)}
                                        >
                                            {student.photoUrl ? (
                                                <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/20" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 font-bold">
                                                    {student.name.charAt(0)}
                                                </div>
                                            )}
                                            {student.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{student.enrollmentId || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{studentClass?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{studentParent?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-3">
                                            {!hideAddButton && (
                                                <>
                                                    <button onClick={() => handleOpenModal(student)} className="text-white hover:text-yellow-400 p-1 rounded hover:bg-white/10 transition-colors" title="Editar">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    
                                                    <button onClick={() => handleGenerateIdCard(student)} className="text-white hover:text-blue-400 p-1 rounded hover:bg-white/10 transition-colors" title="Gerar Carteirinha">
                                                        <IdCardIcon className="w-4 h-4" />
                                                    </button>

                                                    <button 
                                                        onClick={() => {
                                                            setStudentInFocus(null);
                                                            onNavigate('Histórico Escolar', student.id);
                                                        }} 
                                                        className="text-white hover:text-purple-400 p-1 rounded hover:bg-white/10 transition-colors" 
                                                        title="Histórico Escolar"
                                                    >
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                    </button>

                                                    {!isNonGraded && (
                                                        <button 
                                                            onClick={() => {
                                                                setStudentInFocus(null);
                                                                onNavigate('Boletim', student.id);
                                                            }} 
                                                            className="text-white hover:text-green-400 p-1 rounded hover:bg-white/10 transition-colors" 
                                                            title="Boletim"
                                                        >
                                                            <ClipboardCheckIcon className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <button onClick={() => handleTransferClick(student)} className="text-white hover:text-blue-400 p-1 rounded hover:bg-white/10 transition-colors" title="Transferir de Turma">
                                                        <SwitchHorizontalIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setItemToDelete({id: student.id, name: student.name})} className="text-white hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors" title="Excluir">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        {filterName || filterEnrollmentId || filterClassId ? 'Nenhum aluno encontrado com estes filtros.' : 'Nenhum aluno cadastrado.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                     </table>
                 </div>
            </div>

            {/* TRANSFER MODAL */}
            {transferModalOpen && studentToTransfer && (
                <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transferência de Aluno">
                    <div className="space-y-6">
                        <p className="text-gray-300">
                            Transferindo o aluno <span className="text-white font-bold">{studentToTransfer.name}</span> da turma atual.
                        </p>
                        
                        <FormField label="Para qual turma deseja transferir?">
                            <SelectInput 
                                value={transferTargetId} 
                                onChange={(e) => setTransferTargetId(e.target.value)}
                            >
                                <option value="">Selecione a nova turma...</option>
                                {classes.filter(c => c.id !== studentToTransfer.currentClassId).map(c => (
                                    <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>
                                ))}
                            </SelectInput>
                        </FormField>

                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => setTransferModalOpen(false)} 
                                className="px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmTransfer} 
                                disabled={!transferTargetId}
                                className="px-4 py-2 rounded-lg text-white font-bold transition-colors shadow-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Transferência
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ID CARD MODAL */}
            {idCardModalOpen && studentForCard && (
                <StudentIdCardModal 
                    isOpen={idCardModalOpen} 
                    onClose={() => setIdCardModalOpen(false)} 
                    student={studentForCard}
                    classData={classes.find(c => c.id === studentForCard.classId)}
                    parent={parents.find(p => p.id === studentForCard.parentId)}
                />
            )}

            {/* STUDENT DETAILS MODAL */}
            {studentInFocus && (
                <Modal isOpen={!!studentInFocus} onClose={() => setStudentInFocus(null)} title="Ficha do Aluno">
                    <div className="bg-gradient-to-br from-gray-800 to-black rounded-2xl p-6 flex flex-col items-center mb-8 border border-white/10 shadow-inner">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 p-[3px] mb-4 shadow-[0_0_20px_rgba(250,204,21,0.4)] overflow-hidden">
                             {studentInFocus.photoUrl ? (
                                <img src={studentInFocus.photoUrl} alt="" className="w-full h-full object-cover rounded-full" />
                             ) : (
                                 <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center">
                                    <UserCircleIcon className="w-20 h-20 text-gray-400" />
                                 </div>
                             )}
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1 font-display tracking-tight text-center">{studentInFocus.name}</h3>
                        <p className="text-gray-500 text-xs uppercase tracking-widest">Matrícula: {studentInFocus.enrollmentId || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                             <div className="bg-yellow-400/20 p-3 rounded-lg text-yellow-400">
                                <BookOpenIcon className="w-6 h-6" />
                             </div>
                             <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Turma</p>
                                 <p className="text-lg text-white font-medium">{classes.find(c => c.id === studentInFocus.classId)?.name || 'Sem turma'}</p>
                             </div>
                         </div>

                         <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                             <div className="bg-blue-400/20 p-3 rounded-lg text-blue-400">
                                <UserCircleIcon className="w-6 h-6" />
                             </div>
                             <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Responsável</p>
                                 <p className="text-lg text-white font-medium">{parents.find(p => p.id === studentInFocus.parentId)?.name || 'N/A'}</p>
                             </div>
                         </div>

                         <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 md:col-span-2">
                             <div className="bg-green-400/20 p-3 rounded-lg text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                             </div>
                             <div>
                                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Contato</p>
                                 <p className="text-lg text-white font-medium">{parents.find(p => p.id === studentInFocus.parentId)?.email || 'N/A'}</p>
                                 <p className="text-sm text-gray-400">{parents.find(p => p.id === studentInFocus.parentId)?.phone || ''}</p>
                             </div>
                         </div>
                    </div>

                    <div className="mt-8 flex flex-wrap justify-end gap-3">
                        <button 
                            onClick={() => {
                                setStudentInFocus(null);
                                onNavigate('Histórico Escolar', studentInFocus.id);
                            }} 
                            className="bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-500 transition-all shadow-[0_0_15px_rgba(147,51,234,0.4)] flex-1 flex items-center justify-center gap-2"
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                            Histórico
                        </button>

                        <button 
                            onClick={() => handleGenerateIdCard(studentInFocus)} 
                            className="bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] flex-1 flex items-center justify-center gap-2"
                        >
                            <IdCardIcon className="w-5 h-5" />
                            Carteirinha
                        </button>

                        {/* Only show Boletim if not in non-graded class */}
                        {!NON_GRADED_CLASSES.includes(classes.find(c => c.id === studentInFocus.classId)?.name.toUpperCase() || '') && (
                            <button 
                                onClick={() => {
                                    setStudentInFocus(null);
                                    onNavigate('Boletim', studentInFocus.id);
                                }} 
                                className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] flex-1 flex items-center justify-center gap-2"
                            >
                                <ClipboardCheckIcon className="w-5 h-5" />
                                Ver Boletim
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                setStudentInFocus(null);
                                handleOpenModal(studentInFocus);
                            }} 
                            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <PencilIcon className="w-5 h-5" />
                            Editar
                        </button>
                         <button 
                            onClick={() => setStudentInFocus(null)} 
                            className="bg-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/20 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </Modal>
            )}

            {/* ADD/EDIT STUDENT MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStudentId ? "Editar Aluno" : "Novo Aluno"}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ... (Existing Form Content) ... */}
                    {/* SECTION: FOTO E DADOS DO ALUNO */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <h3 className="text-yellow-400 font-bold mb-4 uppercase text-xs tracking-wider border-b border-gray-700 pb-2">Dados do Aluno</h3>
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Photo Upload Area */}
                            <div className="flex flex-col items-center gap-2">
                                <div 
                                    className="w-24 h-24 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center cursor-pointer overflow-hidden hover:border-yellow-400 transition-colors relative group"
                                    onClick={() => photoInputRef.current?.click()}
                                >
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <CameraIcon className="w-8 h-8 text-gray-400 group-hover:text-yellow-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-white font-bold">Alterar</span>
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    ref={photoInputRef} 
                                    onChange={handlePhotoUpload} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                                <span className="text-[10px] text-gray-500">Máx 5MB (Auto-resize)</span>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Nome Completo">
                                    <TextInput type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required placeholder="Ex: Lucas Pereira"/>
                                </FormField>
                                <FormField label="Matrícula">
                                    <TextInput type="text" value={enrollmentId} onChange={e => setEnrollmentId(e.target.value)} placeholder="Ex: 2025001"/>
                                </FormField>
                                <FormField label="Data de Nascimento">
                                    <TextInput type="date" value={studentBirthDate} onChange={e => setStudentBirthDate(e.target.value)} />
                                </FormField>
                                <FormField label="CPF do Aluno">
                                    <TextInput type="text" value={studentCpf} onChange={e => setStudentCpf(e.target.value)} placeholder="000.000.000-00"/>
                                </FormField>
                                <FormField label="Naturalidade">
                                    <TextInput type="text" value={cityOfBirth} onChange={e => setCityOfBirth(e.target.value)} placeholder="Cidade - UF"/>
                                </FormField>
                                <FormField label="Status da Matrícula">
                                    <SelectInput value={status} onChange={e => setStatus(e.target.value)}>
                                        <option value="ativo" className="bg-gray-800">Ativo</option>
                                        <option value="inativo" className="bg-gray-800">Inativo</option>
                                        <option value="transferido" className="bg-gray-800">Transferido</option>
                                    </SelectInput>
                                </FormField>
                                <div className="md:col-span-2">
                                    <FormField label="Turma">
                                        <SelectInput value={classId} onChange={e => setClassId(e.target.value)} required>
                                            <option value="" disabled className="bg-gray-800">Selecione uma turma</option>
                                            {classes.map(c => <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>)}
                                        </SelectInput>
                                    </FormField>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: CONTATO E ENDEREÇO */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <h3 className="text-yellow-400 font-bold mb-4 uppercase text-xs tracking-wider border-b border-gray-700 pb-2">Contato e Endereço</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Email do Aluno">
                                <TextInput type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="email.aluno@exemplo.com"/>
                            </FormField>
                            <FormField label="Telefone do Aluno">
                                <TextInput type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} placeholder="(00) 00000-0000"/>
                            </FormField>
                            <div className="md:col-span-2">
                                <FormField label="Endereço Completo">
                                    <TextInput type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Número, Bairro, Cidade"/>
                                </FormField>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: DADOS DO RESPONSÁVEL */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <h3 className="text-yellow-400 font-bold mb-4 uppercase text-xs tracking-wider border-b border-gray-700 pb-2">Dados do Responsável</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Nome do Responsável">
                                <TextInput type="text" value={parentName} onChange={e => setParentName(e.target.value)} required placeholder="Nome do Pai/Mãe"/>
                            </FormField>
                            <FormField label="Email do Responsável">
                                <TextInput type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="pai.mae@exemplo.com"/>
                            </FormField>
                            <FormField label="Telefone do Responsável">
                                <TextInput type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="(00) 00000-0000"/>
                            </FormField>
                            <FormField label="Data Nascimento Responsável">
                                <TextInput type="date" value={parentBirthDate} onChange={e => setParentBirthDate(e.target.value)} />
                            </FormField>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-white/10 sticky bottom-0 bg-gray-800 py-4 -mb-4 -mx-4 px-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold py-2 px-6 transition-colors">Cancelar</button>
                        <button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-8 rounded-xl hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all">{editingStudentId ? "Atualizar" : "Salvar"}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => itemToDelete && deleteStudent(itemToDelete.id)}
                title="Excluir Aluno"
                message={`Tem certeza que deseja excluir o aluno "${itemToDelete?.name}"? Histórico de notas e presença também será removido.`}
            />
        </div>
    );
};

const TeacherManagement: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    const { teachers, subjects, deleteTeacher, addTeacher } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
    
    // Form State
    const [teacherName, setTeacherName] = useState('');
    const [teacherEmail, setTeacherEmail] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

    const handleOpenModal = () => {
        setTeacherName('');
        setTeacherEmail('');
        setSelectedSubjects([]);
        setIsModalOpen(true);
    };

    const handleSubjectToggle = (subjectId: string) => {
        setSelectedSubjects(prev => 
            prev.includes(subjectId) 
                ? prev.filter(id => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacherName || !teacherEmail) return;
        addTeacher(teacherName, teacherEmail, selectedSubjects);
        setIsModalOpen(false);
    };

    return (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-8">
                 <h1 className="text-3xl font-bold font-display text-white">Professores</h1>
                 <button onClick={handleOpenModal} className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105">
                     + Novo Professor
                 </button>
            </div>
             <div className="glass-panel rounded-2xl overflow-hidden">
                 <div className="overflow-x-auto custom-scrollbar">
                     <table className="min-w-full">
                        <thead className="bg-black/20 sticky top-0 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Nome</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Disciplinas</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {teachers.length > 0 ? teachers.map(teacher => {
                                const teacherSubjects = teacher.subjectIds.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', ');
                                return (
                                    <tr key={teacher.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white group-hover:text-yellow-400 transition-colors">{teacher.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{teacher.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{teacherSubjects || 'Nenhuma'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setItemToDelete({id: teacher.id, name: teacher.name})} 
                                                className="text-white hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Nenhum professor cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                     </table>
                 </div>
            </div>

            {/* ADD TEACHER MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Professor">
                <form onSubmit={handleSubmit}>
                    <FormField label="Nome do Professor">
                        <TextInput type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} required placeholder="Ex: Prof. Mariana"/>
                    </FormField>
                    <FormField label="Email">
                        <TextInput type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} required placeholder="Ex: mariana@school.com"/>
                    </FormField>
                    <FormField label="Disciplinas">
                        <CheckboxGroup options={subjects} selected={selectedSubjects} onChange={handleSubjectToggle} />
                    </FormField>
                     <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-white/10">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold py-2 px-6 transition-colors">Cancelar</button>
                        <button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-8 rounded-xl hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all">Salvar</button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => itemToDelete && deleteTeacher(itemToDelete.id)}
                title="Excluir Professor"
                message={`Tem certeza que deseja excluir o professor "${itemToDelete?.name}"?`}
            />
        </div>
    );
};

const ClassManagement: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    const { classes, teachers, subjects, deleteClass, addClass, updateClass, migrateStudents, students } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    // Form State
    const [className, setClassName] = useState('');
    const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [selectedShift, setSelectedShift] = useState<'Matutino' | 'Vespertino'>('Matutino');

    // Migration State
    const [migrationSourceId, setMigrationSourceId] = useState('');
    const [migrationTargetId, setMigrationTargetId] = useState('');
    const [studentsToMigrate, setStudentsToMigrate] = useState<string[]>([]);

    const handleOpenModal = (classToEdit?: any) => {
        if (classToEdit) {
            setEditingClassId(classToEdit.id);
            setClassName(classToEdit.name);
            setSelectedTeachers(classToEdit.teacherIds || []);
            setSelectedSubjects(classToEdit.subjectIds || []);
            setSelectedShift(classToEdit.shift || 'Matutino');
        } else {
            setEditingClassId(null);
            setClassName('');
            setSelectedTeachers([]);
            setSelectedSubjects([]);
            setSelectedShift('Matutino');
        }
        setIsModalOpen(true);
    };

    const handleTeacherToggle = (teacherId: string) => {
        setSelectedTeachers(prev => 
            prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
        );
    };

     const handleSubjectToggle = (subjectId: string) => {
        setSelectedSubjects(prev => 
            prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!className) return;

        if (editingClassId) {
            updateClass(editingClassId, className, selectedTeachers, selectedSubjects, selectedShift);
        } else {
            addClass(className, selectedTeachers, selectedSubjects, selectedShift);
        }
        setIsModalOpen(false);
    };

    // -- Migration Logic --
    useEffect(() => {
        if (migrationSourceId) {
            const sourceClass = classes.find(c => c.id === migrationSourceId);
            // Default select all students
            if (sourceClass) {
                setStudentsToMigrate(sourceClass.studentIds);
            }
        } else {
            setStudentsToMigrate([]);
        }
    }, [migrationSourceId, classes]);

    const handleMigrationToggleStudent = (studentId: string) => {
        setStudentsToMigrate(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleMigrationSubmit = () => {
        if (!migrationSourceId || !migrationTargetId || studentsToMigrate.length === 0) return;
        if (migrationSourceId === migrationTargetId) {
            alert("A turma de origem e destino não podem ser as mesmas.");
            return;
        }

        migrateStudents(studentsToMigrate, migrationTargetId);
        setIsMigrationModalOpen(false);
        setMigrationSourceId('');
        setMigrationTargetId('');
        setStudentsToMigrate([]);
        alert(`${studentsToMigrate.length} alunos migrados com sucesso!`);
    };

    return (
        <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                 <h1 className="text-3xl font-bold font-display text-white">Turmas</h1>
                 <div className="flex gap-2">
                     <button onClick={() => setIsMigrationModalOpen(true)} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                        </svg>
                        Migração de Ano
                     </button>
                     <button onClick={() => handleOpenModal()} className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl hover:bg-yellow-300 transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105">
                         + Nova Turma
                     </button>
                 </div>
            </div>
             <div className="glass-panel rounded-2xl overflow-hidden">
                 <div className="overflow-x-auto custom-scrollbar">
                     <table className="min-w-full">
                        <thead className="bg-black/20 sticky top-0 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Turma</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Turno</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Horário</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Professores</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Alunos</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-yellow-400 uppercase tracking-wider border-b border-white/5">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {classes.length > 0 ? classes.map(schoolClass => {
                                const classTeachers = schoolClass.teacherIds.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(', ');
                                return (
                                    <tr key={schoolClass.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white group-hover:text-yellow-400 transition-colors">{schoolClass.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{schoolClass.shift || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{schoolClass.schedule || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 max-w-xs truncate" title={classTeachers}>{classTeachers || 'Nenhum'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            <span className="bg-white/10 px-2 py-1 rounded text-xs font-bold text-white">{schoolClass.studentIds.length}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(schoolClass)} className="text-white hover:text-yellow-400 p-1 rounded hover:bg-white/10 transition-colors">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setItemToDelete({id: schoolClass.id, name: schoolClass.name})} className="text-white hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhuma turma cadastrada.</td>
                                </tr>
                            )}
                        </tbody>
                     </table>
                 </div>
            </div>

            {/* ADD/EDIT CLASS MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClassId ? "Editar Turma" : "Nova Turma"}>
                <form onSubmit={handleSubmit}>
                    <FormField label="Nome da Turma">
                        <TextInput type="text" value={className} onChange={e => setClassName(e.target.value)} required placeholder="Ex: Turma 201"/>
                    </FormField>
                    
                    <FormField label="Turno">
                        <SelectInput value={selectedShift} onChange={e => setSelectedShift(e.target.value as any)}>
                            <option value="Matutino" className="bg-gray-800">Matutino</option>
                            <option value="Vespertino" className="bg-gray-800">Vespertino</option>
                        </SelectInput>
                        <p className="text-xs text-gray-500 mt-1">
                            Horário Padrão: {selectedShift === 'Matutino' ? '07:30h às 11:30h' : '13:00h às 17:30h'}
                        </p>
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Professores">
                            <CheckboxGroup options={teachers} selected={selectedTeachers} onChange={handleTeacherToggle} />
                        </FormField>
                         <FormField label="Disciplinas">
                            <CheckboxGroup options={subjects} selected={selectedSubjects} onChange={handleSubjectToggle} />
                        </FormField>
                    </div>
                     <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-white/10">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold py-2 px-6 transition-colors">Cancelar</button>
                        <button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-8 rounded-xl hover:bg-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all">{editingClassId ? "Atualizar" : "Salvar"}</button>
                    </div>
                </form>
            </Modal>

            {/* MIGRATION MODAL */}
            <Modal isOpen={isMigrationModalOpen} onClose={() => setIsMigrationModalOpen(false)} title="Migração de Ano Letivo">
                <div className="space-y-6">
                    <p className="text-gray-400 text-sm">Selecione a turma atual e a turma de destino para mover os alunos em lote. Desmarque os alunos que não devem ser promovidos (ex: retidos).</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">De (Origem)</label>
                            <SelectInput value={migrationSourceId} onChange={e => setMigrationSourceId(e.target.value)}>
                                <option value="">Selecione a turma...</option>
                                {classes.map(c => <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>)}
                            </SelectInput>
                        </div>

                        <div className="flex justify-center md:hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                        </div>
                        <div className="hidden md:flex justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </div>

                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Para (Destino)</label>
                             <SelectInput value={migrationTargetId} onChange={e => setMigrationTargetId(e.target.value)}>
                                <option value="">Selecione a turma...</option>
                                {classes.map(c => <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>)}
                            </SelectInput>
                        </div>
                    </div>

                    {migrationSourceId && (
                        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                            <h4 className="text-white font-bold mb-3 text-sm">Alunos a Migrar ({studentsToMigrate.length})</h4>
                            <div className="max-h-60 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {classes.find(c => c.id === migrationSourceId)?.studentIds.map(sid => {
                                    const student = students.find(s => s.id === sid);
                                    if (!student) return null;
                                    return (
                                        <label key={sid} className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${studentsToMigrate.includes(sid) ? 'bg-green-900/30 border border-green-500/30' : 'bg-white/5 border border-transparent'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={studentsToMigrate.includes(sid)} 
                                                onChange={() => handleMigrationToggleStudent(sid)}
                                                className="rounded bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-500"
                                            />
                                            <span className={`text-sm ${studentsToMigrate.includes(sid) ? 'text-white' : 'text-gray-500'}`}>{student.name}</span>
                                        </label>
                                    );
                                })}
                                {(classes.find(c => c.id === migrationSourceId)?.studentIds.length === 0) && (
                                    <p className="text-gray-500 text-sm col-span-2 text-center py-4">Nenhum aluno nesta turma.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                        <button onClick={() => setIsMigrationModalOpen(false)} className="text-gray-400 hover:text-white font-bold py-2 px-6 transition-colors">Cancelar</button>
                        <button 
                            onClick={handleMigrationSubmit}
                            disabled={!migrationSourceId || !migrationTargetId || studentsToMigrate.length === 0}
                            className="bg-green-600 text-white font-bold py-2 px-8 rounded-xl hover:bg-green-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Confirmar Migração
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={() => itemToDelete && deleteClass(itemToDelete.id)}
                title="Excluir Turma"
                message={`Tem certeza que deseja excluir a turma "${itemToDelete?.name}"?`}
            />
        </div>
    );
};


const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentView, onNavigate }) => {
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [academicYear, setAcademicYear] = useState(2025);

    const handleNavigateWithData = (view: string, data?: any) => {
        if (view === 'Boletim' && data) {
            setSelectedStudentId(data);
        } else if (view === 'Histórico Escolar' && data) {
            setSelectedStudentId(data);
        } else if (view === 'Boletim' && !data) {
            setSelectedStudentId(null);
        }
        onNavigate(view);
    };

    const renderContent = () => {
        switch (currentView) {
            case 'Dashboard':
                return <DashboardContent onNavigate={onNavigate} />;
            case 'Alunos':
                return <StudentManagement onNavigate={handleNavigateWithData} />;
            case 'Boletim':
                return selectedStudentId ? (
                    <div className="animate-fade-in">
                        <button onClick={() => setSelectedStudentId(null)} className="flex items-center gap-2 text-yellow-400 font-bold hover:text-yellow-300 mb-6 transition-colors bg-white/5 py-2 px-4 rounded-lg w-fit">
                            <ArrowLeftIcon className="w-5 h-5" /> Voltar para lista
                        </button>
                        <ReportCard studentId={selectedStudentId} year={academicYear} />
                    </div>
                ) : <StudentManagement onNavigate={handleNavigateWithData} title="Boletim Escolar" hideAddButton={true} />;
            case 'Histórico Escolar':
                return (
                    <div className="animate-fade-in">
                        <SchoolTranscriptPage studentId={selectedStudentId || undefined} onBack={() => onNavigate('Alunos')} />
                    </div>
                );
            case 'Carteirinhas':
                return <BatchIdCardGenerator />;
            case 'Professores':
                return <TeacherManagement onNavigate={onNavigate} />;
            case 'Turmas':
                return <ClassManagement onNavigate={onNavigate}/>;
            case 'Disciplinas':
                return <SubjectManagement />;
            case 'Análise de Turma':
                return <ClassAnalysisPage />;
            case 'Lançamento de Notas':
                return <GradeEntryPage />;
            case 'Calendário':
                return <CalendarPage canEdit={true} />;
            case 'Financeiro':
                return <FinancialPage />;
            case 'Relatórios':
                return <ReportsPage />;
            case 'Análise Vocacional':
                return <VocationalAnalysisPage />;
            case 'Departamento de IA':
                return <AiDepartmentPage />;
            case 'Configurações':
                return <SettingsPage />;
            default:
                return <DashboardContent onNavigate={onNavigate} />;
        }
    };

    return (
        <div>
             <div className="flex justify-end mb-6">
                <div className="flex items-center gap-3 bg-white/5 py-2 px-4 rounded-xl border border-white/10 backdrop-blur-md">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ano Letivo</span>
                    <select 
                        value={academicYear}
                        onChange={(e) => setAcademicYear(Number(e.target.value))}
                        className="bg-transparent text-yellow-400 font-bold focus:outline-none cursor-pointer text-sm appearance-none pr-4 relative z-10"
                    >
                        <option value={2024} className="bg-gray-800">2024</option>
                        <option value={2025} className="bg-gray-800">2025</option>
                        <option value={2026} className="bg-gray-800">2026</option>
                    </select>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default AdminDashboard;
