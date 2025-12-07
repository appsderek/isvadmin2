
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { TransactionType } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { XIcon } from '../components/icons';

type ReportTab = 'academic' | 'financial' | 'management' | 'attendance';

// Utility to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
    const today = new Date();
    // Use 'fr-CA' to ensure YYYY-MM-DD in local time
    return today.toLocaleDateString('fr-CA');
};

// Utility to get date string from 30 days ago
const get30DaysAgoDateString = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toLocaleDateString('fr-CA');
};

// Helper Component for Multi-Select
const MultiSelectDropdown: React.FC<{
    label: string;
    options: { id: string; name: string }[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}> = ({ label, options, selectedIds, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(sid => sid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const toggleAll = () => {
        if (selectedIds.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(o => o.id));
        }
    };

    return (
        <div className="relative w-full md:w-auto min-w-[200px]">
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md text-white px-4 py-2 text-left focus:ring-2 focus:ring-yellow-500 focus:outline-none flex justify-between items-center"
            >
                <span className="truncate">
                    {selectedIds.length === 0
                        ? 'Todos os Alunos'
                        : selectedIds.length === options.length
                        ? 'Todos Selecionados'
                        : `${selectedIds.length} Aluno(s)`}
                </span>
                <span className="ml-2 text-xs">▼</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-20 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-xl max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-800">
                            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-1 rounded">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === options.length && options.length > 0}
                                    onChange={toggleAll}
                                    className="rounded border-gray-500 bg-gray-600 text-yellow-500 focus:ring-yellow-600"
                                />
                                <span className="text-sm text-yellow-400 font-bold">Selecionar Todos</span>
                            </label>
                        </div>
                        <div className="p-2 space-y-1">
                            {options.map(option => (
                                <label key={option.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(option.id)}
                                        onChange={() => toggleOption(option.id)}
                                        className="rounded border-gray-500 bg-gray-600 text-yellow-500 focus:ring-yellow-600"
                                    />
                                    <span className="text-sm text-gray-200">{option.name}</span>
                                </label>
                            ))}
                            {options.length === 0 && <p className="text-xs text-gray-500 p-2">Nenhum aluno nesta turma.</p>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const ReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReportTab>('academic');
    
    const { students, classes, grades, attendance, transactions, teachers, subjects } = useData();
    
    // State for filters
    const [academicFilters, setAcademicFilters] = useState({
        classId: classes[0]?.id || '',
        startDate: get30DaysAgoDateString(),
        endDate: getTodayDateString(),
        selectedStudentIds: [] as string[]
    });
    
    const [financialFilters, setFinancialFilters] = useState({
        startDate: get30DaysAgoDateString(),
        endDate: getTodayDateString()
    });

    const [attendanceFilters, setAttendanceFilters] = useState({
        classId: '', // Default to '' for "All Classes"
        startDate: get30DaysAgoDateString(),
        endDate: getTodayDateString(),
        selectedStudentIds: [] as string[]
    });

    // Helper to get students for a selected class (for the dropdown)
    const getStudentsForClass = (classId: string) => {
        if (!classId) return [];
        const schoolClass = classes.find(c => c.id === classId);
        if (!schoolClass) return [];
        return students.filter(s => schoolClass.studentIds.includes(s.id));
    };
    
    const handleAcademicFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAcademicFilters(prev => {
            const newState = { ...prev, [name]: value };
            // Reset selected students if class changes
            if (name === 'classId') {
                newState.selectedStudentIds = [];
            }
            return newState;
        });
    };

    const handleAcademicStudentsChange = (ids: string[]) => {
        setAcademicFilters(prev => ({ ...prev, selectedStudentIds: ids }));
    };

    const handleFinancialFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFinancialFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAttendanceFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setAttendanceFilters(prev => {
            const newState = { ...prev, [name]: value };
            // Reset selected students if class changes
            if (name === 'classId') {
                newState.selectedStudentIds = [];
            }
            return newState;
        });
    };

    const handleAttendanceStudentsChange = (ids: string[]) => {
        setAttendanceFilters(prev => ({ ...prev, selectedStudentIds: ids }));
    };

    // --- DATA CALCULATION ---

    const academicReportData = useMemo(() => {
        if (!academicFilters.classId) return [];
        
        const selectedClass = classes.find(c => c.id === academicFilters.classId);
        if (!selectedClass) return [];

        // Filter students: Use selection or All if selection is empty
        let targetStudentIds = selectedClass.studentIds;
        if (academicFilters.selectedStudentIds.length > 0) {
            targetStudentIds = targetStudentIds.filter(id => academicFilters.selectedStudentIds.includes(id));
        }
        
        return targetStudentIds.map(studentId => {
            const student = students.find(s => s.id === studentId);
            if (!student) return null;
            
            const studentGrades = grades.filter(g => g.studentId === studentId && new Date(g.date) >= new Date(academicFilters.startDate) && new Date(g.date) <= new Date(academicFilters.endDate));
            const studentAttendance = attendance.filter(a => a.studentId === studentId && new Date(a.date) >= new Date(academicFilters.startDate) && new Date(a.date) <= new Date(academicFilters.endDate));
            
            const avgGrade = studentGrades.length ? (studentGrades.reduce((acc, g) => acc + g.grade, 0) / studentGrades.length) : 0;
            const attendancePercentage = studentAttendance.length ? (studentAttendance.filter(a => a.present).length / studentAttendance.length) * 100 : 0;

            return {
                id: student.id,
                name: student.name,
                avgGrade: avgGrade.toFixed(1),
                attendancePercentage: Math.round(attendancePercentage)
            };
        }).filter(Boolean);
    }, [academicFilters, students, classes, grades, attendance]);

    const financialReportData = useMemo(() => {
        const filteredTransactions = transactions.filter(t => new Date(t.date) >= new Date(financialFilters.startDate) && new Date(t.date) <= new Date(financialFilters.endDate));
        
        const income = filteredTransactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0);
        
        const expenseByCategory = filteredTransactions
            .filter(t => t.type === TransactionType.Expense)
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);
            
        return {
            transactions: filteredTransactions,
            income,
            expense,
            balance: income - expense,
            expenseByCategory
        };
    }, [financialFilters, transactions]);

    const managementReportData = useMemo(() => {
        const studentsByClass = classes.map(c => ({
            id: c.id,
            name: c.name,
            studentCount: c.studentIds.length,
        }));
        
        const teachersBySubject = subjects.map(s => ({
            id: s.id,
            name: s.name,
            teachers: teachers.filter(t => t.subjectIds.includes(s.id)).map(t => t.name)
        }));

        return { studentsByClass, teachersBySubject };
    }, [classes, subjects, teachers]);

    const attendanceReportData = useMemo(() => {
        const start = new Date(attendanceFilters.startDate);
        const end = new Date(attendanceFilters.endDate);

        if (!attendanceFilters.classId) {
            // MODE: ALL CLASSES SUMMARY
            const classStats = classes.map(c => {
                 const classRecs = attendance.filter(a => {
                     const d = new Date(a.date);
                     return d >= start && d <= end && c.studentIds.includes(a.studentId);
                 });
                 
                 const total = classRecs.length;
                 const present = classRecs.filter(a => a.present).length;
                 const percentage = total > 0 ? (present / total) * 100 : 0;

                 return {
                     id: c.id,
                     name: c.name,
                     studentCount: c.studentIds.length,
                     percentage
                 };
            });

            const totalAvg = classStats.reduce((acc, c) => acc + c.percentage, 0) / (classStats.length || 1);

            return {
                mode: 'all',
                summary: { average: totalAvg, totalRecordedEvents: 0 },
                classes: classStats,
                details: [] 
            };
        } else {
            // MODE: SINGLE CLASS DETAILS
            const selectedClass = classes.find(c => c.id === attendanceFilters.classId);
            if (!selectedClass) return { mode: 'single', summary: { average: 0, totalRecordedEvents: 0 }, details: [], classes: [] };

            // Filter students based on multi-select
            let targetStudentIds = selectedClass.studentIds;
            if (attendanceFilters.selectedStudentIds.length > 0) {
                targetStudentIds = targetStudentIds.filter(id => attendanceFilters.selectedStudentIds.includes(id));
            }

            const relevantAttendance = attendance.filter(a => {
                const d = new Date(a.date);
                return d >= start && d <= end && targetStudentIds.includes(a.studentId);
            });

            const details = targetStudentIds.map(studentId => {
                const student = students.find(s => s.id === studentId);
                if (!student) return null;

                const studentRecords = relevantAttendance.filter(a => a.studentId === studentId);
                const totalRecordedDays = studentRecords.length;
                const presentCount = studentRecords.filter(a => a.present).length;
                const absentCount = totalRecordedDays - presentCount;
                
                const percentage = totalRecordedDays > 0 ? (presentCount / totalRecordedDays) * 100 : 0;

                return {
                    id: student.id,
                    name: student.name,
                    present: presentCount,
                    absent: absentCount,
                    total: totalRecordedDays,
                    percentage: percentage
                };
            })
            .filter((item): item is NonNullable<typeof item> => !!item)
            .sort((a, b) => a.name.localeCompare(b.name));

            const totalPercentageSum = details.reduce((acc, curr) => acc + (curr?.percentage || 0), 0);
            const classAverage = details.length > 0 ? totalPercentageSum / details.length : 0;

            return {
                mode: 'single',
                summary: { average: classAverage, totalRecordedEvents: relevantAttendance.length },
                details,
                classes: []
            };
        }
    }, [attendanceFilters, attendance, classes, students]);
    
    // --- CHART & EXPORT LOGIC ---

    const COLORS = ['#FFC107', '#FF9800', '#FF5722', '#F44336', '#E91E63', '#9C27B0'];

    const renderPieChart = (data: Record<string, number>) => {
        const total = Object.values(data).reduce((sum, value) => sum + value, 0);
        if (total === 0) return <div className="text-gray-400">Sem dados de despesas.</div>;

        let cumulativePercent = 0;
        const gradients = Object.entries(data).map(([key, value], index) => {
            const percent = (value / total) * 100;
            const color = COLORS[index % COLORS.length];
            const startAngle = cumulativePercent;
            cumulativePercent += percent;
            const endAngle = cumulativePercent;
            return `${color} ${startAngle}% ${endAngle}%`;
        });
        
        return (
            <div className="flex items-center gap-6">
                 <div className="w-40 h-40 rounded-full" style={{ background: `conic-gradient(${gradients.join(', ')})` }}></div>
                 <div className="space-y-2">
                    {Object.entries(data).map(([key, value], index) => (
                        <div key={key} className="flex items-center">
                            <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-white">{key}: R$ {value.toFixed(2)} ({(value/total * 100).toFixed(1)}%)</span>
                        </div>
                    ))}
                 </div>
            </div>
        );
    };

    const downloadAcademicPDF = () => {
        const doc = new jsPDF();
        
        const className = classes.find(c => c.id === academicFilters.classId)?.name || 'Turma Desconhecida';
        const start = new Date(academicFilters.startDate).toLocaleDateString('pt-BR');
        const end = new Date(academicFilters.endDate).toLocaleDateString('pt-BR');
        const studentCount = academicReportData.length;

        doc.setFontSize(18);
        doc.text("Relatório de Desempenho Acadêmico", 14, 20);
        
        doc.setFontSize(12);
        doc.text(`Turma: ${className}`, 14, 30);
        doc.text(`Período: ${start} até ${end}`, 14, 36);
        doc.text(`Alunos Listados: ${studentCount}`, 14, 42);

        const tableColumn = ["Aluno", "Média de Notas", "Frequência (%)"];
        const tableRows: any[] = [];

        academicReportData.forEach(student => {
            if (!student) return;
            const rowData = [
                student.name,
                student.avgGrade,
                `${student.attendancePercentage}%`
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [234, 179, 8], textColor: 0 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        doc.save(`Academico_${className.replace(/\s+/g, '_')}.pdf`);
    };

    const downloadAttendancePDF = () => {
        const doc = new jsPDF();
        const start = new Date(attendanceFilters.startDate).toLocaleDateString('pt-BR');
        const end = new Date(attendanceFilters.endDate).toLocaleDateString('pt-BR');
        
        doc.setFontSize(18);
        
        if (attendanceReportData.mode === 'all') {
             // ALL CLASSES PDF
            doc.text("Resumo Geral de Frequência por Turma", 14, 20);
            doc.setFontSize(12);
            doc.text(`Período: ${start} até ${end}`, 14, 30);
            doc.text(`Média Geral da Escola: ${attendanceReportData.summary.average.toFixed(1)}%`, 14, 36);

            const tableColumn = ["Turma", "Qtd Alunos", "% Frequência"];
            const tableRows: any[] = [];
            
            attendanceReportData.classes?.forEach(c => {
                tableRows.push([c.name, c.studentCount, `${c.percentage.toFixed(1)}%`]);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                headStyles: { fillColor: [234, 179, 8], textColor: 0 },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
            doc.save(`Frequencia_Geral_${start}.pdf`);

        } else {
            // SINGLE CLASS PDF
            const className = classes.find(c => c.id === attendanceFilters.classId)?.name || 'Turma Desconhecida';
            const studentCount = attendanceReportData.details.length;

            doc.text("Relatório de Frequência Escolar", 14, 20);
            doc.setFontSize(12);
            doc.text(`Turma: ${className}`, 14, 30);
            doc.text(`Período: ${start} até ${end}`, 14, 36);
            doc.text(`Alunos Listados: ${studentCount}`, 14, 42);
            doc.text(`Média do Grupo: ${attendanceReportData.summary.average.toFixed(1)}%`, 14, 48);

            const tableColumn = ["Aluno", "Presenças", "Faltas", "Total Aulas", "% Frequência"];
            const tableRows: any[] = [];

            attendanceReportData.details?.forEach(student => {
                if (!student) return;
                const rowData = [
                    student.name,
                    student.present,
                    student.absent,
                    student.total,
                    `${student.percentage.toFixed(1)}%`
                ];
                tableRows.push(rowData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 55,
                theme: 'grid',
                headStyles: { fillColor: [234, 179, 8], textColor: 0 },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            doc.save(`Frequencia_${className.replace(/\s+/g, '_')}_${start}.pdf`);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'academic':
                return (
                    <div>
                        <div className="bg-gray-800 p-4 rounded-lg mb-6 flex flex-col md:flex-row items-end gap-4">
                            <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Turma</label>
                                <select name="classId" value={academicFilters.classId} onChange={handleAcademicFilterChange} className="w-full bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500">
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <MultiSelectDropdown 
                                label="Filtrar Alunos"
                                options={getStudentsForClass(academicFilters.classId)}
                                selectedIds={academicFilters.selectedStudentIds}
                                onChange={handleAcademicStudentsChange}
                            />
                             <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data Início</label>
                                <input type="date" name="startDate" value={academicFilters.startDate} onChange={handleAcademicFilterChange} className="w-full bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                             <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data Fim</label>
                                <input type="date" name="endDate" value={academicFilters.endDate} onChange={handleAcademicFilterChange} className="w-full bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                            <button 
                                onClick={downloadAcademicPDF}
                                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                PDF
                            </button>
                        </div>
                        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                           <table className="min-w-full">
                               <thead className="bg-gray-700">
                                   <tr>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Aluno</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Média de Notas</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Frequência</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-gray-800 divide-y divide-gray-700">
                                   {academicReportData.map(data => (
                                       <tr key={data?.id}>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{data?.name}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{data?.avgGrade}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                               <div className="flex items-center">
                                                    <div className="w-full bg-gray-600 rounded-full h-2.5">
                                                        <div className="bg-yellow-400 h-2.5 rounded-full" style={{ width: `${data?.attendancePercentage}%` }}></div>
                                                    </div>
                                                    <span className="ml-3 font-semibold">{data?.attendancePercentage}%</span>
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                                    {academicReportData.length === 0 && (
                                       <tr>
                                           <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                               Nenhum registro encontrado com os filtros atuais.
                                           </td>
                                       </tr>
                                   )}
                               </tbody>
                           </table>
                        </div>
                    </div>
                );
            case 'financial':
                 return (
                    <div>
                         <div className="bg-gray-800 p-4 rounded-lg mb-6 flex items-center gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data Início</label>
                                <input type="date" name="startDate" value={financialFilters.startDate} onChange={handleFinancialFilterChange} className="bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data Fim</label>
                                <input type="date" name="endDate" value={financialFilters.endDate} onChange={handleFinancialFilterChange} className="bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-lg text-green-400">Total de Entradas</h3><p className="text-2xl font-bold text-white">R$ {financialReportData.income.toFixed(2)}</p></div>
                            <div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-lg text-red-400">Total de Saídas</h3><p className="text-2xl font-bold text-white">R$ {financialReportData.expense.toFixed(2)}</p></div>
                            <div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-lg text-yellow-400">Saldo</h3><p className="text-2xl font-bold text-white">R$ {financialReportData.balance.toFixed(2)}</p></div>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg mb-6">
                            <h3 className="text-xl font-bold text-white mb-4">Análise de Gastos por Categoria</h3>
                            {renderPieChart(financialReportData.expenseByCategory)}
                        </div>
                         <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                           <table className="min-w-full">
                               <thead className="bg-gray-700">
                                   <tr>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Data</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Descrição</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Categoria</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Valor</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-gray-800 divide-y divide-gray-700">
                                   {financialReportData.transactions.map(t => (
                                       <tr key={t.id}>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{t.description}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{t.category}</td>
                                           <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${t.type === TransactionType.Income ? 'text-green-400' : 'text-red-400'}`}>
                                               {t.type === TransactionType.Expense && '-'} R$ {t.amount.toFixed(2)}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                    </div>
                );
            case 'management':
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold text-yellow-400 mb-4">Alunos por Turma</h3>
                            <ul className="space-y-2">
                                {managementReportData.studentsByClass.map(c => (
                                    <li key={c.id} className="flex justify-between text-white p-2 bg-gray-700 rounded">
                                        <span>{c.name}</span>
                                        <span className="font-bold">{c.studentCount} alunos</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold text-yellow-400 mb-4">Professores por Disciplina</h3>
                            <ul className="space-y-3">
                                {managementReportData.teachersBySubject.map(s => (
                                    <li key={s.id} className="text-white">
                                        <p className="font-bold">{s.name}</p>
                                        <p className="text-sm text-gray-400">{s.teachers.join(', ') || 'Nenhum professor alocado'}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'attendance':
                return (
                    <div>
                         <div className="bg-gray-800 p-4 rounded-lg mb-6 flex flex-col md:flex-row items-end gap-4">
                             <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Turma</label>
                                <select name="classId" value={attendanceFilters.classId} onChange={handleAttendanceFilterChange} className="w-full bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500">
                                    <option value="">Todas as Turmas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            
                            {/* Hide Student filter if All Classes selected */}
                            {attendanceFilters.classId && (
                                <MultiSelectDropdown 
                                    label="Filtrar Alunos"
                                    options={getStudentsForClass(attendanceFilters.classId)}
                                    selectedIds={attendanceFilters.selectedStudentIds}
                                    onChange={handleAttendanceStudentsChange}
                                />
                            )}
                            
                             <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data Início</label>
                                <input type="date" name="startDate" value={attendanceFilters.startDate} onChange={handleAttendanceFilterChange} className="w-full bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                             <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Data Fim</label>
                                <input type="date" name="endDate" value={attendanceFilters.endDate} onChange={handleAttendanceFilterChange} className="w-full bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" />
                            </div>
                            <button 
                                onClick={downloadAttendancePDF}
                                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                PDF
                            </button>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-gray-800 p-6 rounded-lg mb-6 flex items-center justify-between border-l-4 border-yellow-400">
                             <div>
                                 <h3 className="text-xl font-bold text-white">
                                     {attendanceReportData.mode === 'all' ? 'Média Geral da Escola' : 'Média do Grupo'}
                                 </h3>
                                 <p className="text-gray-400 text-sm">Baseado no período selecionado</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-4xl font-bold text-yellow-400">{attendanceReportData.summary.average.toFixed(1)}%</p>
                             </div>
                        </div>

                        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                           <table className="min-w-full">
                               <thead className="bg-gray-700">
                                   <tr>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">
                                           {attendanceReportData.mode === 'all' ? 'Turma' : 'Aluno'}
                                       </th>
                                       {attendanceReportData.mode === 'all' ? (
                                           <>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider">Qtd Alunos</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider">Frequência Média</th>
                                           </>
                                       ) : (
                                           <>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider">Presenças</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider">Faltas</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider">Total Aulas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">% Frequência</th>
                                           </>
                                       )}
                                   </tr>
                               </thead>
                               <tbody className="bg-gray-800 divide-y divide-gray-700">
                                   {/* ALL CLASSES TABLE */}
                                   {attendanceReportData.mode === 'all' && attendanceReportData.classes && attendanceReportData.classes.map(cls => (
                                        <tr key={cls.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{cls.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-300">{cls.studentCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-white">
                                                <div className="flex items-center justify-center">
                                                    <div className="w-full bg-gray-600 rounded-full h-2.5 mr-2 max-w-[100px]">
                                                        <div 
                                                            className={`h-2.5 rounded-full ${cls.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`} 
                                                            style={{ width: `${cls.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="font-bold">{cls.percentage.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                   ))}

                                   {/* SINGLE CLASS TABLE */}
                                   {attendanceReportData.mode === 'single' && attendanceReportData.details && attendanceReportData.details.map((student) => (
                                       <tr key={student?.id}>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{student?.name}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-400 font-bold">{student?.present}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-400 font-bold">{student?.absent}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-300">{student?.total}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                               <div className="flex items-center">
                                                    <div className="w-full bg-gray-600 rounded-full h-2.5 mr-2 max-w-[100px]">
                                                        <div 
                                                            className={`h-2.5 rounded-full ${
                                                                (student?.percentage || 0) >= 75 ? 'bg-green-500' : 
                                                                (student?.percentage || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`} 
                                                            style={{ width: `${student?.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="font-bold">{(student?.percentage || 0).toFixed(1)}%</span>
                                               </div>
                                           </td>
                                       </tr>
                                   ))}
                                   
                                   {/* EMPTY STATE */}
                                   {((attendanceReportData.mode === 'single' && (!attendanceReportData.details || attendanceReportData.details.length === 0)) ||
                                     (attendanceReportData.mode === 'all' && (!attendanceReportData.classes || attendanceReportData.classes.length === 0))) && (
                                       <tr>
                                           <td colSpan={attendanceReportData.mode === 'all' ? 3 : 5} className="px-6 py-8 text-center text-gray-400">
                                               Nenhum registro de frequência encontrado para este período.
                                           </td>
                                       </tr>
                                   )}
                               </tbody>
                           </table>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold font-display text-white mb-6">Relatórios Avançados</h1>
            
            <div className="mb-6 border-b border-gray-700 overflow-x-auto">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('academic')} className={`${activeTab === 'academic' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Desempenho Acadêmico</button>
                    <button onClick={() => setActiveTab('attendance')} className={`${activeTab === 'attendance' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Resumo de Frequência</button>
                    <button onClick={() => setActiveTab('financial')} className={`${activeTab === 'financial' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Financeiro</button>
                    <button onClick={() => setActiveTab('management')} className={`${activeTab === 'management' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Gerenciamento</button>
                </nav>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default ReportsPage;
