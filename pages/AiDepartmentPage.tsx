
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { GoogleGenAI } from '@google/genai';
import { CpuIcon, ArrowLeftIcon, SparklesIcon } from '../components/icons';
import { marked } from 'marked';

type Agent = {
    id: string;
    title: string;
    description: string;
    systemPrompt: string;
    color: string;
};

const AGENTS: Agent[] = [
    {
        id: 'pedagogical',
        title: 'Gestão Pedagógica',
        description: 'Suporte didático, estratégias de ensino, atividades e apoio ao professor.',
        color: 'from-cyan-500 to-sky-600',
        systemPrompt: 'Você é um Agente de Gestão Pedagógica de elite, especializado em coordenação escolar e suporte docente no Instituto Sampaio Viegas. Sua missão é aprimorar o processo de ensino-aprendizagem. Suas capacidades incluem: 1. Sugerir atividades didáticas criativas e alinhadas à BNCC. 2. Auxiliar na abordagem de problemas específicos de aprendizagem (dislexia, TDAH, desmotivação), analisando o histórico do aluno. 3. Planejar eventos pedagógicos e feiras culturais. 4. Oferecer estratégias de gestão de sala de aula e metodologias ativas. 5. Apoiar o coordenador na análise de desempenho acadêmico e planos de recuperação. Utilize os dados fornecidos (notas, frequência, diários) para personalizar suas respostas.'
    },
    {
        id: 'finance',
        title: 'Gestão Financeira e Previsões',
        description: 'Análise de fluxo de caixa, inadimplência e cenários futuros.',
        color: 'from-green-500 to-emerald-700',
        systemPrompt: 'Você é o melhor analista financeiro do mundo. Analisa receitas, inadimplência, custos, fluxo de caixa, prevê cenários futuros e sugere ajustes (ex.: reajuste de mensalidade, bolsas, otimização de gastos).'
    },
    {
        id: 'hr',
        title: 'Recursos Humanos e Alocação',
        description: 'Gestão de carga horária, desempenho e necessidades de contratação.',
        color: 'from-pink-500 to-rose-700',
        systemPrompt: 'Você é o melhor do mundo atuando como RH. Acompanha desempenho de professores e colaboradores, sugere distribuições de carga horária, identifica sobrecarga, rotatividade e necessidades de contratação. Considere os custos de folha de pagamento.'
    },
    {
        id: 'kpi',
        title: 'Indicadores Institucionais',
        description: 'Dashboards estratégicos de matrículas, evasão e desempenho global.',
        color: 'from-blue-500 to-indigo-700',
        systemPrompt: 'Gera dashboards estratégicos para a diretoria: evolução de matrículas, evasão, satisfação, desempenho acadêmico global, ranking de turmas. Cruza dados acadêmicos com saúde financeira.'
    },
    {
        id: 'compliance',
        title: 'Compliance e Documentação',
        description: 'Monitoramento de prazos legais e documentos institucionais.',
        color: 'from-gray-500 to-slate-700',
        systemPrompt: 'Organiza e monitora prazos legais, declarações obrigatórias, documentos institucionais (ata, PPP, relatórios), e avisa sobre itens que vão vencer. Verifica regularidade fiscal básica baseada nos pagamentos.'
    },
    {
        id: 'infra',
        title: 'Gestão de Infraestrutura',
        description: 'Otimização de uso de salas, equipamentos e manutenção.',
        color: 'from-orange-500 to-amber-700',
        systemPrompt: 'Analisa uso de salas, equipamentos, espaços, consumo de energia, agenda de manutenção preventiva e detecta oportunidades de otimização de custos operacionais.'
    },
    {
        id: 'enrollment',
        title: 'Gestão de Matrículas e Vagas',
        description: 'Previsão de demanda e estruturação de turmas.',
        color: 'from-teal-500 to-cyan-700',
        systemPrompt: 'Prevê demanda de alunos por série/turma, identifica subutilização de turmas e orienta a diretoria sobre expansão, fusão ou fechamento de turmas, considerando o retorno financeiro de cada turma.'
    },
    {
        id: 'risk',
        title: 'Riscos e Evasão',
        description: 'Identificação preditiva de alunos em risco de evasão.',
        color: 'from-red-500 to-red-700',
        systemPrompt: 'Cruza dados de frequência, comportamento escolar, histórico financeiro (inadimplência), notas médias e prevê probabilidade de evasão — sugerindo ações preventivas.'
    },
    {
        id: 'strategy',
        title: 'Planejamento Estratégico',
        description: 'Metas trimestrais, KPIs e planos de melhoria.',
        color: 'from-purple-500 to-violet-700',
        systemPrompt: 'Auxilia na criação de metas trimestrais/anuais, KPIs e planos de melhoria institucional, além de monitorar o progresso financeiro e acadêmico de forma integrada.'
    },
    {
        id: 'audit',
        title: 'Auditoria Interna',
        description: 'Detecção de inconsistências em dados e processos.',
        color: 'from-yellow-500 to-amber-600',
        systemPrompt: 'Detecta inconsistências em lançamentos, registros duplicados, desvios de padrão em notas, presenças ou dados financeiros.'
    },
    {
        id: 'comms',
        title: 'Comunicação Institucional',
        description: 'Geração de comunicados, atas e respostas formais.',
        color: 'from-indigo-500 to-blue-700',
        systemPrompt: 'Gera comunicados formais (circulares, atas, memorandos), organiza cronogramas e sugere respostas rápidas para situações administrativas para professores.'
    }
];

// Helper for Markdown Rendering
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const [html, setHtml] = useState('');

    useEffect(() => {
        const parseMarkdown = async () => {
            const parsed = await marked.parse(content);
            setHtml(parsed);
        };
        parseMarkdown();
    }, [content]);

    return (
        <div 
            className="prose prose-invert prose-sm max-w-none 
                prose-headings:text-yellow-400 prose-headings:font-display 
                prose-strong:text-white prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-4 
                prose-ol:list-decimal prose-ol:pl-4
                prose-p:text-gray-300 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

const AiDepartmentPage: React.FC = () => {
    const { data } = useData();
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Select Agent
    const handleSelectAgent = (agent: Agent) => {
        setSelectedAgent(agent);
        setMessages([{
            role: 'model',
            text: `### Olá! Sou seu Agente de ${agent.title}.\n\nComo posso ajudar hoje no Instituto Sampaio Viegas? Estou integrado ao sistema financeiro e acadêmico.`
        }]);
    };

    // Construct Context Data specifically for the selected agent to save tokens and improve focus
    // UPDATED: Now includes Financial Data for relevant agents
    const gatherContext = (agentId: string) => {
        const commonData = {
            schoolName: "Instituto Sampaio Viegas",
            currentDate: new Date().toLocaleDateString('pt-BR'),
        };

        // Financial Snapshot for Analysis
        const financialSnapshot = {
            transactions: data.transactions, // Full transaction history
            services: data.financialServices, // Tuition prices
            categories: data.financialCategories, // Budget structure
            costCenters: data.costCenters,
            delinquencyRules: data.penaltyConfig
        };

        switch (agentId) {
            case 'pedagogical':
                // Pedagogical needs deep academic insight
                return {
                    ...commonData,
                    classes: data.classes,
                    subjects: data.subjects,
                    // Sending a sample of grades/attendance to allow analysis
                    grades_analysis: data.grades,
                    attendance_summary: data.attendance,
                    class_logs: data.classLogs.slice(0, 50), // Recent content taught
                    students_roster: data.students.map(s => ({id: s.id, name: s.name, classId: s.classId})), // Minimized student data
                    upcoming_events: data.calendarEvents
                };

            case 'finance':
                // Finance gets detailed financial data + suppliers
                return { 
                    ...commonData, 
                    ...financialSnapshot, 
                    suppliers: data.suppliers 
                };
            
            case 'hr':
                // HR needs teachers, classes, and Payroll specific financial data
                return { 
                    ...commonData, 
                    teachers: data.teachers, 
                    classes: data.classes, 
                    payroll_context: data.transactions.filter(t => t.category.toLowerCase().includes('salário') || t.category.toLowerCase().includes('pagamento') || t.type === 'EXPENSE')
                };

            case 'kpi':
                // KPI needs everything summarized + Financial Health
                return { 
                    ...commonData, 
                    students_count: data.students.length, 
                    classes: data.classes, 
                    grades_sample: data.grades.slice(0, 50), 
                    attendance_summary: data.attendance.slice(0, 100),
                    financial_overview: {
                        income: financialSnapshot.transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0),
                        expense: financialSnapshot.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0),
                        pending: financialSnapshot.transactions.filter(t => t.status === 'PENDING').length
                    }
                };

            case 'risk':
                 // Risk needs academic data + Financial Delinquency (strong predictor of evasion)
                return { 
                    ...commonData, 
                    students_count: data.students.length, 
                    grades_sample: data.grades.slice(0, 50), 
                    attendance_summary: data.attendance.slice(0, 100),
                    financial_delinquency: financialSnapshot.transactions.filter(t => t.status === 'OVERDUE' || (t.status === 'PENDING' && new Date(t.dueDate) < new Date()))
                };

            case 'strategy':
                // Strategy needs the big picture: Academic + Financial
                return { 
                    ...commonData, 
                    financial_summary: financialSnapshot,
                    student_count: data.students.length,
                    market_position: "Instituto Sampaio Viegas" 
                };

            case 'infra':
                // Infra needs logs + Maintenance Costs
                return { 
                    ...commonData, 
                    calendar: data.calendarEvents, 
                    logs: data.classLogs,
                    maintenance_expenses: financialSnapshot.transactions.filter(t => t.type === 'EXPENSE')
                };

             case 'enrollment':
                // Enrollment needs classes + Tuition Values (to project revenue)
                return { 
                    ...commonData, 
                    classes: data.classes, 
                    tuition_values: data.financialServices 
                };

             case 'audit':
                 // Audit gets everything to find inconsistencies
                 return { ...data };

            case 'compliance':
                // Compliance needs calendar + Tax/Fee payments
                return { 
                    ...commonData, 
                    calendar: data.calendarEvents, 
                    financial_records_sample: data.transactions.slice(0, 50) 
                };

            case 'comms':
                // Comms usually doesn't need deep finance
                return { ...commonData, events: data.calendarEvents, users: data.users.map(u => ({name: u.name, role: u.role})) };
            
            default:
                return { ...commonData };
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || !selectedAgent) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const contextData = gatherContext(selectedAgent.id);
            const contextString = JSON.stringify(contextData, null, 2);

            // Enhance the system prompt with data context
            const fullSystemPrompt = `
${selectedAgent.systemPrompt}

CONTEXTO DE DADOS DA ESCOLA (Incluindo Dados Financeiros Interligados):
${contextString}

Instruções:
- Use os dados fornecidos (Acadêmicos e Financeiros) para embasar suas respostas com precisão.
- O sistema financeiro está conectado: ao analisar riscos, infraestrutura ou estratégia, considere custos, inadimplência e receitas.
- Se faltarem dados, faça suposições razoáveis baseadas no contexto escolar ou peça mais informações.
- Responda em português.
- Use FORMATAÇÃO MARKDOWN: abuse de listas, negritos, títulos (##) para organizar a resposta.
- IMPORTANTE: Sempre que fizer citações ou referências a leis, normas ou autores, tente seguir o padrão da norma ABNT (Associação Brasileira de Normas Técnicas) para citações e referências bibliográficas.
- Seja profissional, analítico e direto.
`;

            // Simplified approach: Send the prompt + last few messages + new message
            const historyText = messages.slice(-4).map(m => `${m.role === 'user' ? 'Usuário' : 'Agente'}: ${m.text}`).join('\n');
            const prompt = `${historyText}\nUsuário: ${userMsg}\nAgente:`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: fullSystemPrompt,
                }
            });

            const responseText = response.text || "Desculpe, não consegui processar essa solicitação.";

            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (error) {
            console.error("Erro no Agente IA:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro ao processar sua mensagem. Verifique a conexão ou a chave de API." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (selectedAgent) {
        return (
            <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in">
                {/* Header do Chat */}
                <div className="glass-panel rounded-2xl p-4 mb-4 flex items-center justify-between border border-white/10 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${selectedAgent.color}`}></div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedAgent(null)} 
                            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            title="Voltar para seleção"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedAgent.color} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                            <CpuIcon className="w-6 h-6 text-white" />
                        </div>
                        
                        <div>
                            <h1 className="text-xl font-bold text-white font-display tracking-wide">{selectedAgent.title}</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-gray-400 text-xs uppercase tracking-wider">Online • Instituto Sampaio Viegas</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Área de Mensagens */}
                <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 relative">
                    {/* Background decorativo sutil */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none"></div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`max-w-[85%] rounded-2xl p-5 shadow-lg backdrop-blur-md ${
                                    msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black rounded-tr-none shadow-yellow-500/20' 
                                    : 'bg-gray-800/80 text-white rounded-tl-none border border-white/10 shadow-black/40'
                                }`}>
                                    {msg.role === 'user' ? (
                                        <p className="font-medium">{msg.text}</p>
                                    ) : (
                                        <MarkdownRenderer content={msg.text} />
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-gray-800/80 text-white rounded-2xl rounded-tl-none p-5 border border-white/10 flex items-center gap-4 shadow-lg">
                                    <div className="relative">
                                        <CpuIcon className="w-6 h-6 text-yellow-400 animate-pulse" />
                                        <div className="absolute inset-0 bg-yellow-400 blur-md opacity-40 animate-pulse"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-yellow-400">Processando dados...</span>
                                        <span className="text-xs text-gray-500">Analisando contexto financeiro e acadêmico</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-xl">
                        <form onSubmit={handleSendMessage} className="flex gap-4 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua solicitação..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 placeholder-gray-500 transition-all shadow-inner"
                            />
                            <button 
                                type="submit" 
                                disabled={isLoading || !input.trim()}
                                className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] transform hover:scale-105"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                <span className="hidden md:inline">Enviar</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-12 text-center relative">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <h1 className="text-5xl font-bold font-display text-white mb-4 flex justify-center items-center gap-4 tracking-tight">
                    <CpuIcon className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                    Departamento de IA
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Selecione um agente especializado para obter insights profundos.
                    <br/>
                    <span className="text-sm bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20 mt-2 inline-block">
                        ● Dados Acadêmicos e Financeiros Sincronizados
                    </span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
                {AGENTS.map(agent => (
                    <div 
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className="group relative bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 cursor-pointer border border-white/5 hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Hover Gradient Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                        
                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className={`p-4 rounded-xl bg-gradient-to-br ${agent.color} shadow-lg ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                                <CpuIcon className="w-8 h-8 text-white" />
                            </div>
                            <div className="bg-white/5 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowLeftIcon className="w-4 h-4 text-white rotate-180" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2 font-display relative z-10 group-hover:text-yellow-400 transition-colors">{agent.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed relative z-10 group-hover:text-gray-200 transition-colors">{agent.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AiDepartmentPage;
