import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Student } from '../types';
import { TrophyIcon, FireIcon, CheckCircleIcon, SparklesIcon, BookOpenIcon, PresentationChartBarIcon } from './icons';

interface GamificationProfileProps {
    studentId: string;
}

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    unlocked: boolean;
}

const GamificationProfile: React.FC<GamificationProfileProps> = ({ studentId }) => {
    const { students, grades, attendance, subjects } = useData();
    const student = students.find(s => s.id === studentId);

    const gamificationData = useMemo(() => {
        if (!student) return null;

        // 1. Calculate XP
        // Rule 1: Each grade point * 100 XP (e.g. grade 8.5 = 850 XP)
        const studentGrades = grades.filter(g => g.studentId === studentId);
        const gradeXP = studentGrades.reduce((acc, g) => acc + (g.grade * 100), 0);

        // Rule 2: Each present attendance day * 10 XP
        const studentAttendance = attendance.filter(a => a.studentId === studentId);
        const presentCount = studentAttendance.filter(a => a.present).length;
        const attendanceXP = presentCount * 10;

        const totalXP = Math.floor(gradeXP + attendanceXP);

        // 2. Calculate Level
        // Level Formula: 1000 XP per level
        const currentLevel = Math.floor(totalXP / 1000) + 1;
        const xpForNextLevel = currentLevel * 1000;
        const xpInCurrentLevel = totalXP % 1000;
        const progressPercent = (xpInCurrentLevel / 1000) * 100;

        // 3. Determine Badges
        const avgGrade = studentGrades.length > 0 
            ? studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length 
            : 0;
        
        const attendancePct = studentAttendance.length > 0 
            ? (presentCount / studentAttendance.length) * 100 
            : 0;

        // Helper to check grade in specific subject (fuzzy match name)
        const hasGradeAbove = (subjNamePart: string, threshold: number) => {
            const relevantSubjs = subjects.filter(s => s.name.toLowerCase().includes(subjNamePart.toLowerCase()));
            if (relevantSubjs.length === 0) return false;
            
            const relevantGrades = studentGrades.filter(g => relevantSubjs.some(s => s.id === g.subjectId));
            if (relevantGrades.length === 0) return false;

            // Check average of that subject
            const subjAvg = relevantGrades.reduce((sum, g) => sum + g.grade, 0) / relevantGrades.length;
            return subjAvg >= threshold;
        };

        const badges: Badge[] = [
            {
                id: 'first_steps',
                name: 'Primeiros Passos',
                description: 'Ganhe seus primeiros 100 XP.',
                icon: <SparklesIcon className="w-6 h-6" />,
                color: 'from-blue-400 to-blue-600',
                unlocked: totalXP > 100
            },
            {
                id: 'always_present',
                name: 'Sempre Presente',
                description: 'Mantenha frequência acima de 95%.',
                icon: <CheckCircleIcon className="w-6 h-6" />,
                color: 'from-green-400 to-green-600',
                unlocked: attendancePct >= 95 && studentAttendance.length > 5
            },
            {
                id: 'rising_star',
                name: 'Estrela em Ascensão',
                description: 'Alcance uma média geral superior a 8.0.',
                icon: <TrophyIcon className="w-6 h-6" />,
                color: 'from-yellow-400 to-orange-500',
                unlocked: avgGrade >= 8.0
            },
            {
                id: 'math_wizard',
                name: 'Mestre dos Números',
                description: 'Média superior a 9.0 em Matemática.',
                icon: <div className="text-xl font-bold">∑</div>, // Using text for math symbol
                color: 'from-purple-400 to-purple-600',
                unlocked: hasGradeAbove('Matemática', 9.0)
            },
            {
                id: 'bookworm',
                name: 'Linguista',
                description: 'Média superior a 9.0 em Português.',
                icon: <BookOpenIcon className="w-6 h-6" />,
                color: 'from-pink-400 to-rose-600',
                unlocked: hasGradeAbove('Português', 9.0)
            },
            {
                id: 'veteran',
                name: 'Veterano',
                description: 'Alcance o Nível 5.',
                icon: <FireIcon className="w-6 h-6" />,
                color: 'from-red-500 to-red-700',
                unlocked: currentLevel >= 5
            }
        ];

        return {
            totalXP,
            currentLevel,
            xpInCurrentLevel,
            xpForNextLevel,
            progressPercent,
            badges
        };

    }, [student, grades, attendance, studentId, subjects]);

    if (!student || !gamificationData) return null;

    return (
        <div className="animate-fade-in">
            {/* Header / Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl mb-8">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 z-0"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 p-8 flex flex-col md:flex-row items-center gap-8">
                    {/* Level Hexagon */}
                    <div className="relative flex-shrink-0">
                        <div className="w-32 h-32 flex items-center justify-center relative">
                            {/* Hexagon Shape CSS */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                            <div className="absolute inset-[3px] bg-gray-900" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></div>
                            
                            <div className="flex flex-col items-center justify-center z-10">
                                <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Nível</span>
                                <span className="text-5xl font-display font-bold text-white text-shadow-glow">{gamificationData.currentLevel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="flex-1 w-full">
                        <h2 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                            {student.name}
                            <span className="text-sm bg-white/10 border border-white/10 px-3 py-1 rounded-full text-gray-300 font-sans font-normal">
                                Explorador do Conhecimento
                            </span>
                        </h2>
                        
                        <div className="flex justify-between text-sm font-bold text-gray-400 mb-2">
                            <span>{gamificationData.xpInCurrentLevel} XP</span>
                            <span>Próximo Nível: 1000 XP</span>
                        </div>
                        
                        <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700 shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 relative transition-all duration-1000 ease-out"
                                style={{ width: `${gamificationData.progressPercent}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 blur-[1px]"></div>
                            </div>
                        </div>
                        
                        <div className="mt-4 flex gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                                <FireIcon className="w-4 h-4 text-orange-500" />
                                <span>Total XP: <span className="text-white font-bold">{gamificationData.totalXP}</span></span>
                            </div>
                            <div className="flex items-center gap-1">
                                <TrophyIcon className="w-4 h-4 text-yellow-400" />
                                <span>Conquistas: <span className="text-white font-bold">{gamificationData.badges.filter(b => b.unlocked).length}/{gamificationData.badges.length}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Grid */}
            <h3 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
                <TrophyIcon className="w-6 h-6 text-yellow-400" />
                Galeria de Conquistas
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gamificationData.badges.map((badge) => (
                    <div 
                        key={badge.id} 
                        className={`relative rounded-xl p-4 border transition-all duration-300 group overflow-hidden ${
                            badge.unlocked 
                            ? 'bg-gray-800 border-white/10 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(250,204,21,0.1)]' 
                            : 'bg-gray-900/50 border-white/5 opacity-60 grayscale'
                        }`}
                    >
                        {/* Glow effect for unlocked */}
                        {badge.unlocked && (
                            <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${badge.color} blur-2xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                        )}

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg bg-gradient-to-br ${badge.unlocked ? badge.color : 'from-gray-700 to-gray-800'}`}>
                                <div className="text-white">
                                    {badge.icon}
                                </div>
                            </div>
                            
                            <h4 className={`font-bold mb-1 ${badge.unlocked ? 'text-white' : 'text-gray-500'}`}>{badge.name}</h4>
                            <p className="text-xs text-gray-400 leading-snug">{badge.description}</p>
                            
                            {!badge.unlocked && (
                                <div className="mt-3 px-3 py-1 bg-black/40 rounded-full text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1">
                                    Bloqueado 🔒
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GamificationProfile;