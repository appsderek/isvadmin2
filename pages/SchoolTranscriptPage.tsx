
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { Student } from '../types';
import { ArrowLeftIcon, ClipboardCheckIcon } from '../components/icons';

interface SchoolTranscriptPageProps {
    studentId?: string;
    onBack?: () => void;
}

const FIXED_SUBJECTS = [
    "Ciências Naturais",
    "Geografia",
    "História",
    "Língua Portuguesa",
    "Matemática"
];

const NUM_CUSTOM_ROWS = 8; // Number of editable blank rows

const YEARS = [
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"
];

const SCHOOL_HISTORY_ROWS = [
    "PRÉ I e PRÉ II",
    "1º Ano",
    "2º Ano",
    "3º Ano",
    "4º Ano",
    "5º Ano",
    "6º Ano",
    "7º Ano",
    "8º Ano",
    "9º Ano"
];

const SchoolTranscriptPage: React.FC<SchoolTranscriptPageProps> = ({ studentId, onBack }) => {
    const { students, parents, classes } = useData();
    const [selectedStudentId, setSelectedStudentId] = useState(studentId || '');
    
    // State for the document data
    const [headerData, setHeaderData] = useState({
        schoolName: "INSTITUTO SAMPAIO VIEGAS",
        authorization: "Autorização nº 0020211518964/2021",
        cnpj: "CNPJ 42.330.443/0001-90",
        address: "Rua Dirceu Guimarães, 6 - Jardim Morada - São Pedro da Aldeia - RJ - CEP 28.948-129 - Tel. (22)999794-1666",
        studentName: "",
        birthDate: "",
        birthCity: "",
        birthState: "",
        motherName: "",
        fatherName: "", // Optional in original but good to have
        year: "4º Ano",
        turn: "1º",
        academicYear: "2025",
        className: "400"
    });

    // Subject Rows State (Fixed + Custom)
    const [subjectRows, setSubjectRows] = useState<string[]>([
        ...FIXED_SUBJECTS,
        ...Array(NUM_CUSTOM_ROWS).fill("")
    ]);

    // Matrix: RowIndex -> Year -> { Grade, Hours }
    // Using RowIndex as key ensures data persists even if subject name changes
    const [gradesMatrix, setGradesMatrix] = useState<Record<number, Record<string, { grade: string, ch: string }>>>({});
    
    // Bottom Rows: Type -> Year -> Value
    const [bottomStats, setBottomStats] = useState<Record<string, Record<string, string>>>({
        days: {},
        freq: {},
        result: {},
        chTotal: {}
    });

    // Previous Schools: RowIndex -> { yearLabel, school, city, uf, obs }
    const [schoolTrajectory, setSchoolTrajectory] = useState<Record<number, { yearLabel: string, school: string, city: string, uf: string, obs: string }>>({});

    // Load Student Data
    useEffect(() => {
        if (selectedStudentId) {
            const student = students.find(s => s.id === selectedStudentId);
            const parent = parents.find(p => p.id === student?.parentId);
            const schoolClass = classes.find(c => c.id === student?.classId);

            if (student) {
                setHeaderData(prev => ({
                    ...prev,
                    studentName: student.name.toUpperCase(),
                    birthDate: student.birthDate ? new Date(student.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : '',
                    motherName: parent?.name.toUpperCase() || '',
                    className: schoolClass?.name || prev.className,
                    birthCity: student.cityOfBirth?.toUpperCase() || "BARBALHA", // Mock default from PDF
                    birthState: "CE" // Mock default
                }));
            }
        }
    }, [selectedStudentId, students, parents, classes]);

    // Update Subject Name (for custom rows)
    const updateSubjectName = (index: number, value: string) => {
        const newSubjects = [...subjectRows];
        newSubjects[index] = value;
        setSubjectRows(newSubjects);
    };

    // Initialize Matrix Helper
    const updateGrade = (rowIndex: number, yearIndex: number, field: 'grade' | 'ch', value: string) => {
        setGradesMatrix(prev => ({
            ...prev,
            [rowIndex]: {
                ...prev[rowIndex],
                [yearIndex]: {
                    ...prev[rowIndex]?.[yearIndex],
                    [field]: value
                }
            }
        }));
    };

    const updateBottomStat = (type: string, yearIndex: number, value: string) => {
        setBottomStats(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [yearIndex]: value
            }
        }));
    };

    const updateTrajectory = (index: number, field: string, value: string) => {
        setSchoolTrajectory(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                yearLabel: SCHOOL_HISTORY_ROWS[index], // Ensure label exists
                [field]: value
            }
        }));
    };

    const handlePrint = () => {
        const content = document.getElementById('transcript-container');
        if (!content) return;

        // Clone the content node to manipulate it without affecting the UI
        const clone = content.cloneNode(true) as HTMLElement;
        
        // Manually sync values from original inputs to cloned inputs
        // This is necessary because cloneNode does not copy the current value of inputs if changed by user
        const originalInputs = content.querySelectorAll('input, textarea');
        const clonedInputs = clone.querySelectorAll('input, textarea');
        
        originalInputs.forEach((input, index) => {
            const val = (input as HTMLInputElement).value;
            const cloned = clonedInputs[index] as HTMLInputElement;
            
            // Set value attribute explicitly so it renders in print
            cloned.setAttribute('value', val);
            if (cloned.tagName === 'TEXTAREA') {
                cloned.innerHTML = val;
            }
        });

        // Open a new window for printing
        const printWindow = window.open('', '', 'height=1000,width=1400');
        if (!printWindow) {
            alert('Pop-up bloqueado. Por favor, permita pop-ups para imprimir.');
            return;
        }

        printWindow.document.write('<html><head><title>Histórico Escolar</title>');
        // Inject Tailwind CDN for utility classes
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @page { size: A4 landscape; margin: 10mm; }
            body { 
                font-family: 'Arial', sans-serif; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                background: white; 
                color: black;
                margin: 0;
                padding: 0;
            }
            #transcript-container {
                width: 100% !important;
                max-width: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            input, textarea { 
                background: transparent !important; 
                border: none !important; 
                color: black !important;
                font-weight: inherit;
                text-transform: inherit;
            }
            /* Ensure table borders are visible and crisp */
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black !important; }
            /* Hide non-print elements if any sneaked in */
            .no-print { display: none; }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(clone.outerHTML);
        printWindow.document.write('</body></html>');
        
        printWindow.document.close();
        
        // Wait a moment for styles/scripts to load before printing
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            {/* CONTROLS */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                            <ArrowLeftIcon className="w-5 h-5" /> Voltar
                        </button>
                    )}
                    <h1 className="text-2xl font-bold font-display">Editor de Histórico Escolar</h1>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                    <select 
                        value={selectedStudentId} 
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm flex-1 md:flex-none text-white focus:ring-yellow-500 focus:border-yellow-500"
                    >
                        <option value="">Selecione o Aluno...</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={handlePrint} className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-xl hover:bg-yellow-300 flex items-center gap-2 shadow-lg transition-transform hover:scale-105">
                        <ClipboardCheckIcon className="w-5 h-5" />
                        Imprimir / PDF
                    </button>
                </div>
            </div>

            {/* DOCUMENT CONTAINER */}
            <div id="transcript-container" className="max-w-[297mm] mx-auto bg-white text-black p-[10mm] shadow-2xl overflow-x-auto rounded-sm">
                
                {/* HEADER */}
                <div className="text-center mb-4 border-b-2 border-black pb-2">
                    <div className="flex justify-center items-center gap-4 mb-2">
                        {/* Bee Logo SVG */}
                        <div className="w-20 h-20 flex-shrink-0">
                            <svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                                {/* Antennae */}
                                <path d="M70 30 Q 60 5 40 15" stroke="black" strokeWidth="12" strokeLinecap="round" />
                                <path d="M130 30 Q 140 5 160 15" stroke="black" strokeWidth="12" strokeLinecap="round" />
                                
                                {/* Head */}
                                <path d="M85 40 Q 100 20 115 40 L115 50 L85 50 Z" fill="black" />

                                {/* Hexagon S (Top Center) */}
                                <path d="M100 40 L130 55 V90 L100 105 L70 90 V55 Z" fill="#FFC107" stroke="black" strokeWidth="8" />
                                <text x="100" y="85" fontSize="35" fontWeight="bold" fill="black" textAnchor="middle" fontFamily="sans-serif">S</text>
                                
                                {/* Hexagon I (Left) */}
                                <path d="M65 95 L95 110 V145 L65 160 L35 145 V110 Z" fill="#FFC107" stroke="black" strokeWidth="8" transform="translate(-5, 0)" />
                                <text x="60" y="140" fontSize="35" fontWeight="bold" fill="black" textAnchor="middle" fontFamily="sans-serif">I</text>

                                {/* Hexagon V (Right) */}
                                <path d="M135 95 L165 110 V145 L135 160 L105 145 V110 Z" fill="#FFC107" stroke="black" strokeWidth="8" transform="translate(5, 0)" />
                                <text x="140" y="140" fontSize="35" fontWeight="bold" fill="black" textAnchor="middle" fontFamily="sans-serif">V</text>
                                
                                {/* Hexagon Bottom (Empty) */}
                                <path d="M100 150 L130 165 V200 L100 215 L70 200 V165 Z" fill="#FFC107" stroke="black" strokeWidth="8" />
                                
                                {/* Stinger */}
                                <path d="M100 215 L110 240 L90 240 Z" fill="black" />
                            </svg>
                        </div>

                        <div className="flex-1">
                            <input 
                                className="text-xl font-bold text-black text-center w-full uppercase border-none focus:bg-gray-100 outline-none bg-transparent" 
                                value={headerData.schoolName} 
                                onChange={e => setHeaderData({...headerData, schoolName: e.target.value})}
                            />
                            <input 
                                className="text-xs text-black text-center w-full block border-none focus:bg-gray-100 outline-none bg-transparent" 
                                value={headerData.authorization}
                                onChange={e => setHeaderData({...headerData, authorization: e.target.value})}
                            />
                            <input 
                                className="text-xs text-black text-center w-full block border-none focus:bg-gray-100 outline-none bg-transparent" 
                                value={headerData.cnpj}
                                onChange={e => setHeaderData({...headerData, cnpj: e.target.value})}
                            />
                        </div>
                    </div>
                    <input 
                        className="text-xs text-black text-center w-full border-none focus:bg-gray-100 outline-none bg-transparent" 
                        value={headerData.address}
                        onChange={e => setHeaderData({...headerData, address: e.target.value})}
                    />
                </div>

                {/* STUDENT INFO BOX */}
                <div className="border-2 border-black p-2 mb-2 text-sm leading-tight">
                    <div className="flex mb-1">
                        <span className="font-bold w-16">Nome:</span>
                        <input className="flex-1 uppercase text-black font-bold border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.studentName} onChange={e => setHeaderData({...headerData, studentName: e.target.value})} />
                    </div>
                    <div className="flex mb-1 gap-4">
                        <div className="flex flex-1">
                            <span className="font-bold w-16">Nasc.:</span>
                            <input className="flex-1 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.birthDate} onChange={e => setHeaderData({...headerData, birthDate: e.target.value})} />
                        </div>
                        <div className="flex flex-1">
                            <span className="font-bold mr-2">Naturalidade:</span>
                            <input className="flex-1 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.birthCity} onChange={e => setHeaderData({...headerData, birthCity: e.target.value})} />
                        </div>
                        <div className="flex w-32">
                            <span className="font-bold mr-2">Estado:</span>
                            <input className="flex-1 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.birthState} onChange={e => setHeaderData({...headerData, birthState: e.target.value})} />
                        </div>
                    </div>
                    <div className="flex mb-1">
                        <span className="font-bold w-16">Mãe:</span>
                        <input className="flex-1 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.motherName} onChange={e => setHeaderData({...headerData, motherName: e.target.value})} />
                    </div>
                    <div className="flex mb-1">
                        <span className="font-bold w-16">Pai:</span>
                        <input className="flex-1 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.fatherName} onChange={e => setHeaderData({...headerData, fatherName: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex">
                            <span className="font-bold mr-2">Ano:</span>
                            <input className="w-20 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.year} onChange={e => setHeaderData({...headerData, year: e.target.value})} />
                        </div>
                        <div className="flex">
                            <span className="font-bold mr-2">Turno:</span>
                            <input className="w-20 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.turn} onChange={e => setHeaderData({...headerData, turn: e.target.value})} />
                        </div>
                        <div className="flex">
                            <span className="font-bold mr-2">Ano Letivo:</span>
                            <input className="w-20 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.academicYear} onChange={e => setHeaderData({...headerData, academicYear: e.target.value})} />
                        </div>
                        <div className="flex">
                            <span className="font-bold mr-2">Turma:</span>
                            <input className="w-20 uppercase text-black border-b border-dotted border-gray-400 outline-none focus:bg-yellow-100 bg-transparent" value={headerData.className} onChange={e => setHeaderData({...headerData, className: e.target.value})} />
                        </div>
                    </div>
                </div>

                <h2 className="text-center font-bold border border-black bg-gray-200 py-1 mb-0 uppercase text-sm text-black">Histórico Escolar - Ensino Fundamental</h2>

                {/* MAIN TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-[10px] md:text-xs">
                        <thead>
                            <tr>
                                <th className="border border-black p-1 bg-gray-100 w-32 text-black" rowSpan={2}>Ensino Fundamental<br/>Disciplinas</th>
                                {YEARS.map((year, i) => (
                                    <th key={i} className="border border-black p-1 text-center bg-gray-100 text-black" colSpan={1}>{year}</th>
                                ))}
                            </tr>
                            <tr>
                                {YEARS.map((_, i) => (
                                    <React.Fragment key={i}>
                                        <th className="border border-black p-0.5 text-center w-10 text-black">Nota</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {subjectRows.map((subject, rowIdx) => (
                                <tr key={rowIdx}>
                                    <td className="border border-black p-1 font-medium text-black">
                                        {rowIdx < FIXED_SUBJECTS.length ? (
                                            subject
                                        ) : (
                                            <input 
                                                className="w-full h-full border-none outline-none focus:bg-yellow-100 bg-transparent text-black placeholder-gray-400"
                                                placeholder="Disciplina..."
                                                value={subject}
                                                onChange={(e) => updateSubjectName(rowIdx, e.target.value)}
                                            />
                                        )}
                                    </td>
                                    {YEARS.map((_, i) => (
                                        <React.Fragment key={i}>
                                            <td className="border border-black p-0">
                                                <input 
                                                    className="w-full h-full text-center border-none outline-none focus:bg-yellow-100 bg-transparent p-1 text-black" 
                                                    value={gradesMatrix[rowIdx]?.[i]?.grade || ''}
                                                    onChange={e => updateGrade(rowIdx, i, 'grade', e.target.value)}
                                                />
                                            </td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                            
                            {/* Empty Spacer Rows to match PDF visual */}
                            {[1,2].map(k => (
                                <tr key={`spacer-${k}`}>
                                    <td className="border border-black p-1 h-6"></td>
                                    {YEARS.map((_, i) => (
                                        <React.Fragment key={i}>
                                            <td className="border border-black p-0"></td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}

                            {/* Bottom Stats */}
                            <tr>
                                <td className="border border-black p-1 font-bold text-black">Dias Letivos</td>
                                {YEARS.map((_, i) => (
                                    <td key={i} className="border border-black p-0" colSpan={1}>
                                        <input className="w-full text-center outline-none focus:bg-yellow-100 bg-transparent text-black" value={bottomStats.days[i] || ''} onChange={e => updateBottomStat('days', i, e.target.value)} />
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="border border-black p-1 font-bold text-black">% Frequência</td>
                                {YEARS.map((_, i) => (
                                    <td key={i} className="border border-black p-0" colSpan={1}>
                                        <input className="w-full text-center outline-none focus:bg-yellow-100 bg-transparent text-black" value={bottomStats.freq[i] || ''} onChange={e => updateBottomStat('freq', i, e.target.value)} />
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="border border-black p-1 font-bold text-black">Resultado Final</td>
                                {YEARS.map((_, i) => (
                                    <td key={i} className="border border-black p-0" colSpan={1}>
                                        <input className="w-full text-center font-bold outline-none focus:bg-yellow-100 bg-transparent text-black" value={bottomStats.result[i] || ''} onChange={e => updateBottomStat('result', i, e.target.value)} />
                                    </td>
                                ))}
                            </tr>
                             <tr>
                                <td className="border border-black p-1 font-bold text-black">Carga Horária Total</td>
                                {YEARS.map((_, i) => (
                                    <td key={i} className="border border-black p-0" colSpan={1}>
                                        <input className="w-full text-center font-bold outline-none focus:bg-yellow-100 bg-transparent text-black" value={bottomStats.chTotal[i] || ''} onChange={e => updateBottomStat('chTotal', i, e.target.value)} />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* LEGEND */}
                <div className="text-[10px] font-bold text-center border border-t-0 border-black p-1 mb-2 bg-gray-100 text-black">
                    x=Sempre Presente CUR=Cursando APR=Aprovado REP=Reprovado TRA=Transferido ABA=Abandono
                </div>

                {/* SCHOOL HISTORY */}
                <table className="w-full border-collapse border border-black text-[10px] mb-4">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 w-24 text-black">Série / Ano</th>
                            <th className="border border-black p-1 text-black">Estabelecimento de Ensino</th>
                            <th className="border border-black p-1 w-32 text-black">Cidade</th>
                            <th className="border border-black p-1 w-10 text-black">UF</th>
                            <th className="border border-black p-1 w-48 text-black">Observação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SCHOOL_HISTORY_ROWS.map((label, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-1 font-bold bg-gray-50 text-black">{label}</td>
                                <td className="border border-black p-0"><input className="w-full p-1 outline-none focus:bg-yellow-100 bg-transparent text-black" value={schoolTrajectory[idx]?.school || ''} onChange={e => updateTrajectory(idx, 'school', e.target.value)} /></td>
                                <td className="border border-black p-0"><input className="w-full p-1 outline-none focus:bg-yellow-100 bg-transparent text-black" value={schoolTrajectory[idx]?.city || ''} onChange={e => updateTrajectory(idx, 'city', e.target.value)} /></td>
                                <td className="border border-black p-0"><input className="w-full p-1 outline-none focus:bg-yellow-100 bg-transparent text-center text-black" value={schoolTrajectory[idx]?.uf || ''} onChange={e => updateTrajectory(idx, 'uf', e.target.value)} /></td>
                                <td className="border border-black p-0"><input className="w-full p-1 outline-none focus:bg-yellow-100 bg-transparent text-black" value={schoolTrajectory[idx]?.obs || ''} onChange={e => updateTrajectory(idx, 'obs', e.target.value)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* FOOTER OBSERVATIONS */}
                <div className="border border-black p-2 text-xs mb-8 min-h-[60px]">
                    <span className="font-bold text-black">Observações:</span>
                    <textarea className="w-full h-12 border-none outline-none resize-none focus:bg-yellow-100 bg-transparent ml-2 text-black" defaultValue="No CEDM média > ou = a 6,5 (seis e meio). O aluno deverá ser matriculado no 4º ano do Ensino Fundamental. Segue anexo, Ficha Individual." />
                </div>

                {/* SIGNATURES */}
                <div className="flex justify-between items-end px-8 mt-12 mb-4 text-black">
                    <div className="text-center w-64">
                        <div className="border-b border-black mb-1"></div>
                        <p className="font-bold text-xs">Secretário</p>
                    </div>
                    <div className="text-right text-xs mb-4">
                        São Pedro da Aldeia, {new Date().toLocaleDateString('pt-BR', {day: 'numeric', month: 'long', year: 'numeric'})}.
                    </div>
                    <div className="text-center w-64">
                        <div className="border-b border-black mb-1"></div>
                        <p className="font-bold text-xs">Diretor</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SchoolTranscriptPage;
