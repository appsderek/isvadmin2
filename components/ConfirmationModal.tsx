
import React from 'react';
import { XIcon } from './icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, onClose, onConfirm, title, message, 
    confirmText = "Excluir", cancelText = "Cancelar", isDangerous = true
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md relative border border-gray-700 transform transition-all scale-100">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold font-display text-white mb-2">{title}</h2>
                <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }} 
                        className={`px-4 py-2 rounded-lg text-white font-bold transition-colors shadow-lg ${
                            isDangerous 
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                            : 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
