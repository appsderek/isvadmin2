
import React, { useState } from 'react';
import { User } from '../types';
import { useData } from '../contexts/DataContext';
import { AcademicCapIcon } from './icons';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { findUserByEmail, changePassword } = useData();

  // Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const user = findUserByEmail(email);
    
    if (user) {
        // Validate Password (default is '123456')
        if (user.password === password) {
            if (user.needsPasswordChange) {
                // Force change password flow
                setPendingUser(user);
                setShowChangePassword(true);
            } else {
                onLogin(user);
            }
        } else {
            setError('Senha incorreta.');
        }
    } else {
      setError('Usuário não encontrado.');
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
      }
      if (newPassword.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          return;
      }
      if (pendingUser) {
          changePassword(pendingUser.id, newPassword);
          alert('Senha alterada com sucesso! Você já pode acessar.');
          onLogin(pendingUser); // Log in with the updated user state (needs refresh in app context)
      }
  };

  if (showChangePassword) {
      return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden bg-black">
            <div className="w-full max-w-md glass-panel rounded-3xl shadow-2xl p-8 relative z-10 animate-fade-in-up border border-yellow-500/30">
                <h2 className="text-2xl font-bold text-center text-white font-display mb-4 tracking-wide">Primeiro Acesso</h2>
                <p className="text-gray-400 text-sm text-center mb-6">Por segurança, você deve alterar sua senha padrão antes de continuar.</p>
                
                <form onSubmit={handleChangePasswordSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-yellow-400 uppercase tracking-wider mb-2">Nova Senha</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
                            placeholder="Nova senha"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-yellow-400 uppercase tracking-wider mb-2">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
                            placeholder="Repita a senha"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-500/30">{error}</p>}
                    <div>
                        <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.3)] text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 transition-all duration-300 uppercase tracking-wider">
                            Alterar e Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center mb-8 relative z-10 animate-fade-in-up">
            <AcademicCapIcon className="h-14 w-14 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
            <h1 className="text-6xl font-display font-bold ml-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
                Gestão ISV <span className="text-yellow-400 neon-text">Pro</span>
            </h1>
        </div>
        
        <div className="w-full max-w-md glass-panel rounded-3xl shadow-2xl p-8 relative z-10 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
            <h2 className="text-2xl font-bold text-center text-white font-display mb-8 tracking-wide">Acesso ao Sistema</h2>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-xs font-medium text-yellow-400 uppercase tracking-wider mb-2">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
                        placeholder="seu@email.com"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-xs font-medium text-yellow-400 uppercase tracking-wider mb-2">Senha</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all duration-300"
                        placeholder="••••••••"
                    />
                </div>
                {error && (
                    <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-500/30 text-center">
                        <p className="font-bold">{error}</p>
                        {error.includes('incorreta') && (
                            <p className="text-xs mt-1 text-gray-400">Senha padrão inicial: <span className="font-mono text-white">123456</span></p>
                        )}
                    </div>
                )}
                <div>
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.3)] text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-500 transition-all duration-300 uppercase tracking-wider">
                        Entrar
                    </button>
                </div>
            </form>
            
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                    Esqueceu a senha? Contate a secretaria.<br/>
                </p>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;
