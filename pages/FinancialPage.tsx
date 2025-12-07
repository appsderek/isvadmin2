
import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { FinancialTransaction, TransactionType, FinancialCategory, FinancialService, DiscountRule, CostCenter, PenaltyConfig, Supplier, TransactionStatus, PaymentMethod } from '../types';
import { TrashIcon, XIcon, CloudIcon, ClipboardCheckIcon, PencilIcon, ChartBarIcon, CalendarIcon, CameraIcon, SparklesIcon } from '../components/icons';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { GoogleGenAI } from '@google/genai';

type FinancialTab = 'overview' | 'income' | 'expense' | 'suppliers' | 'settings' | 'analytics';

// --- MODAL COMPONENT ---
const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg relative animate-fade-in-up border border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold font-display text-yellow-400 mb-6 border-b border-gray-700 pb-2">{title}</h2>
                {children}
            </div>
        </div>
    );
};

// --- SETTINGS SECTION COMPONENT ---
const SettingsSection: React.FC<{ title: string, children: React.ReactNode, onAdd?: () => void, addButtonText?: string }> = ({ title, children, onAdd, addButtonText }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            {onAdd && (
                <button onClick={onAdd} className="bg-yellow-400 text-black font-bold py-1 px-3 rounded text-sm hover:bg-yellow-500 transition-colors">
                    {addButtonText || '+ Adicionar'}
                </button>
            )}
        </div>
        {children}
    </div>
);

// --- MAIN PAGE COMPONENT ---

const FinancialPage: React.FC = () => {
    const { 
        transactions, addTransaction, deleteTransaction, markAsPaid, generateTuitionBatch, generateStudentCarne, importTransactions,
        financialCategories, addFinancialCategory, updateFinancialCategory, deleteFinancialCategory,
        financialServices, addFinancialService, updateFinancialService, deleteFinancialService,
        discountRules, addDiscountRule, updateDiscountRule, deleteDiscountRule,
        costCenters, addCostCenter, updateCostCenter, deleteCostCenter,
        suppliers, addSupplier, updateSupplier, deleteSupplier,
        penaltyConfig, updatePenaltyConfig,
        students, classes
    } = useData();

    const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
    
    // Modal & Delete States
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false); // Generalized Batch Modal
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [isCostCenterModalOpen, setIsCostCenterModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCarneModalOpen, setIsCarneModalOpen] = useState(false);

    // Edit State Trackers
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
    const [editingCostCenterId, setEditingCostCenterId] = useState<string | null>(null);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

    const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: string} | null>(null);
    const [transactionToPay, setTransactionToPay] = useState<FinancialTransaction | null>(null);

    // Form States
    const [newTransaction, setNewTransaction] = useState<Omit<FinancialTransaction, 'id'>>({
        description: '', amount: 0, type: TransactionType.Expense, date: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0], category: '', costCenterId: '', status: TransactionStatus.Pending
    });

    // Batch Entry State
    const [batchDates, setBatchDates] = useState<string[]>([]);
    const [tempBatchDate, setTempBatchDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Config Forms
    const [newCategory, setNewCategory] = useState<{name: string, type: TransactionType}>({ name: '', type: TransactionType.Expense });
    const [newService, setNewService] = useState<{name: string, value: number}>({ name: '', value: 0 });
    const [newDiscount, setNewDiscount] = useState<{name: string, type: 'PERCENTAGE' | 'FIXED', value: number, condition: string}>({ name: '', type: 'PERCENTAGE', value: 0, condition: '' });
    const [newCostCenter, setNewCostCenter] = useState<{name: string, code: string}>({ name: '', code: '' });
    const [newSupplier, setNewSupplier] = useState<{name: string, cnpj: string, category: string}>({ name: '', cnpj: '', category: '' });
    const [tempPenalty, setTempPenalty] = useState<PenaltyConfig>(penaltyConfig);

    // Batch Generation State (Tuition)
    const [batchMonth, setBatchMonth] = useState(new Date().getMonth() + 1);
    const [batchYear, setBatchYear] = useState(new Date().getFullYear());
    const [batchServiceId, setBatchServiceId] = useState('');
    const [batchDueDate, setBatchDueDate] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-10`);

    // Carne Generation State
    const [carneStudentId, setCarneStudentId] = useState('');
    const [carneServiceId, setCarneServiceId] = useState('');
    const [carneYear, setCarneYear] = useState(new Date().getFullYear());

    // Import State
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // AI Receipt Scanner State
    const receiptInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Derived Data
    const financialSummary = useMemo(() => {
        const income = transactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0);
        const pendingIncome = transactions.filter(t => t.type === TransactionType.Income && t.status === TransactionStatus.Pending).reduce((sum, t) => sum + t.amount, 0);
        const pendingExpense = transactions.filter(t => t.type === TransactionType.Expense && t.status === TransactionStatus.Pending).reduce((sum, t) => sum + t.amount, 0);
        
        return { income, expense, balance: income - expense, pendingIncome, pendingExpense };
    }, [transactions]);

    // --- ANALYTICS DATA ---
    const analyticsData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();

        // 1. KPIs
        const totalIncome = transactions.filter(t => t.type === TransactionType.Income).reduce((acc, t) => acc + t.amount, 0);
        const paidIncome = transactions.filter(t => t.type === TransactionType.Income && t.status === TransactionStatus.Paid).reduce((acc, t) => acc + t.amount, 0);
        const overdueIncome = transactions.filter(t => t.type === TransactionType.Income && t.status === TransactionStatus.Overdue).reduce((acc, t) => acc + t.amount, 0);
        const totalExpenses = transactions.filter(t => t.type === TransactionType.Expense).reduce((acc, t) => acc + t.amount, 0);
        
        const delinquencyRate = totalIncome > 0 ? (overdueIncome / totalIncome) * 100 : 0;
        
        // Ticket Médio (Total Revenue / Unique Paying Students)
        const uniquePayingStudents = new Set(transactions.filter(t => t.type === TransactionType.Income && t.studentId).map(t => t.studentId)).size;
        const avgTicket = uniquePayingStudents > 0 ? totalIncome / uniquePayingStudents : 0;

        // 2. DRE Structure (Simplified)
        const dre = {
            grossRevenue: totalIncome,
            deductions: 0, // Placeholder for taxes/discounts logic if stored separately
            netRevenue: totalIncome,
            expensesByCategory: {} as Record<string, number>,
            result: totalIncome - totalExpenses
        };

        transactions.filter(t => t.type === TransactionType.Expense).forEach(t => {
            dre.expensesByCategory[t.category] = (dre.expensesByCategory[t.category] || 0) + t.amount;
        });

        // 3. Cash Flow (Monthly for current year)
        const monthlyFlow: { month: number; income: number; expense: number; balance: number }[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0, balance: 0 }));
        
        transactions.forEach(t => {
            const dateStr = t.date.includes('T') ? t.date.split('T')[0] : t.date;
            
            if (dateStr && dateStr.includes('-')) {
                const [yStr, mStr] = dateStr.split('-');
                const year = parseInt(yStr);
                const monthIndex = parseInt(mStr) - 1; // 0-11
                
                if (year === currentYear && monthIndex >= 0 && monthIndex <= 11) {
                    if (t.type === TransactionType.Income) monthlyFlow[monthIndex].income += t.amount;
                    else monthlyFlow[monthIndex].expense += t.amount;
                }
            }
        });
        monthlyFlow.forEach(m => m.balance = m.income - m.expense);

        // 4. Delinquency List
        const delinquentStudents = students.filter(s => {
            return transactions.some(t => t.studentId === s.id && t.status === TransactionStatus.Overdue);
        }).map(s => {
            const debts = transactions.filter(t => t.studentId === s.id && t.status === TransactionStatus.Overdue);
            const totalDebt = debts.reduce((acc, t) => acc + t.amount, 0);
            return { ...s, totalDebt, debtsCount: debts.length };
        }).sort((a, b) => b.totalDebt - a.totalDebt);

        return { kpis: { paidIncome, overdueIncome, totalExpenses, delinquencyRate, avgTicket }, dre, monthlyFlow, delinquentStudents, currentYear };
    }, [transactions, students]);


    // Handlers
    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTransaction.description || newTransaction.amount <= 0) return;
        addTransaction(newTransaction);
        setIsTransModalOpen(false);
        resetTransForm();
    };

    // --- AI RECEIPT SCANNER ---
    const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Automatically open modal and set as Expense
        setIsTransModalOpen(true);
        setNewTransaction(prev => ({ ...prev, type: TransactionType.Expense }));
        setIsScanning(true);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        try {
            // Convert file to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = async () => {
                const base64Data = reader.result?.toString().split(',')[1];
                if (!base64Data) return;

                const model = 'gemini-2.5-flash';
                const prompt = `
                    Analyze this receipt, invoice, or bill (boleto). Extract the following information in JSON format:
                    - description: A short summary of the service executed or items purchased.
                    - amount: The total value to pay (number).
                    - dueDate: The due date (Data de Vencimento) or transaction date in YYYY-MM-DD format.
                    - supplierName: The name of the company/entity charging (Fornecedor).
                    - category: Suggest one of these categories: [${financialCategories.map(c => c.name).join(', ')}] based on the content.
                    
                    Return ONLY the JSON.
                `;

                const result = await ai.models.generateContent({
                    model: model,
                    contents: {
                        parts: [
                            { inlineData: { mimeType: file.type, data: base64Data } },
                            { text: prompt }
                        ]
                    }
                });

                const text = result.text || "{}";
                const jsonStr = text.replace(/```json|```/g, '').trim();
                let data;
                try {
                    data = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("Failed to parse JSON from AI", e);
                    data = {};
                }

                // Try to find supplier match
                const matchedSupplier = suppliers.find(s => 
                    (data.supplierName && s.name.toLowerCase().includes(data.supplierName.toLowerCase())) || 
                    (data.supplierName && data.supplierName.toLowerCase().includes(s.name.toLowerCase()))
                );

                setNewTransaction(prev => ({
                    ...prev,
                    description: data.supplierName ? `${data.description} (${data.supplierName})` : (data.description || prev.description),
                    amount: data.amount || prev.amount,
                    date: data.dueDate || new Date().toISOString().split('T')[0],
                    dueDate: data.dueDate || prev.dueDate,
                    category: data.category || prev.category,
                    supplierId: matchedSupplier ? matchedSupplier.id : prev.supplierId
                }));
                setIsScanning(false);
            };

        } catch (error) {
            console.error("Error scanning receipt:", error);
            alert("Não foi possível ler o documento. Tente novamente ou preencha manualmente.");
            setIsScanning(false);
        } finally {
            if (receiptInputRef.current) receiptInputRef.current.value = '';
        }
    };

    // --- BATCH TRANSACTION HANDLERS ---
    const handleOpenBatchModal = (type: TransactionType) => {
        setNewTransaction({ 
            ...newTransaction, 
            type: type, 
            status: TransactionStatus.Paid, 
            studentId: '',
            supplierId: '',
            category: ''
        });
        setBatchDates([new Date().toISOString().split('T')[0]]);
        setTempBatchDate(new Date().toISOString().split('T')[0]);
        setIsBatchModalOpen(true);
    };

    const handleAddBatchDate = () => {
        if (!batchDates.includes(tempBatchDate)) {
            setBatchDates(prev => [...prev, tempBatchDate].sort());
        }
    };

    const handleAddFullYearDates = () => {
        const selected = new Date(tempBatchDate);
        const day = selected.getDate();
        const year = selected.getFullYear();
        const newDates: string[] = [];
        
        for (let m = 0; m < 12; m++) {
            const d = new Date(year, m, day);
            if (d.getMonth() !== m) {
               const lastDay = new Date(year, m + 1, 0);
               newDates.push(lastDay.toISOString().split('T')[0]);
            } else {
               newDates.push(d.toISOString().split('T')[0]);
            }
        }
        
        const unique = Array.from(new Set([...batchDates, ...newDates])).sort();
        setBatchDates(unique);
    };

    const handleRemoveBatchDate = (dateToRemove: string) => {
        setBatchDates(prev => prev.filter(d => d !== dateToRemove));
    };

    const handleSaveBatchTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTransaction.description || newTransaction.amount <= 0 || batchDates.length === 0) return;

        batchDates.forEach(date => {
            addTransaction({
                ...newTransaction,
                date: date,
                dueDate: date, 
                description: `${newTransaction.description} (${new Date(date).toLocaleDateString('pt-BR')})`
            });
        });

        setIsBatchModalOpen(false);
        resetTransForm();
        setBatchDates([]);
        alert(`${batchDates.length} lançamentos realizados com sucesso!`);
    };
    
    const resetTransForm = () => {
        setNewTransaction({ description: '', amount: 0, type: TransactionType.Expense, date: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0], category: '', costCenterId: '', status: TransactionStatus.Pending });
    };

    const handleGenerateTuition = () => {
        if (!batchServiceId) {
            alert("Selecione um serviço/valor");
            return;
        }
        generateTuitionBatch(batchMonth, batchYear, batchDueDate, batchServiceId);
        alert("Mensalidades geradas!");
    };
    
    const handleGenerateCarne = () => {
        if (!carneStudentId || !carneServiceId) {
            alert("Selecione Aluno e Serviço.");
            return;
        }
        generateStudentCarne(carneStudentId, carneServiceId, carneYear);
        setIsCarneModalOpen(false);
        alert("Carnê gerado com sucesso! Os boletos estão disponíveis na página do responsável.");
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) importTransactions(text);
        };
        reader.readAsText(file);
    };

    const handlePayClick = (t: FinancialTransaction) => {
        setTransactionToPay(t);
        setIsPaymentModalOpen(true);
    };

    const confirmPayment = (method: PaymentMethod) => {
        if (transactionToPay) {
            markAsPaid(transactionToPay.id, new Date().toISOString().split('T')[0], method);
            setIsPaymentModalOpen(false);
            setTransactionToPay(null);
        }
    };
    
    // --- GENERIC FORM HANDLERS (ADD/EDIT) ---
    // (Existing handlers for categories, services, etc. retained)
    const handleOpenCategoryModal = (cat?: FinancialCategory) => {
        if (cat) { setNewCategory({ name: cat.name, type: cat.type }); setEditingCategoryId(cat.id); } 
        else { setNewCategory({ name: '', type: TransactionType.Expense }); setEditingCategoryId(null); }
        setIsCategoryModalOpen(true);
    };
    const handleSaveCategory = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (editingCategoryId) updateFinancialCategory(editingCategoryId, newCategory); else addFinancialCategory(newCategory);
        setIsCategoryModalOpen(false); 
    };

    const handleOpenServiceModal = (serv?: FinancialService) => {
        if (serv) { setNewService({ name: serv.name, value: serv.value }); setEditingServiceId(serv.id); } 
        else { setNewService({ name: '', value: 0 }); setEditingServiceId(null); }
        setIsServiceModalOpen(true);
    };
    const handleSaveService = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (editingServiceId) updateFinancialService(editingServiceId, newService); else addFinancialService(newService);
        setIsServiceModalOpen(false); 
    };

    const handleOpenDiscountModal = (disc?: DiscountRule) => {
        if (disc) { setNewDiscount({ name: disc.name, type: disc.type, value: disc.value, condition: disc.condition || '' }); setEditingDiscountId(disc.id); } 
        else { setNewDiscount({ name: '', type: 'PERCENTAGE', value: 0, condition: '' }); setEditingDiscountId(null); }
        setIsDiscountModalOpen(true);
    };
    const handleSaveDiscount = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (editingDiscountId) updateDiscountRule(editingDiscountId, newDiscount); else addDiscountRule(newDiscount);
        setIsDiscountModalOpen(false); 
    };

    const handleOpenCostCenterModal = (cc?: CostCenter) => {
        if (cc) { setNewCostCenter({ name: cc.name, code: cc.code || '' }); setEditingCostCenterId(cc.id); } 
        else { setNewCostCenter({ name: '', code: '' }); setEditingCostCenterId(null); }
        setIsCostCenterModalOpen(true);
    };
    const handleSaveCostCenter = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (editingCostCenterId) updateCostCenter(editingCostCenterId, newCostCenter); else addCostCenter(newCostCenter);
        setIsCostCenterModalOpen(false); 
    };

    const handleOpenSupplierModal = (sup?: Supplier) => {
        if (sup) { setNewSupplier({ name: sup.name, cnpj: sup.cnpj || '', category: sup.category }); setEditingSupplierId(sup.id); } 
        else { setNewSupplier({ name: '', cnpj: '', category: '' }); setEditingSupplierId(null); }
        setIsSupplierModalOpen(true);
    };
    const handleSaveSupplier = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (editingSupplierId) updateSupplier(editingSupplierId, newSupplier); else addSupplier(newSupplier);
        setIsSupplierModalOpen(false); 
    };

    const handleUpdatePenalty = () => { updatePenaltyConfig(tempPenalty); alert('Configurações salvas!'); };

    const performDelete = () => {
        if (!itemToDelete) return;
        switch (itemToDelete.type) {
            case 'transaction': deleteTransaction(itemToDelete.id); break;
            case 'category': deleteFinancialCategory(itemToDelete.id); break;
            case 'service': deleteFinancialService(itemToDelete.id); break;
            case 'discount': deleteDiscountRule(itemToDelete.id); break;
            case 'costCenter': deleteCostCenter(itemToDelete.id); break;
            case 'supplier': deleteSupplier(itemToDelete.id); break;
        }
        setItemToDelete(null);
    };

    const renderTransactionTable = (type: TransactionType) => (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Vencimento</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">{type === TransactionType.Income ? 'Aluno' : 'Fornecedor'}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {transactions
                        .filter(t => t.type === type)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(t => {
                            const entityName = type === TransactionType.Income 
                                ? students.find(s => s.id === t.studentId)?.name 
                                : suppliers.find(s => s.id === t.supplierId)?.name;
                            
                            return (
                                <tr key={t.id} className="hover:bg-gray-750">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{t.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{entityName || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{t.category}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${t.type === TransactionType.Income ? 'text-green-400' : 'text-red-400'}`}>
                                        {t.type === TransactionType.Expense && '- '}R$ {t.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            t.status === TransactionStatus.Paid ? 'bg-green-900 text-green-200' :
                                            t.status === TransactionStatus.Overdue ? 'bg-red-900 text-red-200' :
                                            'bg-yellow-900 text-yellow-200'
                                        }`}>
                                            {t.status === TransactionStatus.Paid ? 'PAGO' : t.status === TransactionStatus.Overdue ? 'ATRASADO' : 'PENDENTE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                        {t.status === TransactionStatus.Pending && (
                                            <button onClick={() => handlePayClick(t)} className="text-green-400 hover:text-green-500" title="Dar Baixa / Confirmar Pagamento">
                                                <ClipboardCheckIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button onClick={() => setItemToDelete({id: t.id, name: t.description, type: 'transaction'})} className="text-red-400 hover:text-red-600">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div>
            {/* GLOBAL HIDDEN INPUT FOR SCANNER */}
            <input 
                type="file" 
                accept="image/*" 
                ref={receiptInputRef} 
                onChange={handleReceiptUpload} 
                className="hidden" 
            />

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold font-display text-white">Gerenciamento Financeiro</h1>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Visão Geral</button>
                    <button onClick={() => setActiveTab('income')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'income' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Receitas</button>
                    <button onClick={() => setActiveTab('expense')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'expense' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Despesas</button>
                    <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Fornecedores</button>
                    <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Relatórios e Análises</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Configurações</button>
                </div>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-green-500">
                            <h3 className="text-gray-400 text-sm font-bold uppercase">Receitas Totais</h3>
                            <p className="text-2xl font-bold text-white mt-2">R$ {financialSummary.income.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-red-500">
                            <h3 className="text-gray-400 text-sm font-bold uppercase">Despesas Totais</h3>
                            <p className="text-2xl font-bold text-white mt-2">R$ {financialSummary.expense.toFixed(2)}</p>
                        </div>
                         <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-yellow-400">
                            <h3 className="text-gray-400 text-sm font-bold uppercase">A Receber (Pendente)</h3>
                            <p className="text-2xl font-bold text-white mt-2">R$ {financialSummary.pendingIncome.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 border-blue-400">
                            <h3 className="text-gray-400 text-sm font-bold uppercase">Saldo Líquido</h3>
                            <p className="text-2xl font-bold text-white mt-2">R$ {financialSummary.balance.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-yellow-400" />
                            Resumo Mensal de Movimentações
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-300 uppercase font-bold">Mês</th>
                                        <th className="px-4 py-3 text-right text-green-400 uppercase font-bold">Entradas</th>
                                        <th className="px-4 py-3 text-right text-red-400 uppercase font-bold">Saídas</th>
                                        <th className="px-4 py-3 text-right text-yellow-400 uppercase font-bold">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {analyticsData.monthlyFlow.filter(m => m.income > 0 || m.expense > 0).length > 0 ? (
                                        analyticsData.monthlyFlow.filter(m => m.income > 0 || m.expense > 0).map((m) => (
                                            <tr key={m.month} className="hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">
                                                    {new Date(analyticsData.currentYear, m.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                                                </td>
                                                <td className="px-4 py-3 text-right text-green-400 font-bold">
                                                    R$ {m.income.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-400 font-bold">
                                                    R$ {m.expense.toFixed(2)}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${m.balance >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                                                    R$ {m.balance.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                                                Nenhuma movimentação registrada neste ano.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* INCOME TAB */}
            {activeTab === 'income' && (
                <div className="animate-fade-in">
                    <div className="bg-gray-800 p-4 rounded-lg mb-6 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <h3 className="text-white font-bold mb-2">Geração em Lote</h3>
                            <div className="flex gap-2">
                                <select value={batchMonth} onChange={e => setBatchMonth(Number(e.target.value))} className="bg-gray-700 border border-gray-600 rounded p-2 text-white">
                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>Mês {m}</option>)}
                                </select>
                                <select value={batchServiceId} onChange={e => setBatchServiceId(e.target.value)} className="bg-gray-700 border border-gray-600 rounded p-2 text-white w-full">
                                    <option value="">Selecione a Mensalidade...</option>
                                    {financialServices.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.value}</option>)}
                                </select>
                                <input type="date" value={batchDueDate} onChange={e => setBatchDueDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                                <button onClick={handleGenerateTuition} className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 whitespace-nowrap">Gerar Cobranças</button>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setIsCarneModalOpen(true)} className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap">
                                <ClipboardCheckIcon className="w-5 h-5"/> Gerar Carnê
                            </button>
                            <button onClick={() => handleOpenBatchModal(TransactionType.Income)} className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 flex items-center gap-2 whitespace-nowrap">
                                <CalendarIcon className="w-5 h-5"/> Lançamento em Lote
                            </button>
                             <button onClick={() => { setNewTransaction({ ...newTransaction, type: TransactionType.Income }); setIsTransModalOpen(true); }} className="bg-yellow-400 text-black font-bold py-2 px-4 rounded hover:bg-yellow-500 whitespace-nowrap h-10">
                                + Avulso
                            </button>
                        </div>
                    </div>
                    {renderTransactionTable(TransactionType.Income)}
                </div>
            )}

            {/* EXPENSE TAB */}
            {activeTab === 'expense' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between mb-4 bg-gray-800 p-4 rounded-lg flex-wrap gap-4">
                        <div className="flex gap-4 items-center">
                            <h3 className="text-white font-bold">Ações Rápidas:</h3>
                            <div className="relative overflow-hidden inline-block">
                                <button className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600 flex items-center gap-2">
                                    <CloudIcon className="w-5 h-5"/> Importar OFX/CSV
                                </button>
                                <input type="file" accept=".csv,.ofx" onChange={handleImportFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <button 
                                onClick={() => receiptInputRef.current?.click()} 
                                className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-500 flex items-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all"
                            >
                                <CameraIcon className="w-5 h-5"/> Escanear Nota Fiscal (IA)
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenBatchModal(TransactionType.Expense)} className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5"/> Lançamento em Lote
                            </button>
                            <button onClick={() => { setNewTransaction({ ...newTransaction, type: TransactionType.Expense }); setIsTransModalOpen(true); }} className="bg-yellow-400 text-black font-bold py-2 px-4 rounded hover:bg-yellow-500">
                                + Nova Despesa
                            </button>
                        </div>
                    </div>
                    {renderTransactionTable(TransactionType.Expense)}
                </div>
            )}

             {/* SUPPLIERS TAB */}
             {activeTab === 'suppliers' && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Base de Fornecedores</h2>
                        <button onClick={() => handleOpenSupplierModal()} className="bg-yellow-400 text-black font-bold py-2 px-4 rounded hover:bg-yellow-500">+ Novo Fornecedor</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {suppliers.map(sup => (
                            <div key={sup.id} className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 relative">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-white">{sup.name}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenSupplierModal(sup)} className="text-yellow-400 hover:text-yellow-500"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setItemToDelete({id: sup.id, name: sup.name, type: 'supplier'})} className="text-red-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">{sup.category}</p>
                                <div className="mt-4 pt-4 border-t border-gray-700 text-sm">
                                    <p className="text-gray-300">CNPJ: {sup.cnpj || 'N/A'}</p>
                                    <p className="text-gray-300">Contato: {sup.contact || 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
                <div className="animate-fade-in space-y-8">
                    {/* Header & KPI Cards */}
                    <div>
                        <div className="flex justify-between items-end mb-4">
                            <h2 className="text-2xl font-bold font-display text-white">Dashboard de Inteligência Financeira</h2>
                            <span className="text-sm text-gray-400">Dados consolidados do ano atual</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-green-500">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Receita Realizada</h3>
                                <div className="flex items-baseline mt-1">
                                    <span className="text-2xl font-bold text-white">R$ {analyticsData.kpis.paidIncome.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Valores efetivamente pagos</p>
                            </div>
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-red-500">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Inadimplência Geral</h3>
                                <div className="flex items-baseline mt-1">
                                    <span className="text-2xl font-bold text-white">{analyticsData.kpis.delinquencyRate.toFixed(1)}%</span>
                                    <span className="ml-2 text-sm text-red-400">(R$ {analyticsData.kpis.overdueIncome.toFixed(2)})</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Sobre receita total lançada</p>
                            </div>
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-orange-500">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Custo Operacional</h3>
                                <div className="flex items-baseline mt-1">
                                    <span className="text-2xl font-bold text-white">R$ {analyticsData.kpis.totalExpenses.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Despesas totais acumuladas</p>
                            </div>
                             <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-blue-500">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ticket Médio</h3>
                                <div className="flex items-baseline mt-1">
                                    <span className="text-2xl font-bold text-white">R$ {analyticsData.kpis.avgTicket.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Por aluno pagante</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Cash Flow Chart Visualization */}
                        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <ChartBarIcon className="w-5 h-5 text-yellow-400" />
                                Fluxo de Caixa (Mensal)
                            </h3>
                            <div className="h-64 flex items-end justify-between gap-2">
                                {analyticsData.monthlyFlow.map((m, idx) => {
                                    // Normalize height for visualization (max 100%)
                                    const maxVal = Math.max(...analyticsData.monthlyFlow.map(x => Math.max(x.income, x.expense))) || 1;
                                    const incHeight = (m.income / maxVal) * 100;
                                    const expHeight = (m.expense / maxVal) * 100;
                                    
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative">
                                            <div className="w-full flex justify-center items-end gap-1 h-full">
                                                <div style={{height: `${incHeight}%`}} className="w-3 bg-green-500/80 rounded-t hover:bg-green-400 transition-all relative"></div>
                                                <div style={{height: `${expHeight}%`}} className="w-3 bg-red-500/80 rounded-t hover:bg-red-400 transition-all relative"></div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-2">
                                                {new Date(0, idx).toLocaleDateString('pt-BR', {month: 'short'})}
                                            </span>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-xs p-2 rounded border border-gray-600 z-10 whitespace-nowrap">
                                                <div className="text-green-400">Entrada: R$ {m.income.toFixed(0)}</div>
                                                <div className="text-red-400">Saída: R$ {m.expense.toFixed(0)}</div>
                                                <div className="text-white border-t border-gray-700 pt-1 mt-1">Saldo: R$ {m.balance.toFixed(0)}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* DRE Simplified */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-bold text-white mb-6">DRE Gerencial (Resumo)</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                                    <span className="text-green-400 font-bold">(+) Receita Bruta</span>
                                    <span className="text-white">R$ {analyticsData.dre.grossRevenue.toFixed(2)}</span>
                                </div>
                                {Object.entries(analyticsData.dre.expensesByCategory).map(([cat, val]) => (
                                    <div key={cat} className="flex justify-between items-center pl-4">
                                        <span className="text-gray-400">(-) {cat}</span>
                                        <span className="text-gray-300">R$ {(val as number).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-4 border-t-2 border-gray-600 mt-2">
                                    <span className="text-xl font-bold text-yellow-400">(=) Resultado</span>
                                    <span className={`text-xl font-bold ${analyticsData.dre.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        R$ {analyticsData.dre.result.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delinquency Report Table */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white text-red-400 flex items-center gap-2">
                                ⚠️ Relatório de Inadimplência
                            </h3>
                            <span className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded">
                                {analyticsData.delinquentStudents.length} Alunos com Pendências
                            </span>
                        </div>
                        <div className="overflow-x-auto max-h-60">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-gray-300">Aluno</th>
                                        <th className="px-4 py-2 text-left text-gray-300">Turma</th>
                                        <th className="px-4 py-2 text-center text-gray-300">Qtd. Débitos</th>
                                        <th className="px-4 py-2 text-right text-gray-300">Valor Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {analyticsData.delinquentStudents.length > 0 ? analyticsData.delinquentStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-700/50">
                                            <td className="px-4 py-2 text-white font-medium">{s.name}</td>
                                            <td className="px-4 py-2 text-gray-400">{classes.find(c => c.id === s.classId)?.name}</td>
                                            <td className="px-4 py-2 text-center text-gray-400">{s.debtsCount}</td>
                                            <td className="px-4 py-2 text-right text-red-400 font-bold">R$ {s.totalDebt.toFixed(2)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-gray-500">Nenhuma inadimplência registrada.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* AI Prediction Placeholder */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-lg shadow-lg border border-gray-600 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">IA Financeira Preditiva</h3>
                            <p className="text-gray-400 text-sm">Use nossa Inteligência Artificial para prever fluxo de caixa futuro e risco de evasão.</p>
                        </div>
                        <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-transform hover:scale-105">
                            Consultar Agente Financeiro
                        </button>
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Plano de Contas */}
                    <SettingsSection title="Plano de Contas" onAdd={() => handleOpenCategoryModal()}>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {financialCategories.map(cat => (
                                <div key={cat.id} className="flex justify-between items-center bg-gray-700 p-3 rounded border-l-4 border-gray-500">
                                    <span className="text-white">{cat.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${cat.type === TransactionType.Income ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                            {cat.type === TransactionType.Income ? 'Receita' : 'Despesa'}
                                        </span>
                                        <button onClick={() => handleOpenCategoryModal(cat)} className="text-yellow-400 hover:text-yellow-500"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setItemToDelete({id: cat.id, name: cat.name, type: 'category'})} className="text-red-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>

                    {/* Serviços e Mensalidades */}
                    <SettingsSection title="Tabela de Mensalidades e Serviços" onAdd={() => handleOpenServiceModal()}>
                         <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {financialServices.map(serv => (
                                <div key={serv.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                    <div>
                                        <p className="text-white font-medium">{serv.name}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-yellow-400 font-bold">R$ {serv.value.toFixed(2)}</span>
                                        <button onClick={() => handleOpenServiceModal(serv)} className="text-yellow-400 hover:text-yellow-500"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setItemToDelete({id: serv.id, name: serv.name, type: 'service'})} className="text-red-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>

                     {/* Regras de Desconto */}
                     <SettingsSection title="Regras de Desconto" onAdd={() => handleOpenDiscountModal()}>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {discountRules.map(rule => (
                                <div key={rule.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                    <div>
                                        <p className="text-white font-medium">{rule.name}</p>
                                        <p className="text-xs text-gray-400">{rule.condition}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-green-400 font-bold">{rule.type === 'PERCENTAGE' ? `${rule.value}%` : `R$ ${rule.value.toFixed(2)}`}</span>
                                        <button onClick={() => handleOpenDiscountModal(rule)} className="text-yellow-400 hover:text-yellow-500"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setItemToDelete({id: rule.id, name: rule.name, type: 'discount'})} className="text-red-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>

                    {/* Centros de Custo */}
                     <SettingsSection title="Centros de Custo" onAdd={() => handleOpenCostCenterModal()}>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {costCenters.map(cc => (
                                <div key={cc.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                                    <span className="text-white">{cc.code} - {cc.name}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenCostCenterModal(cc)} className="text-yellow-400 hover:text-yellow-500"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setItemToDelete({id: cc.id, name: cc.name, type: 'costCenter'})} className="text-red-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SettingsSection>

                    {/* Juros e Multas */}
                    <div className="lg:col-span-2">
                        <SettingsSection title="Configuração de Juros e Multas" addButtonText="Atualizar" onAdd={handleUpdatePenalty}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Multa por Atraso (%)</label>
                                    <input type="number" value={tempPenalty.finePercentage} onChange={e => setTempPenalty({...tempPenalty, finePercentage: Number(e.target.value)})} className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"/>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Juros Mensais (%)</label>
                                    <input type="number" value={tempPenalty.interestRate} onChange={e => setTempPenalty({...tempPenalty, interestRate: Number(e.target.value)})} className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"/>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-300 mb-1">Dias de Carência</label>
                                    <input type="number" value={tempPenalty.gracePeriodDays} onChange={e => setTempPenalty({...tempPenalty, gracePeriodDays: Number(e.target.value)})} className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"/>
                                </div>
                            </div>
                        </SettingsSection>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* TRANSACTION MODAL */}
            <Modal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} title={`Nova ${newTransaction.type === TransactionType.Income ? 'Receita' : 'Despesa'}`}>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                    {/* Scanner Button inside Modal */}
                    <div className="flex justify-end mb-2">
                        <button 
                            type="button"
                            onClick={() => receiptInputRef.current?.click()}
                            disabled={isScanning}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-bold py-2 px-4 rounded-full flex items-center gap-2 shadow-lg transition-all"
                        >
                            {isScanning ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Lendo Documento...
                                </>
                            ) : (
                                <>
                                    <CameraIcon className="w-4 h-4" />
                                    Escanear Nota/Boleto com IA
                                </>
                            )}
                        </button>
                    </div>

                    <input type="text" placeholder="Descrição" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <input type="number" placeholder="Valor" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs text-gray-400 mb-1">Data Lançamento</label>
                             <input type="date" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-400 mb-1">Data Vencimento</label>
                             <input type="date" value={newTransaction.dueDate} onChange={e => setNewTransaction({...newTransaction, dueDate: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                        </div>
                    </div>
                    {/* Dynamic Categories */}
                    <select value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required>
                        <option value="">Selecione a Categoria...</option>
                        {financialCategories.filter(c => c.type === newTransaction.type).map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        {/* Fallback option if scan finds nothing matching */}
                        {!financialCategories.find(c => c.name === newTransaction.category) && newTransaction.category && (
                            <option value={newTransaction.category}>{newTransaction.category} (Sugerido)</option>
                        )}
                    </select>
                     {/* Entity Selection */}
                     {newTransaction.type === TransactionType.Income ? (
                         <select value={newTransaction.studentId || ''} onChange={e => setNewTransaction({...newTransaction, studentId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                             <option value="">Selecione o Aluno (Opcional)...</option>
                             {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                     ) : (
                         <select value={newTransaction.supplierId || ''} onChange={e => setNewTransaction({...newTransaction, supplierId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                             <option value="">Selecione o Fornecedor (Opcional)...</option>
                             {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                     )}

                     {/* Dynamic Cost Centers */}
                     <select value={newTransaction.costCenterId || ''} onChange={e => setNewTransaction({...newTransaction, costCenterId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                        <option value="">Centro de Custo (Opcional)...</option>
                        {costCenters.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                        ))}
                    </select>
                    
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={newTransaction.status === TransactionStatus.Paid} onChange={e => setNewTransaction({...newTransaction, status: e.target.checked ? TransactionStatus.Paid : TransactionStatus.Pending})} className="rounded bg-gray-700 border-gray-600 text-yellow-500" />
                        <label className="text-white text-sm">Marcar como Pago/Recebido</label>
                    </div>

                    <div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500">Salvar</button></div>
                </form>
            </Modal>
            
            {/* CARNE GENERATION MODAL */}
            <Modal isOpen={isCarneModalOpen} onClose={() => setIsCarneModalOpen(false)} title="Gerar Carnê de Mensalidade">
                <div className="space-y-4">
                     <p className="text-gray-300 text-sm">Esta ação irá gerar todas as mensalidades restantes do ano selecionado para o aluno. Os pais poderão baixar o carnê completo no portal.</p>
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aluno</label>
                        <select value={carneStudentId} onChange={e => setCarneStudentId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                            <option value="">Selecione o Aluno...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Plano / Valor</label>
                        <select value={carneServiceId} onChange={e => setCarneServiceId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                            <option value="">Selecione o Plano...</option>
                            {financialServices.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.value.toFixed(2)}</option>)}
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Ano Letivo</label>
                        <select value={carneYear} onChange={e => setCarneYear(Number(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                     </div>

                     <div className="flex justify-end pt-4 gap-4">
                        <button onClick={() => setIsCarneModalOpen(false)} className="text-gray-400 hover:text-white font-bold">Cancelar</button>
                        <button onClick={handleGenerateCarne} className="bg-purple-600 text-white font-bold py-2 px-6 rounded hover:bg-purple-700 shadow-lg">Gerar Carnê</button>
                    </div>
                </div>
            </Modal>

            {/* BATCH TRANSACTION MODAL (GENERIC) */}
            <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title={`Lançamento de ${newTransaction.type === TransactionType.Income ? 'Receita' : 'Despesa'} em Lote`}>
                <form onSubmit={handleSaveBatchTransaction} className="space-y-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <h4 className="text-white font-bold mb-3 text-sm uppercase">1. Detalhes do Lançamento</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <input type="text" placeholder="Descrição (ex: Aluguel, Mensalidade Retroativa)" value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} className="col-span-2 w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                             <input type="number" placeholder="Valor" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                             
                             {/* Dynamic Category based on Type */}
                             <select value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required>
                                <option value="">Categoria...</option>
                                {financialCategories.filter(c => c.type === newTransaction.type).map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>

                            {/* Dynamic Entity Selector */}
                            {newTransaction.type === TransactionType.Income ? (
                                <select value={newTransaction.studentId || ''} onChange={e => setNewTransaction({...newTransaction, studentId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                                    <option value="">Aluno (Opcional)...</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            ) : (
                                <select value={newTransaction.supplierId || ''} onChange={e => setNewTransaction({...newTransaction, supplierId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                                    <option value="">Fornecedor (Opcional)...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            )}

                             {/* Status Selector for History Backfill */}
                             <select value={newTransaction.status} onChange={e => setNewTransaction({...newTransaction, status: e.target.value as TransactionStatus})} className="w-full col-span-2 bg-gray-700 border border-gray-600 rounded p-2 text-white font-bold">
                                <option value={TransactionStatus.Paid}>Status: JÁ PAGO / RECEBIDO</option>
                                <option value={TransactionStatus.Pending}>Status: PENDENTE</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <h4 className="text-white font-bold mb-3 text-sm uppercase">2. Seleção de Datas</h4>
                        <div className="flex gap-2 items-end mb-4">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-400 mb-1">Adicionar Data</label>
                                <input type="date" value={tempBatchDate} onChange={e => setTempBatchDate(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                            </div>
                            <button type="button" onClick={handleAddBatchDate} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded h-10">+</button>
                            <button type="button" onClick={handleAddFullYearDates} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded h-10 w-32">
                                Repetir Ano Todo (Dia {new Date(tempBatchDate).getDate() + 1})
                            </button>
                        </div>
                        
                        <div className="bg-gray-900/50 p-3 rounded-lg min-h-[100px] max-h-[150px] overflow-y-auto border border-gray-700">
                             {batchDates.length === 0 && <p className="text-gray-500 text-xs text-center py-4">Nenhuma data selecionada.</p>}
                             <div className="flex flex-wrap gap-2">
                                {batchDates.map(date => (
                                    <span key={date} className={`px-2 py-1 rounded text-xs flex items-center gap-2 border ${newTransaction.type === TransactionType.Income ? 'bg-green-900/40 border-green-600 text-green-200' : 'bg-red-900/40 border-red-600 text-red-200'}`}>
                                        {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        <button type="button" onClick={() => handleRemoveBatchDate(date)} className="hover:text-white"><XIcon className="w-3 h-3"/></button>
                                    </span>
                                ))}
                             </div>
                        </div>
                        <p className="text-right text-xs text-gray-400 mt-1">{batchDates.length} lançamentos serão criados.</p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={batchDates.length === 0}>
                            Salvar Lote
                        </button>
                    </div>
                </form>
            </Modal>

            {/* SUPPLIER MODAL */}
            <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title={editingSupplierId ? "Editar Fornecedor" : "Novo Fornecedor"}>
                <form onSubmit={handleSaveSupplier} className="space-y-4">
                    <input type="text" placeholder="Nome da Empresa" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <input type="text" placeholder="CNPJ" value={newSupplier.cnpj} onChange={e => setNewSupplier({...newSupplier, cnpj: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                    <input type="text" placeholder="Categoria (ex: Papelaria, Manutenção)" value={newSupplier.category} onChange={e => setNewSupplier({...newSupplier, category: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500">Salvar</button></div>
                </form>
            </Modal>

            {/* PAYMENT CONFIRMATION MODAL */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Confirmar Pagamento">
                <div className="space-y-4">
                    <p className="text-gray-300">Selecione a forma de pagamento para dar baixa:</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => confirmPayment(PaymentMethod.Boleto)} className="bg-gray-700 hover:bg-gray-600 p-3 rounded text-white font-bold">Boleto</button>
                        <button onClick={() => confirmPayment(PaymentMethod.Pix)} className="bg-gray-700 hover:bg-gray-600 p-3 rounded text-white font-bold">Pix</button>
                        <button onClick={() => confirmPayment(PaymentMethod.Cash)} className="bg-gray-700 hover:bg-gray-600 p-3 rounded text-white font-bold">Dinheiro</button>
                        <button onClick={() => confirmPayment(PaymentMethod.Transfer)} className="bg-gray-700 hover:bg-gray-600 p-3 rounded text-white font-bold">Transferência</button>
                    </div>
                </div>
            </Modal>

            {/* Config Modals with Edit Logic */}
            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={editingCategoryId ? "Editar Categoria" : "Nova Categoria"}>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                    <input type="text" placeholder="Nome" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <select value={newCategory.type} onChange={e => setNewCategory({...newCategory, type: e.target.value as TransactionType})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white">
                        <option value={TransactionType.Income}>Receita</option>
                        <option value={TransactionType.Expense}>Despesa</option>
                    </select>
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500">Salvar</button></div>
                </form>
            </Modal>

             <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingServiceId ? "Editar Serviço" : "Novo Serviço/Mensalidade"}>
                <form onSubmit={handleSaveService} className="space-y-4">
                    <input type="text" placeholder="Nome" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <input type="number" placeholder="Valor" value={newService.value} onChange={e => setNewService({...newService, value: Number(e.target.value)})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500">Salvar</button></div>
                </form>
            </Modal>

            <Modal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} title={editingDiscountId ? "Editar Regra de Desconto" : "Nova Regra de Desconto"}>
                <form onSubmit={handleSaveDiscount} className="space-y-4">
                    <input type="text" placeholder="Nome" value={newDiscount.name} onChange={e => setNewDiscount({...newDiscount, name: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <input type="text" placeholder="Condição" value={newDiscount.condition} onChange={e => setNewDiscount({...newDiscount, condition: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                    <div className="grid grid-cols-2 gap-4">
                        <select value={newDiscount.type} onChange={e => setNewDiscount({...newDiscount, type: e.target.value as any})} className="bg-gray-700 border border-gray-600 rounded p-2 text-white">
                            <option value="PERCENTAGE">%</option>
                            <option value="FIXED">R$</option>
                        </select>
                        <input type="number" placeholder="Valor" value={newDiscount.value} onChange={e => setNewDiscount({...newDiscount, value: Number(e.target.value)})} className="bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    </div>
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500">Salvar</button></div>
                </form>
            </Modal>

             <Modal isOpen={isCostCenterModalOpen} onClose={() => setIsCostCenterModalOpen(false)} title={editingCostCenterId ? "Editar Centro de Custo" : "Novo Centro de Custo"}>
                <form onSubmit={handleSaveCostCenter} className="space-y-4">
                    <input type="text" placeholder="Nome" value={newCostCenter.name} onChange={e => setNewCostCenter({...newCostCenter, name: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" required />
                    <input type="text" placeholder="Código" value={newCostCenter.code} onChange={e => setNewCostCenter({...newCostCenter, code: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" />
                    <div className="flex justify-end pt-4"><button type="submit" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded hover:bg-yellow-500">Salvar</button></div>
                </form>
            </Modal>

            <ConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={performDelete}
                title={`Excluir ${itemToDelete?.type === 'transaction' ? 'Transação' : 'Item'}`}
                message={`Tem certeza que deseja excluir "${itemToDelete?.name}"?`}
            />
        </div>
    );
};

export default FinancialPage;
