
import React, { useState } from 'react';
import { User, Role } from '../types';
import { HomeIcon, UsersIcon, AcademicCapIcon, BookOpenIcon, CalendarIcon, ChartBarIcon, LogoutIcon, MenuIcon, XIcon, UserCircleIcon, DocumentReportIcon, ClipboardListIcon, CogIcon, ClipboardCheckIcon, SparklesIcon, CpuIcon, PresentationChartBarIcon, DocumentTextIcon, CoinIcon, IdCardIcon } from './icons';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  onNavigate?: (view: string) => void;
}

const getMenuItems = (role: Role) => {
  switch (role) {
    case Role.Admin:
      return [
        { name: 'Dashboard', icon: <HomeIcon /> },
        { name: 'Alunos', icon: <UsersIcon /> },
        { name: 'Carteirinhas', icon: <IdCardIcon /> },
        { name: 'Boletim', icon: <ClipboardCheckIcon /> }, 
        { name: 'Histórico Escolar', icon: <DocumentTextIcon /> },
        { name: 'Professores', icon: <AcademicCapIcon /> },
        { name: 'Turmas', icon: <BookOpenIcon /> },
        { name: 'Disciplinas', icon: <ClipboardListIcon /> },
        { name: 'Análise de Turma', icon: <PresentationChartBarIcon /> },
        { name: 'Lançamento de Notas', icon: <ClipboardCheckIcon /> },
        { name: 'Frequência', icon: <ClipboardListIcon /> },
        { name: 'Favocoin', icon: <CoinIcon /> },
        { name: 'Calendário', icon: <CalendarIcon /> },
        { name: 'Financeiro', icon: <ChartBarIcon /> },
        { name: 'Relatórios', icon: <DocumentReportIcon /> },
        { name: 'Análise Vocacional', icon: <SparklesIcon /> },
        { name: 'Departamento de IA', icon: <CpuIcon /> },
        { name: 'Configurações', icon: <CogIcon /> },
      ];
    case Role.Teacher:
      return [
        { name: 'Minhas Turmas', icon: <BookOpenIcon /> },
        { name: 'Lançamento de Notas', icon: <ClipboardCheckIcon /> },
        { name: 'Frequência', icon: <ClipboardListIcon /> },
        { name: 'Calendário', icon: <CalendarIcon /> },
      ];
    case Role.Parent:
      return [
        { name: 'Visão Geral', icon: <UserCircleIcon /> },
        { name: 'Boletim', icon: <ClipboardCheckIcon /> }, 
        { name: 'Calendário', icon: <CalendarIcon /> },
      ];
    default:
      return [];
  }
};


const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = getMenuItems(user.role);

  const sidebarContent = (
    // Alterado para degradê Amarelo -> Laranja
    <div className="flex flex-col h-full bg-gradient-to-b from-yellow-400 via-orange-400 to-orange-500 border-r border-black/10 shadow-2xl">
      <div className="flex items-center justify-center h-24 border-b border-black/10 bg-black/5">
        {/* Ícone Preto com Sombra */}
        <AcademicCapIcon className="h-10 w-10 text-black drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]" />
        <h1 className="text-2xl font-display font-bold ml-3 text-black tracking-wide">
            Gestão ISV <span className="text-white drop-shadow-md">Pro</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href="#"
            title={item.name}
            onClick={(e) => {
              e.preventDefault();
              onNavigate && onNavigate(item.name);
              setSidebarOpen(false);
            }}
            className="group flex items-center px-4 py-3 text-black/80 font-semibold hover:text-black hover:bg-black/10 rounded-2xl transition-all duration-200 border border-transparent hover:shadow-inner"
          >
            {/* Ícone com efeito "Neon Preto" (Drop Shadow forte) */}
            <span className="h-6 w-6 mr-3 text-black drop-shadow-[0_0_8px_rgba(0,0,0,0.6)] transition-transform duration-200 group-hover:scale-110">
                {item.icon}
            </span>
            <span className="font-bold tracking-wide">{item.name}</span>
          </a>
        ))}
      </nav>
      
      <div className="p-6 border-t border-black/10 bg-black/5">
        <button
          onClick={onLogout}
          title="Sair do Sistema"
          className="w-full flex items-center px-4 py-3 text-black/80 hover:bg-red-600 hover:text-white border border-black/10 rounded-xl transition-all duration-200 group font-bold shadow-sm hover:shadow-md"
        >
          <LogoutIcon className="h-6 w-6 mr-3 group-hover:text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="relative flex-1 flex flex-col max-w-xs w-full shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <XIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          {sidebarContent}
        </div>
        <div className="flex-shrink-0 w-14" onClick={() => setSidebarOpen(false)}></div>
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72">
          <div className="flex flex-col h-0 flex-1">{sidebarContent}</div>
        </div>
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden relative">
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-20 glass-panel border-b border-white/5 shadow-sm m-4 rounded-2xl md:mx-6 md:mt-4 mb-0">
          <button onClick={() => setSidebarOpen(true)} className="px-4 border-r border-white/10 text-gray-400 focus:outline-none md:hidden hover:text-white">
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex-1 flex items-center">
               <h2 className="text-gray-400 text-sm font-display tracking-widest uppercase hidden sm:block">Painel de Controle</h2>
            </div>
            <div className="ml-4 flex items-center md:ml-6 gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-white font-medium text-sm neon-text">{user.name}</p>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">{user.role}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 p-[2px] shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                    <div className="h-full w-full rounded-full bg-gray-900 flex items-center justify-center">
                        <UserCircleIcon className="h-full w-full text-gray-300"/>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-4 md:p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
