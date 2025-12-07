
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { CloudIcon, TrashIcon } from '../components/icons';
import { ConfirmationModal } from '../components/ConfirmationModal';

const SettingsPage: React.FC = () => {
    const { supabaseConfig, updateSupabaseConfig, forceCloudSync, loadFromCloud, data } = useData();
    // URL is fixed, no need for local state to edit it
    const fixedUrl = "https://ncqqdggilcnlesnuyjfs.supabase.co";
    const [key, setKey] = useState(supabaseConfig.key);
    const [isSaving, setIsSaving] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [confirmDownloadOpen, setConfirmDownloadOpen] = useState(false);

    const handleSaveConfig = () => {
        setIsSaving(true);
        updateSupabaseConfig(fixedUrl, key);
        setTimeout(() => {
            setIsSaving(false);
            alert('Configurações salvas!');
            setSyncStatus(''); // Limpa status anterior
        }, 500);
    };

    const handleUpload = async () => {
        setSyncStatus('Enviando dados...');
        try {
            await forceCloudSync();
            setSyncStatus('Dados enviados com sucesso para a nuvem!');
        } catch (error) {
            const msg = (error as Error).message;
            if (msg && msg.includes('secret API key')) {
                setSyncStatus('ERRO: Você usou a chave SECRETA (service_role). Por favor, use a chave "ANON" (pública) nas configurações.');
            } else {
                setSyncStatus(`Erro ao enviar: ${msg}`);
            }
        }
    };

    const handleDownload = async () => {
        setSyncStatus('Baixando dados...');
        try {
            const success = await loadFromCloud();
            if (success) {
                setSyncStatus('Dados baixados com sucesso!');
                window.location.reload(); // Reload to reflect data
            } else {
                setSyncStatus('Nenhum dado encontrado na nuvem ou erro na conexão.');
            }
        } catch (error) {
             const msg = (error as Error).message;
            if (msg && msg.includes('secret API key')) {
                setSyncStatus('ERRO: Você usou a chave SECRETA (service_role). Por favor, use a chave "ANON" (pública) nas configurações.');
            } else {
                setSyncStatus(`Erro ao baixar: ${msg}`);
            }
        }
    };

    const handleClearLocal = () => {
        localStorage.clear();
        window.location.reload();
    }

    return (
        <div>
            <h1 className="text-3xl font-bold font-display text-white mb-6">Configurações do Sistema</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Database Connection */}
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                    <div className="flex items-center mb-6">
                        <CloudIcon className="w-8 h-8 text-yellow-400 mr-3" />
                        <h2 className="text-2xl font-bold text-white">Conexão com Banco de Dados</h2>
                    </div>
                    <p className="text-gray-400 mb-6 text-sm">
                        Conecte-se ao Supabase para persistir seus dados na nuvem. Isso evita a perda de dados ao limpar o navegador ou atualizar a aplicação.
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Supabase Project URL (Fixo)</label>
                            <input 
                                type="text" 
                                value={fixedUrl} 
                                readOnly
                                disabled
                                className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed opacity-75 select-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Supabase Anon Key <span className="text-yellow-400 font-bold ml-1 text-xs">(Use a chave 'anon' / 'public')</span>
                            </label>
                            <input 
                                type="password" 
                                value={key} 
                                onChange={e => setKey(e.target.value)} 
                                placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500" 
                            />
                            <p className="text-xs text-gray-500 mt-1">Essa chave é pública. Não utilize a chave 'service_role'.</p>
                        </div>
                        
                        <div className="pt-4 flex justify-end">
                             <button 
                                onClick={handleSaveConfig} 
                                disabled={isSaving}
                                className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Configuração'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sync Actions */}
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-white mb-6">Sincronização e Dados</h2>
                    
                    <div className="space-y-4">
                        <div className={`p-4 rounded border ${supabaseConfig.key ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
                            <p className="font-semibold text-white">Status da Conexão: <span className={supabaseConfig.key ? 'text-green-400' : 'text-red-400'}>{supabaseConfig.key ? 'Configurado' : 'Chave não inserida'}</span></p>
                        </div>

                        {syncStatus && (
                            <div className={`p-3 rounded text-sm ${syncStatus.includes('ERRO') ? 'bg-red-900/50 text-red-200 border border-red-500' : 'bg-blue-900/30 text-blue-200'}`}>
                                {syncStatus}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={handleUpload}
                                disabled={!supabaseConfig.key}
                                className="flex justify-center items-center py-3 px-4 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CloudIcon className="w-5 h-5 mr-2" />
                                Upload para Nuvem
                            </button>
                            <button 
                                onClick={() => setConfirmDownloadOpen(true)}
                                disabled={!supabaseConfig.key}
                                className="flex justify-center items-center py-3 px-4 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CloudIcon className="w-5 h-5 mr-2 rotate-180" />
                                Baixar da Nuvem
                            </button>
                        </div>

                         <div className="mt-8 pt-8 border-t border-gray-700">
                             <h3 className="text-lg font-bold text-red-400 mb-2">Zona de Perigo</h3>
                             <p className="text-gray-400 text-sm mb-4">Ações irreversíveis que afetam seus dados locais.</p>
                             <button onClick={() => setConfirmResetOpen(true)} className="w-full flex justify-center items-center py-2 px-4 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-400 hover:bg-red-900/20">
                                <TrashIcon className="w-5 h-5 mr-2" />
                                Resetar Aplicação Local
                             </button>
                         </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={confirmResetOpen}
                onClose={() => setConfirmResetOpen(false)}
                onConfirm={handleClearLocal}
                title="Resetar Aplicação"
                message="TEM CERTEZA? Isso apagará todos os dados armazenados localmente no navegador e redefinirá as configurações. Esta ação não pode ser desfeita."
                confirmText="Sim, Apagar Tudo"
            />
            
            <ConfirmationModal 
                isOpen={confirmDownloadOpen}
                onClose={() => setConfirmDownloadOpen(false)}
                onConfirm={handleDownload}
                title="Baixar da Nuvem"
                message="Isso irá substituir seus dados locais pelos dados mais recentes da nuvem. Dados não salvos localmente serão perdidos. Deseja continuar?"
                confirmText="Sim, Baixar"
                isDangerous={false}
            />
        </div>
    );
};

export default SettingsPage;
