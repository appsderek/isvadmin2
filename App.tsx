
import React, { useState, useMemo } from 'react';
import { User, Role, SchoolClass, Teacher, Parent } from './types';
import { DataProvider, generateMockData } from './contexts/DataContext';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import ParentDashboard from './pages/ParentDashboard';
import ClassDiary from './pages/ClassDiary';
import GradeEntryPage from './pages/GradeEntryPage';
import CalendarPage from './pages/CalendarPage';
import AttendancePage from './pages/AttendancePage';
import FavocoinPage from './pages/FavocoinPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Admin state
  const [adminView, setAdminView] = useState('Dashboard');
  
  // Teacher state
  const [teacherView, setTeacherView] = useState('Dashboard');
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);

  // Parent state
  const [parentView, setParentView] = useState('Visão Geral');

  const mockData = useMemo(() => generateMockData(), []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === Role.Admin) {
      setAdminView('Dashboard');
    }
    if (user.role === Role.Teacher) {
      setTeacherView('Dashboard');
      setSelectedClass(null);
    }
    if (user.role === Role.Parent) {
      setParentView('Visão Geral');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleNavigateToDiary = (schoolClass: SchoolClass) => {
    setSelectedClass(schoolClass);
    setTeacherView('ClassDiary');
  };

  const handleBackToTeacherDashboard = () => {
    setSelectedClass(null);
    setTeacherView('Dashboard');
  };

  const handleNavigate = (view: string) => {
    if (!currentUser) return;
    
    if (currentUser.role === Role.Admin) {
      setAdminView(view);
    } else if (currentUser.role === Role.Parent) {
      setParentView(view);
    } else if (currentUser.role === Role.Teacher) {
      if (view === 'Minhas Turmas' || view === 'Dashboard') {
        handleBackToTeacherDashboard();
      } else {
        setTeacherView(view);
        setSelectedClass(null);
      }
    }
  };

  const renderDashboard = () => {
    if (!currentUser) return null;

    switch (currentUser.role) {
      case Role.Admin:
        if (adminView === 'Frequência') {
            return <AttendancePage user={currentUser} />;
        }
        if (adminView === 'Favocoin') {
            return <FavocoinPage />;
        }
        return <AdminDashboard currentView={adminView} onNavigate={setAdminView} />;
      case Role.Teacher:
        if (teacherView === 'ClassDiary' && selectedClass) {
          return <ClassDiary schoolClass={selectedClass} onBack={handleBackToTeacherDashboard} />;
        }
        if (teacherView === 'Lançamento de Notas') {
            return <GradeEntryPage teacherId={currentUser.id} />;
        }
        if (teacherView === 'Frequência') {
            return <AttendancePage user={currentUser} />;
        }
        if (teacherView === 'Calendário') {
            return <CalendarPage canEdit={false} />;
        }
        return <TeacherDashboard user={currentUser as Teacher} onOpenDiary={handleNavigateToDiary} />;
      case Role.Parent:
        return <ParentDashboard user={currentUser as Parent} currentView={parentView} onNavigate={setParentView} />;
      default:
        return <div>Papel de usuário desconhecido.</div>;
    }
  };

  return (
    <DataProvider initialData={mockData}>
      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <Layout user={currentUser} onLogout={handleLogout} onNavigate={handleNavigate}>
          {renderDashboard()}
        </Layout>
      )}
    </DataProvider>
  );
};

export default App;
