
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { StoreItem, FavocoinTransaction } from '../types';
import { CoinIcon, ShoppingBagIcon, ChartBarIcon, TrashIcon, UsersIcon, CheckCircleIcon, XIcon, FireIcon, PencilIcon } from '../components/icons';

// --- COMPONENTS ---

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg relative border border-gray-700 animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-yellow-400 mb-6 font-display">{title}</h2>
                {children}
            </div>
        </div>
    );
};

const FavocoinPage: React.FC = () => {
    const { students, classes, favocoinTransactions, storeItems, addStoreItem, updateStoreItem, deleteStoreItem, purchaseStoreItem, getStudentFavocoinBalance } = useData();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'store' | 'items'>('store');
    
    // Purchase State
    const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    // Item Form State (Create & Edit)
    const [newItemModalOpen, setNewItemModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({ name: '', description: '', price: 0, stock: 0, imageUrl: '' });

    // Filter Eligible Classes (1-5 Year)
    const eligibleClasses = useMemo(() => classes.filter(c => {
        const name = c.name.toUpperCase();
        return name.includes('1º') || name.includes('2º') || name.includes('3º') || name.includes('4º') || name.includes('5º');
    }), [classes]);

    const handleOpenPurchase = (item: StoreItem) => {
        setSelectedItem(item);
        setSelectedStudentIds([]);
        setSelectedClassId('');
        setPurchaseModalOpen(true);
    };

    const handleToggleStudent = (studentId: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleConfirmPurchase = () => {
        if (!selectedItem || selectedStudentIds.length === 0) return;

        // Validation: Check Balance
        const pricePerPerson = selectedItem.price / selectedStudentIds.length;
        const brokeStudents = selectedStudentIds.filter(sid => getStudentFavocoinBalance(sid) < pricePerPerson);

        if (brokeStudents.length > 0) {
            const names = brokeStudents.map(sid => students.find(s => s.id === sid)?.name).join(', ');
            alert(`Saldo insuficiente para: ${names}. Faltam favocoins!`);
            return;
        }

        purchaseStoreItem(selectedStudentIds, selectedItem.id);
        setPurchaseModalOpen(false);
        setSelectedItem(null);
        setSelectedStudentIds([]);
        alert('Compra realizada com sucesso!');
    };

    const handleSaveItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItemId) {
            updateStoreItem(editingItemId, newItem);
        } else {
            addStoreItem(newItem);
        }
        handleCloseItemModal();
    };

    const handleEditItem = (item: StoreItem) => {
        setNewItem({
            name: item.name,
            description: item.description,
            price: item.price,
            stock: item.stock,
            imageUrl: item.imageUrl || ''
        });
        setEditingItemId(item.id);
        setNewItemModalOpen(true);
    };

    const handleCloseItemModal = () => {
        setNewItemModalOpen(false);
        setEditingItemId(null);
        setNewItem({ name: '', description: '', price: 0, stock: 0, imageUrl: '' });
    };

    // --- DASHBOARD DATA ---
    const dashboardStats = useMemo(() => {
        const totalCirculation = favocoinTransactions.filter(t => t.type === 'EARN').reduce((acc, t) => acc + t.amount, 0);
        const totalSpent = Math.abs(favocoinTransactions.filter(t => t.type === 'SPEND').reduce((acc, t) => acc + t.amount, 0));
        
        // Top Students
        const studentBalances = students
            .filter(s => eligibleClasses.some(c => c.studentIds.includes(s.id)))
            .map(s => ({
                id: s.id,
                name: s.name,
                balance: getStudentFavocoinBalance(s.id),
                class: classes.find(c => c.id === s.classId)?.name
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);

        return { totalCirculation, totalSpent, studentBalances };
    }, [favocoinTransactions, students, classes, eligibleClasses, getStudentFavocoinBalance]);

    return (
        <div className="animate-fade-in pb-10">
            <div className="text-center mb-10">
                <h1 className="text-5xl font-bold font-display text-yellow-400 mb-2 drop-shadow-lg tracking-tight">Favocoin Bank & Store</h1>
                <p className="text-gray-400 text-lg">Sistema de economia escolar gamificada.</p>
            </div>

            {/* Navigation */}
            <div className="flex justify-center gap-4 mb-8">
                <button onClick={() => setActiveTab('store')} className={`px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'store' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    <ShoppingBagIcon className="w-5 h-5" /> Loja Virtual
                </button>
                <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    <ChartBarIcon className="w-5 h-5" /> Dashboard & Extrato
                </button>
                <button onClick={() => setActiveTab('items')} className={`px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'items' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    <CoinIcon className="w-5 h-5" /> Gerenciar Itens
                </button>
            </div>

            {/* --- STORE TAB --- */}
            {activeTab === 'store' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {storeItems.map(item => (
                        <div key={item.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-xl group hover:-translate-y-2 transition-all duration-300">
                            <div className="h-48 bg-gray-900 relative overflow-hidden">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                                        <ShoppingBagIcon className="w-16 h-16" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                                    Estoque: {item.stock}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                                <div className="flex justify-between items-center">
                                    <div className="text-yellow-400 font-bold text-2xl flex items-center gap-1">
                                        <CoinIcon className="w-6 h-6" />
                                        {item.price}
                                    </div>
                                    <button 
                                        onClick={() => handleOpenPurchase(item)}
                                        disabled={item.stock === 0}
                                        className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-xl hover:bg-yellow-300 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {item.stock === 0 ? 'Esgotado' : 'Comprar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                            <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-2">Moedas em Circulação</h3>
                            <p className="text-4xl font-bold text-green-400 flex items-center gap-2">
                                <FireIcon className="w-8 h-8" />
                                {dashboardStats.totalCirculation}
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                            <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-2">Total Gasto na Loja</h3>
                            <p className="text-4xl font-bold text-yellow-400 flex items-center gap-2">
                                <ShoppingBagIcon className="w-8 h-8" />
                                {dashboardStats.totalSpent}
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                            <h3 className="text-gray-400 font-bold uppercase text-xs tracking-wider mb-2">Alunos Elegíveis</h3>
                            <p className="text-4xl font-bold text-blue-400 flex items-center gap-2">
                                <UsersIcon className="w-8 h-8" />
                                {students.filter(s => eligibleClasses.some(c => c.studentIds.includes(s.id))).length}
                            </p>
                        </div>
                    </div>

                    {/* Top Students */}
                    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <CoinIcon className="w-6 h-6 text-yellow-400" />
                            Top 5 Acumuladores
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900 text-gray-400 text-sm uppercase">
                                    <tr>
                                        <th className="p-4 rounded-tl-xl">Aluno</th>
                                        <th className="p-4">Turma</th>
                                        <th className="p-4 text-right rounded-tr-xl">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {dashboardStats.studentBalances.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-gray-700/50">
                                            <td className="p-4 font-bold text-white flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                                                    {idx + 1}
                                                </div>
                                                {student.name}
                                            </td>
                                            <td className="p-4 text-gray-400">{student.class}</td>
                                            <td className="p-4 text-right font-bold text-yellow-400">{student.balance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ITEMS MANAGEMENT TAB --- */}
            {activeTab === 'items' && (
                <div>
                    <div className="flex justify-end mb-6">
                        <button onClick={() => setNewItemModalOpen(true)} className="bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-500 shadow-lg flex items-center gap-2">
                            + Novo Produto
                        </button>
                    </div>
                    <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 text-gray-400 text-sm uppercase">
                                <tr>
                                    <th className="p-4">Produto</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4 text-right">Preço</th>
                                    <th className="p-4 text-center">Estoque</th>
                                    <th className="p-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {storeItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-700/50">
                                        <td className="p-4 font-bold text-white">{item.name}</td>
                                        <td className="p-4 text-gray-400 text-sm">{item.description}</td>
                                        <td className="p-4 text-right font-bold text-yellow-400">{item.price}</td>
                                        <td className="p-4 text-center text-white">{item.stock}</td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button onClick={() => handleEditItem(item)} className="text-yellow-400 hover:text-yellow-500 p-2" title="Editar">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => deleteStoreItem(item.id)} className="text-red-400 hover:text-red-500 p-2" title="Excluir">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            {/* CREATE/EDIT ITEM MODAL */}
            <Modal isOpen={newItemModalOpen} onClose={handleCloseItemModal} title={editingItemId ? "Editar Produto" : "Cadastrar Produto"}>
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <input 
                        type="text" placeholder="Nome do Produto" required 
                        value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                    />
                    <textarea 
                        placeholder="Descrição" required 
                        value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400 h-24"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                            type="number" placeholder="Preço (Favocoins)" required 
                            value={newItem.price} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                        />
                        <input 
                            type="number" placeholder="Estoque Inicial" required 
                            value={newItem.stock} onChange={e => setNewItem({...newItem, stock: Number(e.target.value)})}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                        />
                    </div>
                    <input 
                        type="url" placeholder="URL da Imagem (Opcional)" 
                        value={newItem.imageUrl} onChange={e => setNewItem({...newItem, imageUrl: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                    />
                    <div className="flex justify-end pt-4 gap-3">
                        <button type="button" onClick={handleCloseItemModal} className="text-gray-400 hover:text-white font-bold py-3 px-6">Cancelar</button>
                        <button type="submit" className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-300">
                            {editingItemId ? 'Salvar Alterações' : 'Cadastrar Produto'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* PURCHASE MODAL */}
            <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="Finalizar Compra">
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                        {selectedItem?.imageUrl && <img src={selectedItem.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                        <div>
                            <h3 className="font-bold text-white text-lg">{selectedItem?.name}</h3>
                            <p className="text-yellow-400 font-bold text-xl flex items-center gap-1"><CoinIcon className="w-5 h-5"/> {selectedItem?.price}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 uppercase mb-2">1. Selecione a Turma</label>
                        <select 
                            value={selectedClassId} 
                            onChange={e => { setSelectedClassId(e.target.value); setSelectedStudentIds([]); }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                        >
                            <option value="">Selecione...</option>
                            {eligibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {selectedClassId && (
                        <div>
                            <label className="block text-sm font-bold text-gray-400 uppercase mb-2">2. Selecione os Compradores (Divisão de Custo)</label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar bg-gray-900/50 p-2 rounded-xl border border-gray-700">
                                {classes.find(c => c.id === selectedClassId)?.studentIds.map(sid => {
                                    const s = students.find(stu => stu.id === sid);
                                    if (!s) return null;
                                    const bal = getStudentFavocoinBalance(sid);
                                    return (
                                        <label key={sid} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${selectedStudentIds.includes(sid) ? 'bg-yellow-400/10 border-yellow-400/50' : 'border-transparent hover:bg-gray-700'}`}>
                                            <input type="checkbox" checked={selectedStudentIds.includes(sid)} onChange={() => handleToggleStudent(sid)} className="rounded bg-gray-600 border-gray-500 text-yellow-400" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{s.name}</div>
                                                <div className={`text-xs ${bal < (selectedItem?.price || 0)/Math.max(1, selectedStudentIds.length) ? 'text-red-400' : 'text-green-400'}`}>Saldo: {bal}</div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {selectedStudentIds.length > 0 && (
                        <div className="bg-black/30 p-4 rounded-xl text-center border border-white/10">
                            <p className="text-gray-400 text-sm">Custo por aluno:</p>
                            <p className="text-2xl font-bold text-white">{(selectedItem!.price / selectedStudentIds.length).toFixed(2)} Favocoins</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleConfirmPurchase}
                            disabled={selectedStudentIds.length === 0}
                            className="bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                        >
                            Confirmar Compra
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FavocoinPage;
