
import React from 'react';
import { useData } from '../contexts/DataContext';
import { SchoolClass, Teacher } from '../types';
import { BookOpenIcon, UsersIcon, AcademicCapIcon } from '../components/icons';

interface TeacherDashboardProps {
    user: Teacher;
    onOpenDiary: (schoolClass: SchoolClass) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onOpenDiary }) => {
    const { classes, teachers } = useData();

    const teacherClasses = classes.filter(c => c.teacherIds.includes(user.id));

    return (
        <div>
            <h1 className="text-3xl font-bold font-display text-white mb-8">Minhas Turmas</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teacherClasses.length > 0 ? teacherClasses.map(c => {
                    // Resolve teacher names
                    const classTeachers = c.teacherIds
                        .map(id => teachers.find(t => t.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');

                    return (
                        <div key={c.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-yellow-500/50 transition-all duration-300 group flex flex-col">
                            {/* Card Header with Color Strip */}
                            <div className="h-1.5 bg-yellow-400 w-full"></div>
                            
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-gray-700/50 rounded-lg">
                                        <BookOpenIcon className="w-8 h-8 text-yellow-400" />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Turma</span>
                                        <h2 className="text-2xl font-bold text-white font-display group-hover:text-yellow-400 transition-colors">
                                            {c.name}
                                        </h2>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8 flex-1">
                                    <div className="flex items-center p-3 bg-gray-750 rounded-md border border-gray-700">
                                        <UsersIcon className="w-5 h-5 text-gray-400 mr-3" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Alunos</p>
                                            <p className="text-white font-semibold">{c.studentIds.length} Matriculados</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start p-3 bg-gray-750 rounded-md border border-gray-700">
                                        <AcademicCapIcon className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Professores</p>
                                            <p className="text-sm text-gray-300 leading-snug line-clamp-2" title={classTeachers}>
                                                {classTeachers}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => onOpenDiary(c)} 
                                    className="w-full py-3 px-4 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg hover:shadow-yellow-400/20"
                                >
                                    <BookOpenIcon className="w-5 h-5" />
                                    Abrir Diário de Classe
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full bg-gray-800 p-12 rounded-lg text-center border-2 border-dashed border-gray-700">
                        <BookOpenIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Nenhuma turma encontrada</h3>
                        <p className="text-gray-400">Você não está vinculado a nenhuma turma neste momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;
