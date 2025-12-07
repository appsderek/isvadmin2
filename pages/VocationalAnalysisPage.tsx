
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { GoogleGenAI } from '@google/genai';
import { SparklesIcon, DocumentReportIcon } from '../components/icons';
import { jsPDF } from 'jspdf';

// Classes excluded from Vocational Analysis (Early Childhood)
const EXCLUDED_CLASSES = [
    'CRECHE III', 
    'CRECHE IV', 
    'PRÉ I MANHÃ', 
    'PRÉ I TARDE', 
    'PRÉ II MANHÃ', 
    'PRÉ II TARDE'
];

const VocationalAnalysisPage: React.FC = () => {
    const { students, classes, subjects, grades, attendance } = useData();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Initialize Gemini (assuming process.env.API_KEY is available as per instructions)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. Get Eligible Classes (excluding early childhood)
    const eligibleClasses = useMemo(() => {
        return classes.filter(c => !EXCLUDED_CLASSES.includes(c.name.toUpperCase()));
    }, [classes]);

    // 2. Filter Students based on Selected Class
    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, selectedClassId]);

    const handleAnalyze = async () => {
        if (!selectedStudentId) return;

        setLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            // 1. Gather Data
            const student = students.find(s => s.id === selectedStudentId);
            if (!student) throw new Error("Aluno não encontrado");
            
            const studentClass = classes.find(c => c.id === student.classId);
            const classSubjects = subjects.filter(s => studentClass?.subjectIds.includes(s.id));

            const academicData = classSubjects.map(subj => {
                const subGrades = grades.filter(g => g.studentId === selectedStudentId && g.subjectId === subj.id);
                const avg = subGrades.length ? (subGrades.reduce((a, b) => a + b.grade, 0) / subGrades.length).toFixed(1) : "N/A";
                return { subject: subj.name, average: avg };
            });

            const studentAttendance = attendance.filter(a => a.studentId === selectedStudentId);
            const totalClasses = studentAttendance.length;
            const presentCount = studentAttendance.filter(a => a.present).length;
            const attendancePct = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(0) + '%' : "N/A";

            const currentDate = new Date().toLocaleDateString('pt-BR');

            // 2. Prepare Payload
            const promptData = {
                analysisDate: currentDate,
                studentName: student.name,
                className: studentClass?.name || "Desconhecida",
                attendancePercentage: attendancePct,
                academicPerformance: academicData,
                additionalInfo: "O aluno demonstra interesse participativo em atividades práticas." // Simulated generic observation
            };

            const systemInstruction = `
Você é o melhor Analista Vocacional Infantil do mundo, especializado em crianças de 6 a 14 anos.
Hoje é dia ${currentDate}.
Realize uma análise completa usando psicologia do desenvolvimento, neuroeducação, BNCC, teoria das inteligências múltiplas, Big Five adaptado para crianças, preferências cognitivas, habilidades socioemocionais e padrões de interesse observáveis.

Considere também:
Desempenho acadêmico nas áreas avaliadas (humanas, exatas, biológicas, artes e linguagem).

Entregue:
1. Resumo Profissional do Perfil da Criança (em linguagem simples e positiva).
2. Predição de Afinidade Vocacional (percentual estimado por área):
   - Humanas
   - Exatas
   - Biológicas
3. Mapa de Potencialidades (pontos fortes).
4. Mapa de Fragilidades Saudáveis (oportunidades de desenvolvimento, sem termos negativos).
5. Recomendações Vocacionais baseadas no desenvolvimento infantil.
6. Sugestões de Atividades para Pais (exemplos práticos).
7. Lista de Possíveis Carreiras Futuras (sem determinar o futuro; sugerir caminhos amplos).
8. Mensagens de Incentivo Personalizadas para a Criança.

Use linguagem acolhedora, clara e científica ao mesmo tempo.
Evite rótulos definitivos; enfoque em potencial e desenvolvimento.
Apresente o resultado bem formatado usando Markdown.
`;

            // 3. Call AI
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Analise o seguinte perfil de aluno e gere um relatório vocacional detalhado:\n${JSON.stringify(promptData, null, 2)}`,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7, // Creative but grounded
                }
            });

            setAnalysisResult(response.text || "Sem resposta gerada.");

        } catch (err: any) {
            console.error("Erro na análise IA:", err);
            setError(err.message || "Erro desconhecido ao gerar análise.");
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        if (!analysisResult || !selectedStudentId) return;

        const student = students.find(s => s.id === selectedStudentId);
        const doc = new jsPDF();
        const currentDate = new Date().toLocaleDateString('pt-BR');

        // Header
        doc.setFontSize(22);
        doc.setTextColor(33, 33, 33);
        doc.text("Relatório de Inteligência Vocacional", 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Aluno: ${student?.name}`, 14, 30);
        doc.text(`Data da Análise: ${currentDate}`, 14, 36);
        doc.text(`Gerado por: EscolarPro AI`, 14, 42);

        // Content
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        // Clean markdown stars for better PDF readability
        const cleanText = analysisResult.replace(/\*\*/g, '').replace(/#/g, '');
        
        const splitText = doc.splitTextToSize(cleanText, 180); // Wrap text at 180mm
        
        let y = 55;
        const pageHeight = 280;

        splitText.forEach((line: string) => {
            if (y > pageHeight) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, 14, y);
            y += 6;
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('Relatório gerado por Inteligência Artificial - Apoio Pedagógico', 14, 290);
            doc.text(`Página ${i} de ${pageCount}`, 190, 290, { align: 'right' });
        }

        doc.save(`Analise_Vocacional_${student?.name.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg">
                    <SparklesIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold font-display text-white">Análise Vocacional com IA</h1>
                    <p className="text-gray-400">Descubra potenciais e talentos usando inteligência artificial avançada.</p>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Selecione a Turma</label>
                        <select 
                            value={selectedClassId}
                            onChange={(e) => {
                                setSelectedClassId(e.target.value);
                                setSelectedStudentId(''); // Reset student when class changes
                            }}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500 text-lg"
                        >
                            <option value="">Selecione uma turma...</option>
                            {eligibleClasses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Selecione o Aluno</label>
                        <select 
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            disabled={!selectedClassId}
                            className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-purple-500 focus:border-purple-500 text-lg ${!selectedClassId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="">{selectedClassId ? 'Selecione um aluno...' : 'Selecione a turma primeiro'}</option>
                            {filteredStudents.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button 
                    onClick={handleAnalyze}
                    disabled={!selectedStudentId || loading}
                    className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2
                        ${!selectedStudentId || loading 
                            ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                        }`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analisando...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5" />
                            Gerar Análise
                        </>
                    )}
                </button>
                <p className="text-xs text-gray-500 mt-4 text-center">* Alunos da Educação Infantil (Creche/Pré) não estão disponíveis para esta análise.</p>
            </div>

            {error && (
                <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mb-8 rounded-r">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-red-200">Erro na Análise</h3>
                            <div className="text-red-300 text-sm mt-1">{error}</div>
                            {error.includes("API key") && (
                                <p className="text-red-300 text-xs mt-2">Verifique se a chave da API do Google Gemini está configurada corretamente no ambiente.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {analysisResult && (
                <div className="bg-white text-gray-900 rounded-lg shadow-2xl overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-yellow-300" />
                                Relatório de Inteligência Vocacional
                            </h2>
                            <p className="text-purple-100 mt-1">Gerado via Gemini 2.5 Flash • Perfil: {students.find(s => s.id === selectedStudentId)?.name}</p>
                        </div>
                        <button 
                            onClick={downloadPDF}
                            className="bg-white text-purple-700 hover:bg-purple-50 font-bold py-2 px-4 rounded shadow-lg flex items-center gap-2 transition-colors"
                        >
                            <DocumentReportIcon className="w-5 h-5" />
                            Baixar PDF
                        </button>
                    </div>
                    <div className="p-8 prose max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                            {analysisResult}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 border-t border-gray-200 text-center text-xs text-gray-500">
                        <p>Este relatório é gerado por Inteligência Artificial e serve como ferramenta de apoio pedagógico, não substituindo a avaliação de profissionais especializados.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VocationalAnalysisPage;
