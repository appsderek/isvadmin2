
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { PresentationChartBarIcon, BookOpenIcon, UsersIcon } from '../components/icons';

// Exclude early childhood classes as they don't have grades
const NON_GRADED_CLASSES = [
    'CRECHE III', 
    'CRECHE IV', 
    'PRÉ I MANHÃ', 
    'PRÉ I TARDE', 
    'PRÉ II MANHÃ', 
    'PRÉ II TARDE'
];

// Subjects excluded from analysis charts
const EXCLUDED_SUBJECTS = ['Artes', 'Inglês', 'Educação Física'];

const ClassAnalysisPage: React.FC = () => {
    const { classes, students, grades, subjects } = useData();
    
    // Filter eligible classes
    const eligibleClasses = useMemo(() => classes.filter(c => !NON_GRADED_CLASSES.includes(c.name.toUpperCase())), [classes]);
    
    const [selectedClassId, setSelectedClassId] = useState(eligibleClasses[0]?.id || '');
    const [selectedStudentId, setSelectedStudentId] = useState(''); // For drill-down

    // Auto-select first class
    useEffect(() => {
        if (!selectedClassId && eligibleClasses.length > 0) {
            setSelectedClassId(eligibleClasses[0].id);
        }
    }, [eligibleClasses, selectedClassId]);

    // --- DATA CALCULATIONS ---

    const analysisData = useMemo(() => {
        if (!selectedClassId) return null;

        const currentClass = classes.find(c => c.id === selectedClassId);
        if (!currentClass) return null;

        const classStudentIds = currentClass.studentIds;

        // Filter Subject Objects first
        const relevantSubjects = subjects.filter(s => 
            currentClass.subjectIds.includes(s.id) && 
            !EXCLUDED_SUBJECTS.includes(s.name)
        );
        const relevantSubjectIds = relevantSubjects.map(s => s.id);

        // Filter Grades to only include relevant subjects
        const relevantGrades = grades.filter(g => 
            classStudentIds.includes(g.studentId) && 
            relevantSubjectIds.includes(g.subjectId)
        );

        // 1. Overall Average (Based only on relevant subjects)
        const totalGradesSum = relevantGrades.reduce((sum, g) => sum + g.grade, 0);
        const overallAverage = relevantGrades.length > 0 ? totalGradesSum / relevantGrades.length : 0;

        // 2. Average by Subject (Comparison Data)
        const subjectComparisonData = relevantSubjects.map(subj => {
                const subjGrades = relevantGrades.filter(g => g.subjectId === subj.id);
                const classAvg = subjGrades.length > 0 ? subjGrades.reduce((sum, g) => sum + g.grade, 0) / subjGrades.length : 0;
                
                // Global average for this subject (filtered by eligible classes/students)
                const allEligibleStudentIds = classes
                    .filter(c => !NON_GRADED_CLASSES.includes(c.name.toUpperCase()))
                    .flatMap(c => c.studentIds);
                
                const allGrades = grades.filter(g => 
                    allEligibleStudentIds.includes(g.studentId) && 
                    g.subjectId === subj.id
                );
                
                const globalAvg = allGrades.length > 0 ? allGrades.reduce((sum, g) => sum + g.grade, 0) / allGrades.length : 0;

                return { 
                    name: subj.name, 
                    Turma: parseFloat(classAvg.toFixed(1)), 
                    Escola: parseFloat(globalAvg.toFixed(1)) 
                };
            }).sort((a, b) => b.Turma - a.Turma);

        // 3. Grade Distribution (Updated thresholds)
        let dist = { A: 0, B: 0, C: 0, D: 0 };
        relevantGrades.forEach(g => {
            if (g.grade >= 9) dist.A++;
            else if (g.grade >= 7.5) dist.B++;
            else if (g.grade >= 6.5) dist.C++; // Pass
            else dist.D++; // Below 6.5 is Fail/Insufficient
        });
        const totalGrades = relevantGrades.length || 1;
        const distributionData = [
            { name: 'Excelente (9-10)', value: dist.A, percent: (dist.A / totalGrades) * 100, color: '#10B981' }, // Green
            { name: 'Bom (7.5-8.9)', value: dist.B, percent: (dist.B / totalGrades) * 100, color: '#3B82F6' }, // Blue
            { name: 'Regular (6.5-7.4)', value: dist.C, percent: (dist.C / totalGrades) * 100, color: '#F59E0B' }, // Amber
            { name: 'Insuficiente (<6.5)', value: dist.D, percent: (dist.D / totalGrades) * 100, color: '#EF4444' }, // Red
        ];

        // 4. Ranking of Students (All Students List)
        const studentRanking = classStudentIds.map(sid => {
            const student = students.find(s => s.id === sid);
            // Calculate average only based on relevant subjects
            const sGrades = relevantGrades.filter(g => g.studentId === sid);
            const avg = sGrades.length > 0 ? sGrades.reduce((a, b) => a + b.grade, 0) / sGrades.length : 0;
            return { id: sid, name: student?.name || 'Unknown', media: parseFloat(avg.toFixed(1)) };
        }).sort((a, b) => b.media - a.media);

        // 5. Inter-class Ranking
        const classRankingData = eligibleClasses.map(cls => {
            // Filter grades for this class to only relevant subjects as well for fair comparison
            // (Assuming exclusion applies globally to the school logic)
            const clsRelevantGrades = grades.filter(g => 
                cls.studentIds.includes(g.studentId) && 
                relevantSubjectIds.includes(g.subjectId)
            );
            const avg = clsRelevantGrades.length > 0 ? clsRelevantGrades.reduce((a, b) => a + b.grade, 0) / clsRelevantGrades.length : 0;
            return { name: cls.name, media: parseFloat(avg.toFixed(1)) };
        }).sort((a, b) => b.media - a.media);

        // Stats
        const bestSubject = subjectComparisonData.length > 0 ? subjectComparisonData[0] : null;
        const worstSubject = subjectComparisonData.length > 0 ? subjectComparisonData[subjectComparisonData.length - 1] : null;

        return {
            currentClass,
            overallAverage,
            subjectComparisonData,
            distributionData,
            studentRanking,
            classRankingData,
            bestSubject,
            worstSubject,
            relevantSubjects
        };

    }, [selectedClassId, classes, grades, subjects, students, eligibleClasses]);

    const studentDrillData = useMemo(() => {
        if (!selectedStudentId || !analysisData) return null;
        
        const student = students.find(s => s.id === selectedStudentId);
        const currentClass = analysisData.currentClass;
        
        // Use the filtered relevantSubjects from analysisData
        const data = analysisData.relevantSubjects.map(subj => {
                // Class Avg
                const classGrades = grades.filter(g => currentClass.studentIds.includes(g.studentId) && g.subjectId === subj.id);
                const classAvg = classGrades.length > 0 ? classGrades.reduce((sum, g) => sum + g.grade, 0) / classGrades.length : 0;

                // Student Avg
                const studentGrades = grades.filter(g => g.studentId === selectedStudentId && g.subjectId === subj.id);
                const studentAvg = studentGrades.length > 0 ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length : 0;

                return {
                    subject: subj.name,
                    Aluno: parseFloat(studentAvg.toFixed(1)),
                    Turma: parseFloat(classAvg.toFixed(1)),
                };
            });

        return { student, data };
    }, [selectedStudentId, analysisData, students, grades]);


    // --- CUSTOM VISUAL COMPONENTS ---

    const renderPieChart = (data: any[]) => {
        let cumulativePercent = 0;
        const gradients = data.map((item) => {
            const start = cumulativePercent;
            cumulativePercent += item.percent;
            const end = cumulativePercent;
            return `${item.color} ${start}% ${end}%`;
        });

        return (
            <div className="flex flex-col items-center justify-center">
                <div 
                    className="w-48 h-48 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border-4 border-gray-800"
                    style={{ background: `conic-gradient(${gradients.join(', ')})` }}
                ></div>
                <div className="mt-6 w-full space-y-2">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-gray-300">{item.name}</span>
                            </div>
                            <span className="font-bold text-white">{item.value} ({item.percent.toFixed(1)}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderVerticalBarChart = (data: any[]) => {
        if (data.length === 0) return <div className="text-center text-gray-500 mt-10">Sem dados.</div>;
        return (
            <div className="w-full h-64 flex items-end justify-between gap-2 md:gap-4 mt-4 px-2">
                {data.map((item, idx) => {
                    const hTurma = (item.Turma / 10) * 100;
                    const hEscola = (item.Escola / 10) * 100;
                    
                    return (
                        <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                            {/* Bars */}
                            <div className="w-full flex justify-center items-end gap-1 h-full max-w-[40px]">
                                <div className="relative w-1/2 h-full flex items-end group/bar1">
                                    <div style={{height: `${hTurma}%`}} className="w-full bg-yellow-400 rounded-t shadow-[0_0_10px_rgba(250,204,21,0.3)] transition-all duration-500"></div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar1:block bg-gray-900 text-xs px-2 py-1 rounded border border-yellow-400 text-yellow-400 font-bold z-10">{item.Turma}</div>
                                </div>
                                <div className="relative w-1/2 h-full flex items-end group/bar2">
                                    <div style={{height: `${hEscola}%`}} className="w-full bg-gray-600 rounded-t transition-all duration-500 hover:bg-gray-500"></div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar2:block bg-gray-900 text-xs px-2 py-1 rounded border border-gray-500 text-gray-300 font-bold z-10">{item.Escola}</div>
                                </div>
                            </div>
                            {/* Label */}
                            <div className="mt-2 text-[10px] text-gray-400 font-medium rotate-0 truncate w-full text-center group-hover:text-white transition-colors" title={item.name}>
                                {item.name.substring(0, 10)}{item.name.length > 10 ? '..' : ''}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderRankingBar = (label: string, value: number, max: number = 10, isHighlight: boolean = false, showTrack = true) => {
        const width = (value / max) * 100;
        let colorClass = 'bg-blue-600';
        if (isHighlight) colorClass = 'bg-yellow-400';
        else if (value < 6.5) colorClass = 'bg-red-500'; // Fail threshold updated to 6.5
        else if (value >= 9) colorClass = 'bg-green-500';

        return (
            <div className="flex items-center gap-3 text-sm mb-3">
                <div className="w-32 truncate text-gray-300 font-medium text-right" title={label}>{label}</div>
                <div className={`flex-1 rounded-full h-3 overflow-hidden relative ${showTrack ? 'bg-gray-700' : 'bg-transparent'}`}>
                    <div 
                        className={`h-full rounded-full ${colorClass} transition-all duration-500 relative`} 
                        style={{ width: `${width}%` }}
                    ></div>
                </div>
                <div className="w-10 text-right font-bold text-white">{value.toFixed(1)}</div>
            </div>
        );
    };

    if (eligibleClasses.length === 0) {
        return <div className="text-gray-400 p-8 text-center">Nenhuma turma com avaliação cadastrada (Fundamental/Médio) disponível.</div>;
    }

    if (!analysisData) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
                <span className="ml-4 text-white">Carregando dados da turma...</span>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                        <PresentationChartBarIcon className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold font-display text-white tracking-tight">Análise de Turma</h1>
                        <p className="text-gray-400">Visualização de dados e desempenho.</p>
                    </div>
                </div>
                
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecionar Turma</label>
                    <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full md:w-64 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-500 focus:outline-none shadow-lg text-lg font-medium"
                    >
                        {eligibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-yellow-400 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpenIcon className="w-16 h-16 text-white" />
                    </div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Média Geral da Turma</h3>
                    <p className="text-4xl font-bold text-white mt-2 neon-text">{analysisData.overallAverage.toFixed(1)}</p>
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <span className={`font-bold ${analysisData.overallAverage >= 6.5 ? 'text-green-400' : 'text-red-400'}`}>
                            {analysisData.overallAverage >= 6.5 ? 'Acima da média' : 'Abaixo da média'}
                        </span> (Base 6.5)
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-500 relative overflow-hidden">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Melhor Disciplina</h3>
                    <p className="text-xl font-bold text-white mt-2 truncate" title={analysisData.bestSubject?.name}>{analysisData.bestSubject?.name || '-'}</p>
                    <p className="text-green-400 text-sm font-bold mt-1">Média: {analysisData.bestSubject?.Turma.toFixed(1)}</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border-l-4 border-red-500 relative overflow-hidden">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ponto de Atenção</h3>
                    <p className="text-xl font-bold text-white mt-2 truncate" title={analysisData.worstSubject?.name}>{analysisData.worstSubject?.name || '-'}</p>
                    <p className="text-red-400 text-sm font-bold mt-1">Média: {analysisData.worstSubject?.Turma.toFixed(1)}</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500 relative overflow-hidden">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total de Alunos</h3>
                    <p className="text-4xl font-bold text-white mt-2">{analysisData.currentClass.studentIds.length}</p>
                    <p className="text-gray-500 text-xs mt-2">Matriculados Ativos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Main Comparison Chart */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                            Desempenho por Disciplina
                        </h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-yellow-400 rounded"></div> Turma
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-gray-600 rounded"></div> Escola
                            </div>
                        </div>
                    </div>
                    {renderVerticalBarChart(analysisData.subjectComparisonData)}
                </div>

                {/* Distribution Chart */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center">
                    <h3 className="text-xl font-bold text-white mb-6 self-start w-full border-b border-white/5 pb-2">Distribuição de Notas</h3>
                    {renderPieChart(analysisData.distributionData)}
                </div>
            </div>

            {/* FULL STUDENT LIST CHART (NEW) */}
            <div className="glass-panel p-6 rounded-2xl mb-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <UsersIcon className="w-6 h-6 text-blue-400" />
                    Desempenho Geral - Todos os Alunos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    {analysisData.studentRanking.map((item, idx) => (
                        <div key={idx} className="w-full">
                            {renderRankingBar(item.name, item.media, 10, false)}
                        </div>
                    ))}
                    {analysisData.studentRanking.length === 0 && <p className="text-gray-500 col-span-full text-center">Sem alunos com notas lançadas nas disciplinas avaliadas.</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Class Comparison */}
                <div className="glass-panel p-6 rounded-2xl max-h-[500px] overflow-y-auto custom-scrollbar">
                    <h3 className="text-xl font-bold text-white mb-4">Ranking das Turmas (Médias)</h3>
                    <div className="pr-2">
                        {analysisData.classRankingData.map((item, idx) => (
                            <div key={idx}>
                                {renderRankingBar(item.name, item.media, 10, item.name === analysisData.currentClass.name)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Student Drill Down */}
                <div className="glass-panel p-8 rounded-2xl border border-white/10">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <UsersIcon className="w-6 h-6 text-purple-400" />
                        Análise Individual
                    </h3>
                    
                    <div className="mb-6 max-w-md">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Selecione o Aluno para Comparar</label>
                        <select 
                            value={selectedStudentId} 
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                            <option value="">Selecione...</option>
                            {analysisData.studentRanking.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {studentDrillData && (
                        <div className="animate-fade-in-up">
                            <div className="bg-gray-800 p-6 rounded-xl border border-purple-500/30">
                                <h4 className="text-xl font-bold text-white mb-6">{studentDrillData.student?.name} <span className="text-gray-500 text-base font-normal">vs Média da Turma</span></h4>
                                
                                <div className="space-y-4">
                                    {studentDrillData.data.map((item, idx) => {
                                        const diff = item.Aluno - item.Turma;
                                        const widthAluno = (item.Aluno / 10) * 100;
                                        const widthTurma = (item.Turma / 10) * 100;

                                        return (
                                            <div key={idx} className="border-b border-gray-700 pb-4 last:border-0">
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="font-bold text-gray-300 w-1/4">{item.subject}</span>
                                                    <div className="flex gap-4 text-xs font-bold">
                                                        <span className="text-purple-400">Aluno: {item.Aluno.toFixed(1)}</span>
                                                        <span className="text-yellow-500">Turma: {item.Turma.toFixed(1)}</span>
                                                        <span className={`${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            Dif: {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="relative h-6 bg-gray-900 rounded-full overflow-hidden">
                                                    {/* Bar Aluno */}
                                                    <div 
                                                        className="absolute top-0 left-0 h-full bg-purple-600/80 rounded-full z-10 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                                                        style={{ width: `${widthAluno}%` }}
                                                    >
                                                    </div>
                                                </div>
                                                <div className="mt-1 relative h-1.5 w-full bg-gray-700 rounded-full">
                                                     <div className="absolute top-0 left-0 h-full bg-yellow-500 rounded-full opacity-50" style={{ width: `${widthTurma}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassAnalysisPage;
