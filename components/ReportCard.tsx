
import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentReportIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface ReportCardProps {
    studentId: string;
    year?: number;
}

// Dates must match GradeEntryPage constants for correct mapping
const BIMESTRE_DATES = [
    { id: '1', label: '1º Bim', date: '2025-04-30' },
    { id: '2', label: '2º Bim', date: '2025-07-31' },
    { id: '3', label: '3º Bim', date: '2025-09-30' },
    { id: '4', label: '4º Bim', date: '2025-12-20' },
];

const ReportCard: React.FC<ReportCardProps> = ({ studentId, year = 2025 }) => {
    const { students, classes, subjects, grades, attendance } = useData();

    const student = students.find(s => s.id === studentId);
    const studentClass = classes.find(c => c.id === student?.classId);

    // --- DATA CALCULATION ---
    const { reportData, overallAttendance } = useMemo(() => {
        if (!student || !studentClass) return { reportData: [], overallAttendance: 0 };

        // 1. Calculate Global Attendance
        const studentAttendanceRecords = attendance.filter(a => a.studentId === studentId);
        const totalDays = studentAttendanceRecords.length;
        const presentDays = studentAttendanceRecords.filter(a => a.present).length;
        const attendancePct = totalDays > 0 ? (presentDays / totalDays) * 100 : 100; // Default to 100% if no records

        // 2. Process Grades per Subject
        const classSubjects = subjects.filter(s => studentClass.subjectIds.includes(s.id));

        const data = classSubjects.map(subject => {
            const subjectGrades = grades.filter(g => g.studentId === studentId && g.subjectId === subject.id);
            
            // Map grades to Bimesters
            const bimesterGrades: Record<string, number | null> = {};
            let sum = 0;
            let count = 0;

            BIMESTRE_DATES.forEach(bim => {
                // Find grade matching the specific date key
                // We assume exact date match from GradeEntryPage
                const gradeEntry = subjectGrades.find(g => g.date.startsWith(bim.date));
                if (gradeEntry) {
                    bimesterGrades[bim.id] = gradeEntry.grade;
                    sum += gradeEntry.grade;
                    count++;
                } else {
                    bimesterGrades[bim.id] = null;
                }
            });

            const average = count > 0 ? sum / count : 0;
            const status = count === 0 ? 'Cursando' : (average >= 6.5 ? 'Aprovado' : 'Recuperação');

            return {
                subjectName: subject.name,
                b1: bimesterGrades['1'],
                b2: bimesterGrades['2'],
                b3: bimesterGrades['3'],
                b4: bimesterGrades['4'],
                average: average.toFixed(1),
                status
            };
        });

        return { reportData: data, overallAttendance: attendancePct };
    }, [student, studentClass, subjects, grades, attendance, studentId]);

    // --- PDF GENERATION ---
    const generatePDF = () => {
        if (!student || !studentClass) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0);
        doc.text("BOLETIM ESCOLAR", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.text("INSTITUTO SAMPAIO VIEGAS", 105, 26, { align: "center" });
        doc.text(`Ano Letivo: ${year}`, 105, 31, { align: "center" });

        // Student Info Box
        doc.setDrawColor(0);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(14, 38, 182, 25, 2, 2, 'F');
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Aluno:`, 18, 46);
        doc.setFont("helvetica", "normal");
        doc.text(student.name.toUpperCase(), 35, 46);

        doc.setFont("helvetica", "bold");
        doc.text(`Matrícula:`, 140, 46);
        doc.setFont("helvetica", "normal");
        doc.text(student.enrollmentId || "---", 160, 46);

        doc.setFont("helvetica", "bold");
        doc.text(`Turma:`, 18, 54);
        doc.setFont("helvetica", "normal");
        doc.text(studentClass.name, 35, 54);

        doc.setFont("helvetica", "bold");
        doc.text(`Frequência Global:`, 140, 54);
        doc.setFont("helvetica", "normal");
        doc.text(`${overallAttendance.toFixed(1)}%`, 175, 54);

        // Table
        const tableBody = reportData.map(row => [
            row.subjectName,
            row.b1 !== null ? row.b1.toFixed(1) : '-',
            row.b2 !== null ? row.b2.toFixed(1) : '-',
            row.b3 !== null ? row.b3.toFixed(1) : '-',
            row.b4 !== null ? row.b4.toFixed(1) : '-',
            row.average,
            row.status.toUpperCase()
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Disciplina', '1º Bim', '2º Bim', '3º Bim', '4º Bim', 'Média', 'Situação']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center', fontStyle: 'bold' },
                6: { halign: 'center', fontSize: 8 }
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            didParseCell: function(data) {
                // Color coding for Average column
                if (data.section === 'body' && data.column.index === 5) {
                    const val = parseFloat(data.cell.raw as string);
                    if (val < 6.5 && val > 0) {
                        data.cell.styles.textColor = [220, 53, 69]; // Red
                    } else if (val >= 6.5) {
                        data.cell.styles.textColor = [25, 135, 84]; // Green
                    }
                }
            }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Este documento não substitui o histórico escolar oficial.", 105, finalY + 10, { align: "center" });
        doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, finalY + 15, { align: "center" });

        doc.save(`Boletim_${student.name.replace(/\s+/g, '_')}.pdf`);
    };

    if (!student || !studentClass) return <div className="text-white p-4">Aluno ou Turma não encontrados.</div>;

    return (
        <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-5xl mx-auto overflow-hidden animate-fade-in-up">
            {/* Header Section */}
            <div className="bg-gray-100 p-8 border-b border-gray-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-bold font-display text-gray-900 tracking-tight">Boletim Escolar</h1>
                        <p className="text-gray-500 font-medium">Ano Letivo {year}</p>
                    </div>
                    <button 
                        onClick={generatePDF}
                        className="bg-black text-white hover:bg-gray-800 font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-3 transition-all transform hover:-translate-y-1"
                    >
                        <DocumentReportIcon className="w-5 h-5 text-yellow-400" />
                        Baixar PDF
                    </button>
                </div>

                {/* Student Info Card */}
                <div className="mt-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Aluno</p>
                        <p className="text-lg font-bold text-gray-900 truncate" title={student.name}>{student.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Matrícula</p>
                        <p className="text-lg font-bold text-gray-900">{student.enrollmentId || '---'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Turma</p>
                        <p className="text-lg font-bold text-gray-900">{studentClass.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Frequência Global</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${overallAttendance >= 75 ? 'bg-green-500' : 'bg-red-500'}`} 
                                    style={{ width: `${overallAttendance}%` }}
                                ></div>
                            </div>
                            <span className={`text-lg font-bold ${overallAttendance >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                                {overallAttendance.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grades Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider font-bold">
                            <th className="py-4 px-6 text-left w-1/4">Disciplina</th>
                            <th className="py-4 px-4 text-center">1º Bim</th>
                            <th className="py-4 px-4 text-center">2º Bim</th>
                            <th className="py-4 px-4 text-center">3º Bim</th>
                            <th className="py-4 px-4 text-center">4º Bim</th>
                            <th className="py-4 px-4 text-center bg-gray-100 border-l border-gray-200 text-gray-800">Média Final</th>
                            <th className="py-4 px-6 text-center">Situação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {reportData.map((row, index) => (
                            <tr key={index} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="py-4 px-6 font-bold text-gray-800 border-r border-gray-100 group-hover:text-blue-700">
                                    {row.subjectName}
                                </td>
                                
                                {/* Bimester Columns */}
                                {[row.b1, row.b2, row.b3, row.b4].map((grade, i) => (
                                    <td key={i} className="py-4 px-4 text-center">
                                        {grade !== null ? (
                                            <span className={`inline-block py-1 px-2.5 rounded-lg text-sm font-bold ${
                                                grade >= 6.5 ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-600'
                                            }`}>
                                                {grade.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-2xl leading-none">·</span>
                                        )}
                                    </td>
                                ))}

                                {/* Average Column */}
                                <td className="py-4 px-4 text-center bg-gray-50 border-l border-gray-200">
                                    <span className={`text-lg font-bold ${
                                        parseFloat(row.average) >= 6.5 ? 'text-blue-600' : 
                                        row.status === 'Cursando' ? 'text-gray-400' : 'text-red-600'
                                    }`}>
                                        {row.status === 'Cursando' && parseFloat(row.average) === 0 ? '-' : row.average}
                                    </span>
                                </td>

                                {/* Status Column */}
                                <td className="py-4 px-6 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                        row.status === 'Aprovado' ? 'bg-green-100 text-green-700 border-green-200' : 
                                        row.status === 'Recuperação' ? 'bg-red-100 text-red-700 border-red-200' : 
                                        'bg-gray-100 text-gray-500 border-gray-200'
                                    }`}>
                                        {row.status === 'Aprovado' && <CheckCircleIcon className="w-3 h-3" />}
                                        {row.status === 'Recuperação' && <XCircleIcon className="w-3 h-3" />}
                                        {row.status}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-50 p-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">Média para aprovação: <span className="font-bold text-gray-700">6,5</span> • Frequência mínima exigida: <span className="font-bold text-gray-700">75%</span></p>
            </div>
        </div>
    );
};

export default ReportCard;
