
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Parent, TransactionType, TransactionStatus } from '../types';
import ReportCard from '../components/ReportCard';
import CalendarPage from './CalendarPage';
import GamificationProfile from '../components/GamificationProfile';
import { jsPDF } from 'jspdf';
import { ChartBarIcon, ClipboardCheckIcon, CalendarIcon, UserCircleIcon, DocumentReportIcon, SparklesIcon, CpuIcon, TrophyIcon, CoinIcon, ShoppingBagIcon, BookOpenIcon, CheckCircleIcon } from '../components/icons';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';

interface ParentDashboardProps {
    user: Parent;
    currentView: string;
    onNavigate: (view: string) => void;
}

// --- TUTOR IA COMPONENT ---
const StudyPlanTab: React.FC<{ studentId: string }> = ({ studentId }) => {
    const { students, classes, subjects, grades } = useData();
    const [loading, setLoading] = useState(false);
    const [studyPlan, setStudyPlan] = useState<string | null>(null);
    const [htmlContent, setHtmlContent] = useState('');

    const generateStudyPlan = async () => {
        setLoading(true);
        try {
            const student = students.find(s => s.id === studentId);
            const studentClass = classes.find(c => c.id === student?.classId);
            
            // Analyze Weak Subjects (Threshold updated to 6.5)
            const weakSubjects = subjects.map(subj => {
                const subGrades = grades.filter(g => g.studentId === studentId && g.subjectId === subj.id);
                const avg = subGrades.length ? (subGrades.reduce((a, b) => a + b.grade, 0) / subGrades.length) : 0;
                return { name: subj.name, avg };
            }).filter(s => s.avg < 6.5 && s.avg > 0);

            if (weakSubjects.length === 0) {
                setStudyPlan("Parabéns! O aluno não apresenta notas vermelhas (abaixo de 6,5) nas disciplinas registradas. Continue assim!");
                setLoading(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Crie um Plano de Estudos de Recuperação Semanal personalizado para o aluno ${student?.name} (${studentClass?.name}).
                
                Matérias com dificuldade (Média abaixo de 6,5):
                ${weakSubjects.map(s => `- ${s.name}: ${s.avg.toFixed(1)}`).join('\n')}

                O plano deve conter:
                1. Uma mensagem motivacional curta e adequada para a idade.
                2. Um cronograma de segunda a sexta (focando nas matérias fracas).
                3. Dicas práticas de como estudar essas matérias específicas.
                4. Sugestões de metodologia (ex: Pomodoro, Resumos).

                Use formatação Markdown rica (títulos, negritos, listas).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { temperature: 0.7 }
            });

            const text = response.text || "Não foi possível gerar o plano no momento.";
            setStudyPlan(text);
            const parsed = await marked.parse(text);
            setHtmlContent(parsed);

        } catch (error) {
            console.error(error);
            setStudyPlan("Erro ao conectar com o Tutor IA. Tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 rounded-2xl shadow-2xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                    <CpuIcon className="w-32 h-32 text-white" />
                </div>
                <h2 className="text-3xl font-bold font-display text-white mb-2 flex items-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-yellow-300" />
                    Tutor IA Personalizado
                </h2>
                <p className="text-purple-100 max-w-2xl text-lg">
                    Nossa Inteligência Artificial analisa o desempenho do seu filho e cria um roteiro de estudos exclusivo para recuperar as notas e melhorar o aprendizado.
                </p>
                <button 
                    onClick={generateStudyPlan}
                    disabled={loading}
                    className="mt-6 bg-white text-purple-700 font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? 'Gerando Plano...' : 'Gerar Plano de Recuperação'}
                    {!loading && <SparklesIcon className="w-5 h-5" />}
                </button>
            </div>

            {studyPlan && (
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                    {htmlContent ? (
                        <div 
                            className="prose prose-invert prose-lg max-w-none prose-headings:text-yellow-400 prose-a:text-blue-400"
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                    ) : (
                        <p className="text-white whitespace-pre-wrap">{studyPlan}</p>
                    )}
                </div>
            )}
        </div>
    );
};

// --- FAVOCOIN PARENT VIEW ---
const FavocoinParentView: React.FC<{ studentId: string }> = ({ studentId }) => {
    const { getStudentFavocoinBalance, favocoinTransactions, storeItems } = useData();
    const balance = getStudentFavocoinBalance(studentId);
    
    // Sort transactions by date descending
    const history = favocoinTransactions
        .filter(t => t.studentId === studentId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="animate-fade-in space-y-8">
            {/* HERO: Balance */}
            <div className="relative overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-600 rounded-3xl p-8 shadow-2xl border border-yellow-400/50">
                <div className="absolute top-0 right-0 p-8 opacity-20">
                    <CoinIcon className="w-48 h-48 text-white" />
                </div>
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-white font-display font-bold text-xl uppercase tracking-wider mb-2 opacity-90">Saldo Disponível</h2>
                    <div className="text-6xl md:text-8xl font-bold text-white drop-shadow-md flex items-center justify-center md:justify-start gap-4">
                        <CoinIcon className="w-16 h-16 md:w-24 md:h-24 text-yellow-200" />
                        {balance}
                    </div>
                    <p className="text-yellow-100 mt-2 font-medium">Favocoins acumulados</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* WHAT IS IT? */}
                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                        O que é Favocoin?
                    </h3>
                    <p className="text-gray-300 leading-relaxed mb-6">
                        O Favocoin é a nossa moeda escolar digital! Ela foi criada para ensinar educação financeira básica e incentivar bons comportamentos. 
                        Seu filho ganha moedas por presença, participação e tarefas, e pode trocá-las por recompensas reais ou experiências na escola.
                    </p>
                    
                    <h4 className="text-yellow-400 font-bold uppercase text-xs tracking-wider mb-3 border-b border-gray-700 pb-2">Como Ganhar (+)</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400 mb-6">
                        <li className="flex items-center gap-2"><span className="text-green-400">●</span> Presença em Aula (+10)</li>
                        <li className="flex items-center gap-2"><span className="text-green-400">●</span> Tarefa de Casa (+10)</li>
                        <li className="flex items-center gap-2"><span className="text-green-400">●</span> Bom Comportamento (+10)</li>
                        <li className="flex items-center gap-2"><span className="text-green-400">●</span> Contribuição/Ideias (+20)</li>
                        <li className="flex items-center gap-2"><span className="text-green-400">●</span> Eventos (+30)</li>
                    </ul>

                    <h4 className="text-red-400 font-bold uppercase text-xs tracking-wider mb-3 border-b border-gray-700 pb-2">O que evita perdas (-)</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
                        <li className="flex items-center gap-2"><span className="text-red-400">●</span> Faltas Injustificadas (-10)</li>
                        <li className="flex items-center gap-2"><span className="text-red-400">●</span> Não fazer tarefas (-10)</li>
                        <li className="flex items-center gap-2"><span className="text-red-400">●</span> Mau comportamento (-20)</li>
                    </ul>
                </div>

                {/* STORE SHOWCASE */}
                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                        Vitrine da Lojinha
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">Itens que os alunos podem adquirir com seu saldo (sujeito a estoque). A compra é feita em sala.</p>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 max-h-[300px]">
                        {storeItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4 bg-gray-700/30 p-3 rounded-xl border border-gray-700">
                                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <ShoppingBagIcon className="w-6 h-6 text-gray-500"/>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                                </div>
                                <div className="text-yellow-400 font-bold text-sm whitespace-nowrap">
                                    {item.price} <span className="text-[10px]">FVC</span>
                                </div>
                            </div>
                        ))}
                        {storeItems.length === 0 && <p className="text-gray-500 text-center py-4">Nenhum item na loja no momento.</p>}
                    </div>
                </div>
            </div>

            {/* TRANSACTION HISTORY */}
            <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ClipboardCheckIcon className="w-6 h-6 text-gray-400" />
                        Extrato de Movimentações
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-4 text-left">Data</th>
                                <th className="px-6 py-4 text-left">Descrição</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {history.length > 0 ? history.map(t => (
                                <tr key={t.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                                        {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-white">
                                        {t.description}
                                    </td>
                                    <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${
                                        t.type === 'EARN' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {t.type === 'EARN' ? '+' : ''}{t.amount}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 italic">
                                        Nenhuma movimentação registrada ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, currentView, onNavigate }) => {
    const { students, classes, attendance, classLogs, subjects, transactions } = useData();

    // REMOVED LOCAL STATE 'activeTab' TO FIX SYNC ISSUES.
    // Derived state directly from props ensures instant navigation.
    const activeView = currentView;

    const myChild = students.find(s => s.id === user.studentId);
    if (!myChild) return <div className="text-white p-8">Criança não encontrada.</div>;

    const childsClass = classes.find(c => c.id === myChild.classId);
    
    // Check if class is eligible for Favocoin (1-5 Year)
    const isFavocoinEligible = useMemo(() => {
        if (!childsClass) return false;
        const name = childsClass.name.toUpperCase();
        return name.includes('1º') || name.includes('2º') || name.includes('3º') || name.includes('4º') || name.includes('5º');
    }, [childsClass]);

    // --- PDF GENERATION HELPERS ---
    const drawBoletoOnPage = (doc: jsPDF, transaction: any, yOffset: number) => {
        const dueDate = new Date(transaction.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
        
        doc.setFillColor(255, 255, 255);
        doc.rect(10, yOffset, 190, 80, 'F');
        doc.setDrawColor(0);
        doc.rect(10, yOffset, 190, 80);

        // Header Line
        doc.setFontSize(10);
        doc.text("001-9", 15, yOffset + 8);
        doc.text("00190.00009 01000.000008 00000.000000 1 00000000000000", 50, yOffset + 8);
        doc.line(10, yOffset + 10, 200, yOffset + 10);

        // Fields
        doc.setFontSize(7);
        doc.text("Local de Pagamento", 12, yOffset + 14);
        doc.setFontSize(9);
        doc.text("PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO", 12, yOffset + 19);
        doc.line(10, yOffset + 21, 150, yOffset + 21);

        doc.setFontSize(7);
        doc.text("Beneficiário", 12, yOffset + 25);
        doc.setFontSize(9);
        doc.text("INSTITUTO SAMPAIO VIEGAS - CNPJ 00.000.000/0001-00", 12, yOffset + 30);
        doc.line(10, yOffset + 32, 150, yOffset + 32);

        doc.setFontSize(7);
        doc.text("Data Documento", 12, yOffset + 36);
        doc.text(new Date(transaction.date).toLocaleDateString('pt-BR'), 12, yOffset + 41);
        doc.text("Espécie Doc.", 40, yOffset + 36);
        doc.text("DM", 40, yOffset + 41);
        doc.text("Aceite", 60, yOffset + 36);
        doc.text("N", 60, yOffset + 41);
        doc.text("Data Processamento", 80, yOffset + 36);
        doc.text(new Date().toLocaleDateString('pt-BR'), 80, yOffset + 41);
        doc.line(10, yOffset + 43, 150, yOffset + 43);

        doc.setFontSize(7);
        doc.text("Instruções", 12, yOffset + 47);
        doc.setFontSize(8);
        doc.text("Sr. Caixa, não receber após o vencimento.", 12, yOffset + 52);
        doc.text(`Referente a: ${transaction.description}`, 12, yOffset + 56);
        
        // Right Side (Values)
        doc.line(150, yOffset + 10, 150, yOffset + 80);
        
        doc.setFontSize(7);
        doc.text("Vencimento", 152, yOffset + 14);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(dueDate, 198, yOffset + 19, { align: "right" });
        doc.line(150, yOffset + 21, 200, yOffset + 21);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Agência / Código Beneficiário", 152, yOffset + 25);
        doc.setFontSize(9);
        doc.text("0001 / 12345-6", 198, yOffset + 30, { align: "right" });
        doc.line(150, yOffset + 32, 200, yOffset + 32);

        doc.setFontSize(7);
        doc.text("Nosso Número", 152, yOffset + 36);
        doc.setFontSize(9);
        doc.text("000000012345", 198, yOffset + 41, { align: "right" });
        doc.line(150, yOffset + 43, 200, yOffset + 43);

        doc.setFontSize(7);
        doc.text("(=) Valor do Documento", 152, yOffset + 47);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`R$ ${transaction.amount.toFixed(2)}`, 198, yOffset + 52, { align: "right" });
        doc.line(150, yOffset + 54, 200, yOffset + 54);

        // Footer Payer
        doc.line(10, yOffset + 65, 200, yOffset + 65);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Pagador", 12, yOffset + 69);
        doc.setFontSize(9);
        doc.text(`${user.name} - Aluno: ${myChild.name}`, 12, yOffset + 74);
        doc.text("Endereço do Aluno Cadastrado", 12, yOffset + 78);
        
        // Barcode
        doc.setFillColor(0);
        doc.rect(12, yOffset + 85, 100, 10, 'F'); 
    };

    const generateFinancialPDF = () => {
        const doc = new jsPDF();
        
        const myTransactions = transactions
            .filter(t => t.studentId === myChild.id && t.type === TransactionType.Income)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        const pending = myTransactions.filter(t => t.status === TransactionStatus.Pending || t.status === TransactionStatus.Overdue);

        if (pending.length === 0) {
            alert("Não há cobranças pendentes para gerar boleto.");
            return;
        }

        let yPos = 10;
        pending.forEach((t, index) => {
            if (yPos + 100 > 290) {
                doc.addPage();
                yPos = 10;
            }
            drawBoletoOnPage(doc, t, yPos);
            yPos += 105; // Spacing for next boleto
        });

        doc.save(`Cobrancas_${myChild.name}.pdf`);
    };

    // --- RENDER CONTENT SWITCH ---
    const renderContent = () => {
        switch (activeView) {
            case 'Boletim':
                return (
                    <div className="animate-fade-in">
                        <button onClick={() => onNavigate('Visão Geral')} className="mb-4 text-yellow-400 hover:text-white flex items-center gap-2 font-bold">
                            ← Voltar
                        </button>
                        <ReportCard studentId={myChild.id} />
                    </div>
                );
            case 'Calendário':
                return (
                    <div className="animate-fade-in">
                        <button onClick={() => onNavigate('Visão Geral')} className="mb-4 text-yellow-400 hover:text-white flex items-center gap-2 font-bold">
                            ← Voltar
                        </button>
                        <CalendarPage />
                    </div>
                );
            case 'Financeiro':
                const myTransactions = transactions
                    .filter(t => t.studentId === myChild.id && t.type === TransactionType.Income)
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                
                return (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <button onClick={() => onNavigate('Visão Geral')} className="text-yellow-400 hover:text-white flex items-center gap-2 font-bold">
                                ← Voltar
                            </button>
                            <button onClick={generateFinancialPDF} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2">
                                <ClipboardCheckIcon className="w-5 h-5"/>
                                Baixar Boletos (Pendentes)
                            </button>
                        </div>
                        
                        <h2 className="text-3xl font-bold font-display text-white">Histórico Financeiro</h2>
                        <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                            <table className="min-w-full text-left">
                                <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-4">Vencimento</th>
                                        <th className="p-4">Descrição</th>
                                        <th className="p-4">Valor</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Pagamento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {myTransactions.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-700/50">
                                            <td className="p-4 text-white">{new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 text-gray-300">{t.description}</td>
                                            <td className="p-4 font-bold text-white">R$ {t.amount.toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    t.status === TransactionStatus.Paid ? 'bg-green-900 text-green-200' :
                                                    t.status === TransactionStatus.Overdue ? 'bg-red-900 text-red-200' :
                                                    'bg-yellow-900 text-yellow-200'
                                                }`}>
                                                    {t.status === TransactionStatus.Paid ? 'PAGO' : t.status === TransactionStatus.Overdue ? 'ATRASADO' : 'PENDENTE'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-400 text-sm">
                                                {t.paidDate ? new Date(t.paidDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {myTransactions.length === 0 && (
                                        <tr><td colSpan={5} className="p-6 text-center text-gray-500">Nenhuma cobrança registrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'Tutor IA':
                return (
                    <div className="animate-fade-in">
                        <button onClick={() => onNavigate('Visão Geral')} className="mb-4 text-yellow-400 hover:text-white flex items-center gap-2 font-bold">
                            ← Voltar
                        </button>
                        <StudyPlanTab studentId={myChild.id} />
                    </div>
                );
            case 'Gamificação':
                return (
                    <div className="animate-fade-in">
                        <button onClick={() => onNavigate('Visão Geral')} className="mb-4 text-yellow-400 hover:text-white flex items-center gap-2 font-bold">
                            ← Voltar
                        </button>
                        <GamificationProfile studentId={myChild.id} />
                    </div>
                );
            case 'Favocoin':
                return (
                    <div className="animate-fade-in">
                        <button onClick={() => onNavigate('Visão Geral')} className="mb-4 text-yellow-400 hover:text-white flex items-center gap-2 font-bold">
                            ← Voltar
                        </button>
                        <FavocoinParentView studentId={myChild.id} />
                    </div>
                );
            default:
                // --- VISÃO GERAL (OVERVIEW) ---
                return (
                    <div className="animate-fade-in space-y-8">
                        {/* Welcome Header */}
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                            <div>
                                <h1 className="text-4xl font-bold font-display text-white tracking-tight">
                                    Olá, {user.name.split(' ')[0]}
                                </h1>
                                <p className="text-gray-400 mt-1">Acompanhe o desenvolvimento de <span className="text-yellow-400 font-bold">{myChild.name}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Turma Atual</p>
                                <p className="text-xl font-bold text-white">{childsClass?.name}</p>
                            </div>
                        </div>

                        {/* Quick Access Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <button onClick={() => onNavigate('Boletim')} className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform group cursor-pointer border border-white/5 hover:border-yellow-400/50">
                                <div className="p-4 bg-yellow-400/10 rounded-full group-hover:bg-yellow-400/20 transition-colors">
                                    <ClipboardCheckIcon className="w-10 h-10 text-yellow-400" />
                                </div>
                                <span className="font-bold text-white text-lg">Boletim Escolar</span>
                            </button>

                            <button onClick={() => onNavigate('Gamificação')} className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform group cursor-pointer border border-white/5 hover:border-purple-400/50">
                                <div className="p-4 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                                    <TrophyIcon className="w-10 h-10 text-purple-400" />
                                </div>
                                <span className="font-bold text-white text-lg">Conquistas (XP)</span>
                            </button>

                            <button onClick={() => onNavigate('Tutor IA')} className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform group cursor-pointer border border-white/5 hover:border-blue-400/50">
                                <div className="p-4 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                                    <SparklesIcon className="w-10 h-10 text-blue-400" />
                                </div>
                                <span className="font-bold text-white text-lg">Tutor IA</span>
                            </button>

                            <button onClick={() => onNavigate('Financeiro')} className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:scale-105 transition-transform group cursor-pointer border border-white/5 hover:border-green-400/50">
                                <div className="p-4 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                                    <ChartBarIcon className="w-10 h-10 text-green-400" />
                                </div>
                                <span className="font-bold text-white text-lg">Financeiro</span>
                            </button>
                        </div>

                        {/* Favocoin Banner (If Eligible) */}
                        {isFavocoinEligible && (
                            <div 
                                onClick={() => onNavigate('Favocoin')}
                                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 p-1 cursor-pointer hover:scale-[1.02] transition-transform shadow-2xl"
                            >
                                <div className="bg-gray-900 rounded-xl p-6 relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/30">
                                            <CoinIcon className="w-8 h-8 text-black" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">Favocoin Bank</h3>
                                            <p className="text-gray-400 text-sm">Educação financeira e recompensas.</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block text-right">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Saldo Atual</p>
                                        <p className="text-3xl font-bold text-yellow-400">{useData().getStudentFavocoinBalance(myChild.id)} FVC</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Summary Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Attendance Summary */}
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                                    Frequência Recente
                                </h3>
                                <div className="space-y-3">
                                    {attendance
                                        .filter(a => a.studentId === myChild.id)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 5)
                                        .map((att, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                                                <span className="text-gray-300 text-sm">{new Date(att.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${att.present ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                                    {att.present ? 'Presente' : 'Ausente'}
                                                </span>
                                            </div>
                                        ))}
                                    {attendance.filter(a => a.studentId === myChild.id).length === 0 && (
                                        <p className="text-gray-500 text-center py-4">Nenhum registro recente.</p>
                                    )}
                                </div>
                            </div>

                            {/* Class Logs Summary */}
                            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <BookOpenIcon className="w-5 h-5 text-gray-400" />
                                    O que foi ensinado?
                                </h3>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {classLogs
                                        .filter(log => log.classId === myChild.classId)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 5)
                                        .map((log, idx) => {
                                            const subjectName = subjects.find(s => s.id === log.subjectId)?.name || 'Geral';
                                            return (
                                                <div key={idx} className="border-l-2 border-yellow-500 pl-4 py-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-yellow-500 font-bold">{subjectName}</span>
                                                        <span className="text-gray-500">{new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    <p className="text-gray-300 text-sm line-clamp-2">{log.content}</p>
                                                </div>
                                            );
                                        })}
                                     {classLogs.filter(log => log.classId === myChild.classId).length === 0 && (
                                        <p className="text-gray-500 text-center py-4">Nenhum conteúdo registrado.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-10">
            {renderContent()}
        </div>
    );
};

export default ParentDashboard;
