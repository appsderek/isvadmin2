
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ShoppingBagIcon, UserCircleIcon, XIcon, CheckCircleIcon } from '../components/icons';

const CanteenPage: React.FC = () => {
    const { students, canteenItems, canteenTransactions, purchaseCanteenItems, depositCanteenBalance } = useData();
    const [cart, setCart] = useState<{itemId: string, quantity: number}[]>([]);
    const [studentInput, setStudentInput] = useState(''); // ID via QR Code or typing
    const [identifiedStudent, setIdentifiedStudent] = useState<string | null>(null);
    const [depositAmount, setDepositAmount] = useState(0);
    const [isDepositMode, setIsDepositMode] = useState(false);

    // Filter Items by category
    const categories = ['Todos', ...Array.from(new Set(canteenItems.map(i => i.category)))];
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    const filteredItems = useMemo(() => {
        return selectedCategory === 'Todos' 
            ? canteenItems 
            : canteenItems.filter(i => i.category === selectedCategory);
    }, [canteenItems, selectedCategory]);

    const student = useMemo(() => students.find(s => s.id === identifiedStudent), [students, identifiedStudent]);

    // Handlers
    const addToCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.itemId === itemId);
            if (existing) {
                return prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { itemId, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.itemId !== itemId));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const product = canteenItems.find(p => p.id === item.itemId);
            return sum + (product ? product.price * item.quantity : 0);
        }, 0);
    }, [cart, canteenItems]);

    const handleIdentifyStudent = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate QR scan finding student
        const found = students.find(s => s.id === studentInput || s.enrollmentId === studentInput);
        if (found) {
            setIdentifiedStudent(found.id);
            setStudentInput('');
        } else {
            alert('Aluno não encontrado.');
        }
    };

    const handleCheckout = () => {
        if (!identifiedStudent) {
            alert("Identifique o aluno primeiro.");
            return;
        }
        if (cart.length === 0) return;

        if (student && (student.canteenBalance || 0) < cartTotal) {
            alert("Saldo insuficiente!");
            return;
        }

        const itemsPayload = cart.map(c => {
            const prod = canteenItems.find(i => i.id === c.itemId);
            return {
                itemId: c.itemId,
                name: prod?.name || 'Item',
                price: prod?.price || 0,
                quantity: c.quantity
            };
        });

        purchaseCanteenItems(identifiedStudent, itemsPayload, cartTotal);
        alert("Compra realizada!");
        setCart([]);
        setIdentifiedStudent(null);
    };

    const handleDeposit = () => {
        if (!identifiedStudent || depositAmount <= 0) return;
        depositCanteenBalance(identifiedStudent, depositAmount);
        alert(`Recarga de R$ ${depositAmount.toFixed(2)} realizada!`);
        setDepositAmount(0);
        setIsDepositMode(false);
    };

    return (
        <div className="animate-fade-in h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
            {/* LEFT: POS / PRODUCTS */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold font-display text-white flex items-center gap-3">
                        <ShoppingBagIcon className="w-8 h-8 text-green-400" />
                        Cantina Digital
                    </h1>
                    <div className="flex bg-gray-800 rounded-lg p-1">
                        <button onClick={() => setIsDepositMode(false)} className={`px-4 py-2 rounded-md font-bold transition-colors ${!isDepositMode ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Venda</button>
                        <button onClick={() => setIsDepositMode(true)} className={`px-4 py-2 rounded-md font-bold transition-colors ${isDepositMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Recarga</button>
                    </div>
                </div>

                {!isDepositMode ? (
                    <>
                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar">
                            {categories.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-colors border ${selectedCategory === cat ? 'bg-green-500 text-white border-green-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            {filteredItems.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => addToCart(item.id)}
                                    className="bg-gray-800 border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-green-500 transition-all hover:shadow-lg active:scale-95 flex flex-col"
                                >
                                    <div className="h-24 bg-gray-900 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <ShoppingBagIcon className="w-8 h-8 text-gray-600" />
                                        )}
                                    </div>
                                    <h3 className="font-bold text-white text-sm line-clamp-2 mb-1 flex-1">{item.name}</h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-400 font-bold text-lg">R$ {item.price.toFixed(2)}</span>
                                        {item.isHealthy && <span className="text-[10px] bg-green-900/50 text-green-200 px-1 rounded">Saudável</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 flex flex-col items-center justify-center flex-1">
                        <h2 className="text-2xl font-bold text-white mb-6">Recarga de Saldo</h2>
                        <div className="w-full max-w-sm">
                            <label className="block text-gray-400 mb-2 font-bold">Valor da Recarga (R$)</label>
                            <input 
                                type="number" 
                                value={depositAmount} 
                                onChange={e => setDepositAmount(Number(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-4 text-3xl font-bold text-green-400 focus:outline-none focus:border-green-500 text-center mb-6"
                            />
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[10, 20, 50].map(val => (
                                    <button key={val} onClick={() => setDepositAmount(val)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg">R$ {val}</button>
                                ))}
                            </div>
                            <button 
                                onClick={handleDeposit}
                                disabled={!identifiedStudent || depositAmount <= 0}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Recarga
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: CART & CHECKOUT */}
            <div className="w-full md:w-96 bg-gray-800 rounded-2xl border border-gray-700 flex flex-col overflow-hidden shadow-2xl">
                {/* Student ID Input */}
                <div className="p-4 bg-gray-900 border-b border-gray-700">
                    <form onSubmit={handleIdentifyStudent} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Ler Carteirinha / Digitar ID" 
                            value={studentInput}
                            onChange={e => setStudentInput(e.target.value)}
                            autoFocus
                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-green-500 focus:border-green-500"
                        />
                        <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-white px-3 rounded-lg">
                            <UserCircleIcon className="w-5 h-5" />
                        </button>
                    </form>
                    
                    {student ? (
                        <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-black text-lg">
                                {student.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-white leading-tight">{student.name}</p>
                                <p className="text-xs text-gray-400">Saldo: <span className="text-green-400 font-bold text-sm">R$ {student.canteenBalance?.toFixed(2)}</span></p>
                            </div>
                            <button onClick={() => setIdentifiedStudent(null)} className="ml-auto text-gray-500 hover:text-red-400"><XIcon className="w-4 h-4"/></button>
                        </div>
                    ) : (
                        <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-900/50 text-center text-red-300 text-sm">
                            Nenhum aluno identificado.
                        </div>
                    )}
                </div>

                {/* Cart List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <ShoppingBagIcon className="w-16 h-16 mb-2" />
                            <p>Cesta vazia</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map(item => {
                                const prod = canteenItems.find(p => p.id === item.itemId);
                                if (!prod) return null;
                                return (
                                    <div key={item.itemId} className="flex justify-between items-center bg-gray-700/30 p-2 rounded-lg">
                                        <div className="flex-1">
                                            <p className="text-white font-medium text-sm">{prod.name}</p>
                                            <p className="text-xs text-gray-400">{item.quantity}x R$ {prod.price.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-bold">R$ {(prod.price * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => removeFromCart(item.itemId)} className="text-red-400 hover:text-red-300">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Total & Action */}
                {!isDepositMode && (
                    <div className="p-6 bg-gray-900 border-t border-gray-700">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-400 uppercase text-xs font-bold">Total a Pagar</span>
                            <span className="text-3xl font-bold text-green-400">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || !identifiedStudent}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <CheckCircleIcon className="w-6 h-6" />
                            Finalizar Compra
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CanteenPage;
