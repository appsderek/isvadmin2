
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Student, Teacher, Parent, SchoolClass, Subject, Attendance, ClassLog, CalendarEvent, FinancialTransaction, Role, TransactionType, User, Grade, SchoolData, FinancialCategory, FinancialService, DiscountRule, CostCenter, PenaltyConfig, Supplier, TransactionStatus, PaymentMethod, FavocoinTransaction, StoreItem } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// CONSTANTS
const FAVOCOIN_RULES = {
    INITIAL_BALANCE: 30,
    ATTENDANCE_REWARD: 10,
    ABSENCE_PENALTY: 5
};

const FAVOCOIN_ELIGIBLE_YEARS = ['1º ANO', '2º ANO', '3º ANO', '4º ANO', '5º ANO'];
const DEFAULT_PASSWORD = '123456';

// HELPER: Get dynamic date strings respecting LOCAL TIME to ensure consistency
const getRelativeDate = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    // Use 'fr-CA' locale to get YYYY-MM-DD in local time, preventing UTC rollover issues
    return date.toLocaleDateString('fr-CA');
};

// HELPER: Get Schedule based on Shift
const getScheduleByShift = (shift: 'Matutino' | 'Vespertino') => {
    return shift === 'Matutino' ? '07:30h às 11:30h' : '13:00h às 17:30h';
};

// MOCK DATA GENERATION
export const generateMockData = (): SchoolData => {
    const subjects: Subject[] = [
        { id: 'subj-1', name: 'Matemática' },
        { id: 'subj-2', name: 'Português' },
        { id: 'subj-3', name: 'Ciências' },
        { id: 'subj-4', name: 'História' },
    ];

    const teachers: Teacher[] = [
        { id: 'teach-1', name: 'Prof. Carlos', role: Role.Teacher, email: 'carlos@school.com', subjectIds: ['subj-1', 'subj-3'], password: DEFAULT_PASSWORD, needsPasswordChange: true },
        { id: 'teach-2', name: 'Prof. Ana', role: Role.Teacher, email: 'ana@school.com', subjectIds: ['subj-2', 'subj-4'], password: DEFAULT_PASSWORD, needsPasswordChange: true },
    ];

    const parents: Parent[] = [
        { id: 'parent-1', name: 'Sr. Silva', role: Role.Parent, email: 'silva@email.com', studentId: 'stu-1', password: DEFAULT_PASSWORD, needsPasswordChange: true },
        { id: 'parent-2', name: 'Sra. Costa', role: Role.Parent, email: 'costa@email.com', studentId: 'stu-2', password: DEFAULT_PASSWORD, needsPasswordChange: true },
        { id: 'parent-3', name: 'Sr. Souza', role: Role.Parent, email: 'souza@email.com', studentId: 'stu-3', password: DEFAULT_PASSWORD, needsPasswordChange: true },
    ];
    
    const students: Student[] = [
        { id: 'stu-1', name: 'João Silva', classId: 'class-1', parentId: 'parent-1', status: 'ativo' },
        { id: 'stu-2', name: 'Maria Costa', classId: 'class-1', parentId: 'parent-2', status: 'ativo' },
        { id: 'stu-3', name: 'Pedro Souza', classId: 'class-2', parentId: 'parent-3', status: 'ativo' },
    ];

    const classes: SchoolClass[] = [
        { id: 'class-1', name: '1º Ano A', teacherIds: ['teach-1', 'teach-2'], studentIds: ['stu-1', 'stu-2'], subjectIds: ['subj-1', 'subj-2'], shift: 'Matutino', schedule: '07:30h às 11:30h' },
        { id: 'class-2', name: '5º Ano B', teacherIds: ['teach-1'], studentIds: ['stu-3'], subjectIds: ['subj-3', 'subj-4'], shift: 'Vespertino', schedule: '13:00h às 17:30h' },
    ];

    // Attendance for the last few days
    const attendance: Attendance[] = [
        { studentId: 'stu-1', date: getRelativeDate(-2), present: true },
        { studentId: 'stu-1', date: getRelativeDate(-1), present: true },
        { studentId: 'stu-1', date: getRelativeDate(0), present: false },
        { studentId: 'stu-2', date: getRelativeDate(-2), present: false },
        { studentId: 'stu-2', date: getRelativeDate(-1), present: true },
        { studentId: 'stu-2', date: getRelativeDate(0), present: true },
    ];

    const classLogs: ClassLog[] = [
        { id: 'log-1', classId: 'class-1', date: getRelativeDate(-1), content: 'Revisão de Frações', subjectId: 'subj-1' },
    ];
    
    const calendarEvents: CalendarEvent[] = [
        { id: 'event-1', title: 'Reunião de Pais', date: getRelativeDate(5), endDate: getRelativeDate(5), description: 'Reunião geral para discutir o desempenho do bimestre.' },
        { id: 'event-2', title: 'Feira de Ciências', date: getRelativeDate(20), endDate: getRelativeDate(22), classId: 'class-1', description: 'Montagem de stands e apresentações.' },
    ];

    const transactions: FinancialTransaction[] = [
        { 
            id: 'trans-1', description: 'Mensalidade Fev/25 - João Silva', amount: 500, type: TransactionType.Income, 
            date: getRelativeDate(-10), dueDate: getRelativeDate(-10), paidDate: getRelativeDate(-10),
            category: 'Mensalidade', costCenterId: 'cc-1', studentId: 'stu-1', status: TransactionStatus.Paid, paymentMethod: PaymentMethod.Boleto 
        },
        { 
            id: 'trans-2', description: 'Material de Limpeza', amount: 150, type: TransactionType.Expense, 
            date: getRelativeDate(-5), dueDate: getRelativeDate(-5), paidDate: getRelativeDate(-5),
            category: 'Manutenção', costCenterId: 'cc-2', supplierId: 'sup-1', status: TransactionStatus.Paid 
        },
        { 
            id: 'trans-3', description: 'Conta de Energia', amount: 300, type: TransactionType.Expense, 
            date: getRelativeDate(2), dueDate: getRelativeDate(2),
            category: 'Contas', costCenterId: 'cc-2', supplierId: 'sup-2', status: TransactionStatus.Pending 
        },
    ];
    
    // Grades for "today" or recent past so they show up in lists
    const grades: Grade[] = [
        { studentId: 'stu-1', subjectId: 'subj-1', grade: 8.5, date: getRelativeDate(-5) },
        { studentId: 'stu-1', subjectId: 'subj-2', grade: 7.0, date: getRelativeDate(-4) },
        { studentId: 'stu-2', subjectId: 'subj-1', grade: 9.0, date: getRelativeDate(-5) },
        { studentId: 'stu-2', subjectId: 'subj-2', grade: 9.5, date: getRelativeDate(-4) },
        { studentId: 'stu-3', subjectId: 'subj-3', grade: 6.5, date: getRelativeDate(-3) },
    ];

    // Financial Configs Mock
    const financialCategories: FinancialCategory[] = [
        { id: 'cat-1', name: 'Mensalidade', type: TransactionType.Income },
        { id: 'cat-2', name: 'Matrícula', type: TransactionType.Income },
        { id: 'cat-3', name: 'Material Didático', type: TransactionType.Income },
        { id: 'cat-4', name: 'Salários', type: TransactionType.Expense },
        { id: 'cat-5', name: 'Manutenção', type: TransactionType.Expense },
        { id: 'cat-6', name: 'Contas de Consumo', type: TransactionType.Expense },
    ];

    const financialServices: FinancialService[] = [
        { id: 'serv-1', name: 'Mensalidade Fundamental I', value: 500 },
        { id: 'serv-2', name: 'Mensalidade Fundamental II', value: 650 },
        { id: 'serv-3', name: 'Taxa de Material Anual', value: 350 },
        { id: 'serv-4', name: 'Transporte Escolar (Mensal)', value: 180 },
    ];

    const discountRules: DiscountRule[] = [
        { id: 'disc-1', name: 'Irmãos (2º filho)', type: 'PERCENTAGE', value: 10, condition: 'Família' },
        { id: 'disc-2', name: 'Pagamento Pontual', type: 'PERCENTAGE', value: 5, condition: 'Pontualidade' },
        { id: 'disc-3', name: 'Bolsa Parcial', type: 'PERCENTAGE', value: 50, condition: 'Social' },
    ];

    const costCenters: CostCenter[] = [
        { id: 'cc-1', name: 'Receita Operacional', code: '1.0' },
        { id: 'cc-2', name: 'Administrativo', code: '2.1' },
        { id: 'cc-3', name: 'Pedagógico', code: '2.2' },
    ];

    const suppliers: Supplier[] = [
        { id: 'sup-1', name: 'Kalunga Papelaria', category: 'Material', cnpj: '00.000.000/0001-00' },
        { id: 'sup-2', name: 'Enel Energia', category: 'Contas', cnpj: '00.000.000/0002-00' }
    ];

    const penaltyConfig: PenaltyConfig = {
        interestRate: 1.0, // 1% ao mês
        finePercentage: 2.0, // 2% multa
        gracePeriodDays: 5
    };

    // --- FAVOCOIN MOCK DATA ---
    // Ensure ALL students start with 30 coins
    const favocoinTransactions: FavocoinTransaction[] = [];
    students.forEach(student => {
        favocoinTransactions.push({ 
            id: `ft-init-${student.id}`, 
            studentId: student.id, 
            amount: 30, 
            description: 'Saldo Inicial', 
            type: 'EARN', 
            date: getRelativeDate(-10) 
        });
    });

    // Add some extra activity for demo purposes
    favocoinTransactions.push(
        { id: 'ft-2', studentId: 'stu-1', amount: 10, description: 'Presença Confirmada', type: 'EARN', date: getRelativeDate(-2) },
        { id: 'ft-3', studentId: 'stu-1', amount: 10, description: 'Presença Confirmada', type: 'EARN', date: getRelativeDate(-1) },
        { id: 'ft-4', studentId: 'stu-1', amount: -5, description: 'Falta Injustificada', type: 'PENALTY', date: getRelativeDate(0) }
    );

    const storeItems: StoreItem[] = [
        { id: 'item-1', name: 'Caneta Colorida Neon', description: 'Caneta gel com tinta neon.', price: 50, stock: 20, imageUrl: 'https://cdn-icons-png.flaticon.com/512/263/263086.png' },
        { id: 'item-2', name: 'Passaporte do Lanche', description: 'Pula a fila da cantina uma vez.', price: 100, stock: 10, imageUrl: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png' },
        { id: 'item-3', name: 'Dia sem Uniforme', description: 'Permissão para vir sem uniforme na sexta.', price: 150, stock: 50, imageUrl: 'https://cdn-icons-png.flaticon.com/512/3159/3159066.png' },
        { id: 'item-4', name: 'Sessão de Cinema', description: 'Ingresso para sessão de cinema na sala de vídeo (compra coletiva recomendada).', price: 500, stock: 1, imageUrl: 'https://cdn-icons-png.flaticon.com/512/2809/2809590.png' },
    ];

    const adminUser: User = { 
        id: 'admin-1', 
        name: 'Admin', 
        role: Role.Admin, 
        email: 'admin@school.com',
        password: DEFAULT_PASSWORD,
        needsPasswordChange: true
    };

    return { 
        students, 
        teachers, 
        parents, 
        classes, 
        subjects, 
        attendance, 
        classLogs, 
        calendarEvents, 
        transactions, 
        users: [adminUser, ...teachers, ...parents], 
        grades,
        financialCategories,
        financialServices,
        discountRules,
        costCenters,
        suppliers,
        penaltyConfig,
        favocoinTransactions,
        storeItems,
        // CRITICAL: Set to 0 so that if this is used (fresh load), any Cloud Data (timestamp > 0) will override it.
        lastUpdated: 0 
    };
};

// HELPER: Sanitize data to ensure no undefined arrays cause crashes
// ALSO: Migrates old data structures to new requirements (e.g., adding default passwords)
const sanitizeData = (incoming: any, defaults: SchoolData): SchoolData => {
    if (!incoming) return defaults;

    // 1. Ensure basic arrays exist
    const students = Array.isArray(incoming.students) ? incoming.students : defaults.students;
    let teachers = Array.isArray(incoming.teachers) ? incoming.teachers : defaults.teachers;
    let parents = Array.isArray(incoming.parents) ? incoming.parents : defaults.parents;
    let users = Array.isArray(incoming.users) ? incoming.users : defaults.users;

    // 2. MIGRATE USERS: Add default password if missing
    users = users.map((u: User) => ({
        ...u,
        password: u.password || DEFAULT_PASSWORD,
        needsPasswordChange: u.needsPasswordChange !== undefined ? u.needsPasswordChange : true
    }));

    teachers = teachers.map((t: Teacher) => ({
        ...t,
        password: t.password || DEFAULT_PASSWORD,
        needsPasswordChange: t.needsPasswordChange !== undefined ? t.needsPasswordChange : true
    }));

    parents = parents.map((p: Parent) => ({
        ...p,
        password: p.password || DEFAULT_PASSWORD,
        needsPasswordChange: p.needsPasswordChange !== undefined ? p.needsPasswordChange : true
    }));

    // 3. ENSURE ADMINS EXIST
    const adminsToEnsure = [
        { email: 'admin@school.com', name: 'Admin', id: 'admin-1' },
        { email: 'rosila@cedmisv.com.br', name: 'Rosila', id: 'admin-rosila' },
        { email: 'marcia@cedmisv.com.br', name: 'Márcia', id: 'admin-marcia' }
    ];

    adminsToEnsure.forEach(admin => {
        const exists = users.some((u: User) => u.email.toLowerCase() === admin.email.toLowerCase());
        if (!exists) {
            users.push({
                id: admin.id,
                name: admin.name,
                role: Role.Admin,
                email: admin.email,
                password: DEFAULT_PASSWORD,
                needsPasswordChange: true
            });
        }
    });

    return {
        ...defaults, // Start with defaults to ensure keys exist
        ...incoming, // Override with incoming data
        
        students,
        teachers,
        parents,
        users, // Use migrated users
        
        classes: Array.isArray(incoming.classes) ? incoming.classes : defaults.classes,
        subjects: Array.isArray(incoming.subjects) ? incoming.subjects : defaults.subjects,
        attendance: Array.isArray(incoming.attendance) ? incoming.attendance : defaults.attendance,
        classLogs: Array.isArray(incoming.classLogs) ? incoming.classLogs : defaults.classLogs,
        calendarEvents: Array.isArray(incoming.calendarEvents) ? incoming.calendarEvents : defaults.calendarEvents,
        transactions: Array.isArray(incoming.transactions) ? incoming.transactions : defaults.transactions,
        grades: Array.isArray(incoming.grades) ? incoming.grades : defaults.grades,
        
        financialCategories: Array.isArray(incoming.financialCategories) ? incoming.financialCategories : defaults.financialCategories,
        financialServices: Array.isArray(incoming.financialServices) ? incoming.financialServices : defaults.financialServices,
        discountRules: Array.isArray(incoming.discountRules) ? incoming.discountRules : defaults.discountRules,
        costCenters: Array.isArray(incoming.costCenters) ? incoming.costCenters : defaults.costCenters,
        suppliers: Array.isArray(incoming.suppliers) ? incoming.suppliers : defaults.suppliers,
        penaltyConfig: incoming.penaltyConfig || defaults.penaltyConfig,
        
        favocoinTransactions: Array.isArray(incoming.favocoinTransactions) ? incoming.favocoinTransactions : defaults.favocoinTransactions,
        storeItems: Array.isArray(incoming.storeItems) ? incoming.storeItems : defaults.storeItems,

        lastUpdated: incoming.lastUpdated || Date.now(),
    };
};

interface SupabaseConfig {
    url: string;
    key: string;
}

interface DataContextType extends SchoolData {
  data: SchoolData;
  findUserByEmail: (email: string) => User | undefined;
  // Actions
  addStudent: (studentData: Partial<Student>, parentData: Partial<Parent>) => void;
  updateStudent: (studentId: string, studentData: Partial<Student>, parentData: Partial<Parent>) => void;
  deleteStudent: (studentId: string) => void;
  migrateStudents: (studentIds: string[], targetClassId: string) => void;

  addTeacher: (name: string, email: string, subjectIds: string[]) => void;
  deleteTeacher: (teacherId: string) => void;
  addClass: (name: string, teacherIds: string[], subjectIds: string[], shift?: 'Matutino' | 'Vespertino') => void;
  updateClass: (classId: string, name: string, teacherIds: string[], subjectIds: string[], shift?: 'Matutino' | 'Vespertino') => void;
  deleteClass: (classId: string) => void;
  addSubject: (name: string) => void;
  deleteSubject: (id: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (eventId: string) => void;
  
  // Financial Actions
  addTransaction: (transaction: Omit<FinancialTransaction, 'id'>) => void;
  deleteTransaction: (transactionId: string) => void;
  markAsPaid: (transactionId: string, paidDate: string, method: PaymentMethod) => void;
  generateTuitionBatch: (month: number, year: number, dueDate: string, serviceId: string) => void;
  generateStudentCarne: (studentId: string, serviceId: string, year: number) => void;
  importTransactions: (csvData: string) => void;

  saveAttendance: (classId: string, date: string, attendanceRecords: { studentId: string, present: boolean }[]) => void;
  saveGrades: (classId: string, subjectId: string, date: string, gradeRecords: { studentId: string, grade: number }[]) => void;
  importGrades: (newGrades: Grade[]) => void;
  
  // Financial Configuration Actions
  addFinancialCategory: (category: Omit<FinancialCategory, 'id'>) => void;
  updateFinancialCategory: (id: string, category: Omit<FinancialCategory, 'id'>) => void;
  deleteFinancialCategory: (id: string) => void;
  
  addFinancialService: (service: Omit<FinancialService, 'id'>) => void;
  updateFinancialService: (id: string, service: Omit<FinancialService, 'id'>) => void;
  deleteFinancialService: (id: string) => void;
  
  addDiscountRule: (rule: Omit<DiscountRule, 'id'>) => void;
  updateDiscountRule: (id: string, rule: Omit<DiscountRule, 'id'>) => void;
  deleteDiscountRule: (id: string) => void;
  
  addCostCenter: (cc: Omit<CostCenter, 'id'>) => void;
  updateCostCenter: (id: string, cc: Omit<CostCenter, 'id'>) => void;
  deleteCostCenter: (id: string) => void;
  
  addSupplier: (sup: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, sup: Omit<Supplier, 'id'>) => void;
  deleteSupplier: (id: string) => void;
  
  updatePenaltyConfig: (config: PenaltyConfig) => void;

  // Favocoin Actions
  addFavocoinTransaction: (studentId: string, amount: number, description: string, type: 'EARN' | 'SPEND' | 'PENALTY') => void;
  addStoreItem: (item: Omit<StoreItem, 'id'>) => void;
  updateStoreItem: (id: string, updates: Partial<StoreItem>) => void;
  deleteStoreItem: (id: string) => void;
  purchaseStoreItem: (studentIds: string[], itemId: string) => void;
  getStudentFavocoinBalance: (studentId: string) => number;

  // Security
  changePassword: (userId: string, newPass: string) => void;

  setData: React.Dispatch<React.SetStateAction<SchoolData>>;
  
  // Supabase related
  supabaseConfig: SupabaseConfig;
  updateSupabaseConfig: (url: string, key: string) => void;
  forceCloudSync: () => Promise<void>;
  loadFromCloud: () => Promise<boolean>;
  saveStatus: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode, initialData: SchoolData }> = ({ children, initialData }) => {
  // SUPABASE CONFIG - Initialize from LocalStorage or empty
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
      const savedConfig = localStorage.getItem('supabase-config');
      return savedConfig ? JSON.parse(savedConfig) : { url: '', key: '' };
  });

  const [data, setData] = useState<SchoolData>(() => {
    try {
        const savedData = localStorage.getItem('school-data');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            // Sanitize data to ensure structural integrity
            return sanitizeData(parsed, initialData);
        }
        return initialData;
    } catch (error) {
        console.error("Não foi possível carregar os dados do localStorage", error);
        return initialData;
    }
  });

  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('Salvo Localmente');

  // CENTRAL DATA UPDATER
  const updateData = (updater: (prev: SchoolData) => SchoolData) => {
      setSaveStatus('Salvando...');
      setData(prev => {
          const newData = updater(prev);
          newData.lastUpdated = Date.now();
          return newData;
      });
  };

  // Initialize Supabase Client
  useEffect(() => {
    if (supabaseConfig.url && supabaseConfig.key) {
        try {
            const client = createClient(supabaseConfig.url, supabaseConfig.key);
            setSupabaseClient(client);
            console.log("Supabase Client Initialized");
        } catch (e) {
            console.error("Failed to init supabase", e);
        }
    } else {
        setSupabaseClient(null);
    }
  }, [supabaseConfig]);

  // Initial Sync Logic (Arbitration)
  useEffect(() => {
      const initLoad = async () => {
          if (supabaseClient) {
             try {
                const { data: cloudRow, error } = await supabaseClient
                    .from('school_data')
                    .select('content')
                    .eq('id', 1)
                    .single();
                
                if (cloudRow && cloudRow.content && !error) {
                     const cloudData = cloudRow.content as SchoolData;
                     const localTimestamp = data.lastUpdated || 0;
                     const cloudTimestamp = cloudData.lastUpdated || 0;

                     console.log(`Sync Check: Cloud TS (${cloudTimestamp}) vs Local TS (${localTimestamp})`);

                     if (cloudTimestamp > localTimestamp || (localTimestamp === 0 && cloudTimestamp > 0)) {
                         console.log("Nuvem é mais recente ou Local é Mock. Baixando...");
                         setData(sanitizeData(cloudData, initialData));
                         setSaveStatus('Sincronizado da Nuvem');
                     } else {
                         console.log("Local é mais recente ou igual. Mantendo Local.");
                         setSaveStatus('Salvo Localmente');
                     }
                } else if (error && (error.code === '401' || error.message.toLowerCase().includes('invalid api key'))) {
                     console.warn("Invalid API Key detected during init load.");
                     setSaveStatus('Chave Inválida - Verifique Configurações');
                }
             } catch (err) {
                 console.error("Erro ao verificar dados da nuvem:", err);
             }
          }
      };
      if(supabaseClient) initLoad();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient]);


  // Persistence Effect
  useEffect(() => {
    try {
        // Strip heavy photos for localStorage to avoid quota exceeded errors
        const dataForLocal = {
            ...data,
            students: data.students.map(s => {
                const { photoUrl, ...rest } = s; 
                return rest;
            })
        };
        localStorage.setItem('school-data', JSON.stringify(dataForLocal));
    } catch (error) {
        console.error("Erro ao salvar localStorage (Quota Exceeded Possível)", error);
        setSaveStatus('Erro Local: Espaço Cheio');
    }

    const timeoutId = setTimeout(async () => {
        if (supabaseClient) {
            try {
                 const { error } = await supabaseClient
                    .from('school_data')
                    .upsert({ id: 1, content: data, updated_at: new Date() });
                
                if (error) {
                    console.error("Erro ao salvar na nuvem:", error.message);
                    if (error.code === '401' || error.message.toLowerCase().includes('invalid api key')) {
                        setSaveStatus('Chave Inválida - Verifique Configurações');
                    } else {
                        setSaveStatus('Erro ao Salvar na Nuvem');
                    }
                } else {
                    setSaveStatus('Salvo na Nuvem');
                }
            } catch (e: any) {
                 setSaveStatus('Erro de Conexão');
            }
        } else {
            setSaveStatus('Salvo Localmente');
        }
    }, 2000); // Debounce save

    return () => clearTimeout(timeoutId);
  }, [data, supabaseClient]);


  // --- ACTIONS ---

  const updateSupabaseConfig = (url: string, key: string) => {
      const newConfig = { url, key };
      setSupabaseConfig(newConfig);
      localStorage.setItem('supabase-config', JSON.stringify(newConfig));
  };

  const forceCloudSync = async () => {
      if (!supabaseClient) throw new Error("Supabase não configurado.");
      setSaveStatus('Enviando...');
      try {
          const { error } = await supabaseClient
            .from('school_data')
            .upsert({ id: 1, content: data, updated_at: new Date() });
          if (error) throw new Error(error.message);
          setSaveStatus('Salvo na Nuvem');
      } catch (e: any) {
          setSaveStatus('Erro no Upload');
          throw new Error(e.message || "Erro desconhecido ao sincronizar.");
      }
  };

  const loadFromCloud = async () => {
      if (!supabaseClient) throw new Error("Supabase não configurado.");
      setSaveStatus('Baixando...');
      try {
          const { data: cloudData, error } = await supabaseClient
            .from('school_data')
            .select('content')
            .eq('id', 1)
            .single();
          
          if (error) throw new Error(error.message);
          if (cloudData && cloudData.content) {
              setData(sanitizeData(cloudData.content, initialData));
              setSaveStatus('Dados Baixados');
              return true;
          }
          return false;
      } catch (e: any) {
          setSaveStatus('Erro no Download');
          throw new Error(e.message || "Erro desconhecido ao baixar dados.");
      }
  };

  const findUserByEmail = (email: string) => {
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  // --- CRUD ACTIONS USING updateData ---

  const addSubject = (name: string) => {
    updateData(prev => ({ ...prev, subjects: [...prev.subjects, { id: `subj-${Date.now()}`, name }] }));
  };

  const deleteSubject = (id: string) => {
    updateData(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.id !== id) }));
  };

  const addStudent = (studentData: Partial<Student>, parentData: Partial<Parent>) => {
      const studentId = `stu-${Date.now()}`;
      const parentId = `parent-${Date.now()}`;
      
      const newStudent: Student = { 
          id: studentId, 
          name: studentData.name || 'Nome Desconhecido', 
          classId: studentData.classId || '', 
          parentId,
          enrollmentId: studentData.enrollmentId,
          birthDate: studentData.birthDate,
          cpf: studentData.cpf,
          email: studentData.email,
          phone: studentData.phone,
          address: studentData.address,
          cityOfBirth: studentData.cityOfBirth,
          status: studentData.status || 'ativo',
          photoUrl: studentData.photoUrl // New field
      };

      const newParent: Parent = { 
          id: parentId, 
          name: parentData.name || 'Responsável', 
          email: parentData.email || '', 
          role: Role.Parent, 
          studentId,
          phone: parentData.phone,
          birthDate: parentData.birthDate,
          password: DEFAULT_PASSWORD, // Default Password
          needsPasswordChange: true // Force Change
      };

      // Auto-initialize Favocoin Balance for new students
      const initialFavocoin: FavocoinTransaction = {
          id: `ft-init-${studentId}`,
          studentId,
          amount: FAVOCOIN_RULES.INITIAL_BALANCE,
          description: 'Saldo Inicial (Boas-vindas)',
          type: 'EARN',
          date: new Date().toISOString().split('T')[0]
      };

      updateData(prev => {
          const updatedClasses = prev.classes.map(c => c.id === studentData.classId ? { ...c, studentIds: [...c.studentIds, studentId] } : c);
          return { 
              ...prev, 
              students: [...prev.students, newStudent], 
              parents: [...prev.parents, newParent], 
              users: [...prev.users, newParent], 
              classes: updatedClasses,
              favocoinTransactions: [...prev.favocoinTransactions, initialFavocoin]
          };
      });
  };

  const updateStudent = (studentId: string, studentData: Partial<Student>, parentData: Partial<Parent>) => {
    updateData(prev => {
        const student = prev.students.find(s => s.id === studentId);
        if (!student) return prev;
        
        const updatedStudents = prev.students.map(s => s.id === studentId ? { 
            ...s, 
            ...studentData
        } : s);

        let updatedClasses = prev.classes;
        if (studentData.classId && student.classId !== studentData.classId) {
            updatedClasses = updatedClasses.map(c => {
                if (c.id === student.classId) return { ...c, studentIds: c.studentIds.filter(id => id !== studentId) };
                if (c.id === studentData.classId) return { ...c, studentIds: [...c.studentIds, studentId] };
                return c;
            });
        }
        
        const updatedParents = prev.parents.map(p => p.id === student.parentId ? { 
            ...p, 
            ...parentData
        } : p);
        
        const updatedUsers = prev.users.map(u => u.id === student.parentId ? { 
            ...u, 
            name: parentData.name || u.name, 
            email: parentData.email || u.email 
        } : u);

        return { ...prev, students: updatedStudents, classes: updatedClasses, parents: updatedParents, users: updatedUsers };
    });
  };

  const deleteStudent = (studentId: string) => {
    updateData(prev => {
        const studentToDelete = prev.students.find(s => s.id === studentId);
        if (!studentToDelete) return prev;
        const hasSiblings = prev.students.some(s => s.parentId === studentToDelete.parentId && s.id !== studentId);
        const newStudents = prev.students.filter(s => s.id !== studentId);
        let newParents = prev.parents;
        let newUsers = prev.users;
        if (!hasSiblings) {
            newParents = prev.parents.filter(p => p.id !== studentToDelete.parentId);
            newUsers = prev.users.filter(u => u.id !== studentToDelete.parentId);
        }
        const newAttendance = prev.attendance.filter(a => a.studentId !== studentId);
        const newGrades = prev.grades.filter(g => g.studentId !== studentId);
        const newClasses = prev.classes.map(c => c.studentIds.includes(studentId) ? { ...c, studentIds: c.studentIds.filter(id => id !== studentId) } : c);
        const newFavocoinTrans = prev.favocoinTransactions.filter(t => t.studentId !== studentId);

        return { ...prev, students: newStudents, parents: newParents, users: newUsers, classes: newClasses, attendance: newAttendance, grades: newGrades, favocoinTransactions: newFavocoinTrans };
    });
  };

  const migrateStudents = (studentIds: string[], targetClassId: string) => {
    updateData(prev => {
        // 1. Update Student objects with new classId
        const updatedStudents = prev.students.map(s => 
            studentIds.includes(s.id) ? { ...s, classId: targetClassId } : s
        );

        // 2. Remove students from ALL classes (to clean up old references)
        // Then add to target class
        const updatedClasses = prev.classes.map(c => {
            let newStudentIds = c.studentIds.filter(id => !studentIds.includes(id)); // Remove from source/any other class
            
            if (c.id === targetClassId) {
                // Add to target class, ensuring no duplicates
                newStudentIds = Array.from(new Set([...newStudentIds, ...studentIds]));
            }
            return { ...c, studentIds: newStudentIds };
        });

        return { ...prev, students: updatedStudents, classes: updatedClasses };
    });
  };

  const addTeacher = (name: string, email: string, subjectIds: string[]) => {
      const teacherId = `teach-${Date.now()}`;
      const newTeacher: Teacher = { 
          id: teacherId, 
          name, 
          email, 
          role: Role.Teacher, 
          subjectIds,
          password: DEFAULT_PASSWORD, // Default
          needsPasswordChange: true // Force change
      };
      updateData(prev => ({ ...prev, teachers: [...prev.teachers, newTeacher], users: [...prev.users, newTeacher] }));
  };

  const deleteTeacher = (teacherId: string) => {
      updateData(prev => {
          const newTeachers = prev.teachers.filter(t => t.id !== teacherId);
          const newUsers = prev.users.filter(u => u.id !== teacherId);
          const newClasses = prev.classes.map(c => c.teacherIds.includes(teacherId) ? { ...c, teacherIds: c.teacherIds.filter(id => id !== teacherId) } : c);
          return { ...prev, teachers: newTeachers, users: newUsers, classes: newClasses };
      });
  };

  const addClass = (name: string, teacherIds: string[], subjectIds: string[], shift?: 'Matutino' | 'Vespertino') => {
      const classId = `class-${Date.now()}`;
      const schedule = shift ? getScheduleByShift(shift) : undefined;
      const newClass: SchoolClass = { id: classId, name, teacherIds, subjectIds, studentIds: [], shift, schedule };
      updateData(prev => ({ ...prev, classes: [...prev.classes, newClass] }));
  };

  const updateClass = (classId: string, name: string, teacherIds: string[], subjectIds: string[], shift?: 'Matutino' | 'Vespertino') => {
    updateData(prev => ({ ...prev, classes: prev.classes.map(c => {
        if (c.id === classId) {
            const schedule = shift ? getScheduleByShift(shift) : c.schedule;
            return { ...c, name, teacherIds, subjectIds, shift, schedule };
        }
        return c;
    }) }));
  };
  
  const deleteClass = (classId: string) => {
    updateData(prev => {
      const newClasses = prev.classes.filter(c => c.id !== classId);
      const newStudents = prev.students.map(s => s.classId === classId ? { ...s, classId: '' } : s);
      return { ...prev, classes: newClasses, students: newStudents };
    });
  };

  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    updateData(prev => ({ ...prev, calendarEvents: [...prev.calendarEvents, { ...event, id: `event-${Date.now()}`}] }));
  };

  const updateCalendarEvent = (eventId: string, updates: Partial<CalendarEvent>) => {
    updateData(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(e => e.id === eventId ? { ...e, ...updates } : e)
    }));
  };

  const deleteCalendarEvent = (eventId: string) => {
    updateData(prev => ({ ...prev, calendarEvents: prev.calendarEvents.filter(e => e.id !== eventId) }));
  };

  const addTransaction = (transaction: Omit<FinancialTransaction, 'id'>) => {
    updateData(prev => ({ ...prev, transactions: [...prev.transactions, { ...transaction, id: `trans-${Date.now()}` }] }));
  };

  const deleteTransaction = (transactionId: string) => {
    updateData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== transactionId) }));
  };

  const markAsPaid = (transactionId: string, paidDate: string, method: PaymentMethod) => {
      updateData(prev => ({
          ...prev,
          transactions: prev.transactions.map(t => 
              t.id === transactionId 
              ? { ...t, status: TransactionStatus.Paid, paidDate, paymentMethod: method } 
              : t
          )
      }));
  };

  const generateTuitionBatch = (month: number, year: number, dueDate: string, serviceId: string) => {
      updateData(prev => {
          const service = prev.financialServices.find(s => s.id === serviceId);
          const amount = service ? service.value : 0;
          const description = `${service ? service.name : 'Mensalidade'} - ${month}/${year}`;
          
          const newTransactions: FinancialTransaction[] = [];
          
          prev.students.forEach(student => {
              // Check if already exists
              const exists = prev.transactions.some(t => 
                  t.studentId === student.id && 
                  t.type === TransactionType.Income && 
                  t.description.includes(`${month}/${year}`)
              );

              if (!exists) {
                  newTransactions.push({
                      id: `trans-tuition-${student.id}-${Date.now()}`,
                      description: `${description} - ${student.name}`,
                      amount: amount,
                      type: TransactionType.Income,
                      date: new Date().toISOString().split('T')[0],
                      dueDate: dueDate,
                      category: 'Mensalidade',
                      studentId: student.id,
                      status: TransactionStatus.Pending,
                      costCenterId: prev.costCenters.find(c => c.name.includes('Receita'))?.id
                  });
              }
          });

          return { ...prev, transactions: [...prev.transactions, ...newTransactions] };
      });
  };

  const generateStudentCarne = (studentId: string, serviceId: string, year: number) => {
    updateData(prev => {
        const student = prev.students.find(s => s.id === studentId);
        const service = prev.financialServices.find(s => s.id === serviceId);
        
        if (!student || !service) return prev;

        const amount = service.value;
        const newTransactions: FinancialTransaction[] = [];
        const currentMonth = new Date().getMonth() + 1; // Start from current month or generally from Jan

        // Let's generate for all 12 months, or remaining months if it's current year
        const startMonth = year === new Date().getFullYear() ? currentMonth : 1;

        for (let m = startMonth; m <= 12; m++) {
             const description = `${service.name} - ${m}/${year}`;
             const dueDate = `${year}-${String(m).padStart(2, '0')}-10`; // Default due date 10th

             const exists = prev.transactions.some(t => 
                t.studentId === student.id && 
                t.type === TransactionType.Income && 
                t.description === description
             );

             if (!exists) {
                 newTransactions.push({
                     id: `trans-carne-${student.id}-${year}-${m}-${Date.now()}`,
                     description: description,
                     amount: amount,
                     type: TransactionType.Income,
                     date: new Date().toISOString().split('T')[0],
                     dueDate: dueDate,
                     category: 'Mensalidade',
                     studentId: student.id,
                     status: TransactionStatus.Pending,
                     costCenterId: prev.costCenters.find(c => c.name.includes('Receita'))?.id,
                     recurrence: true
                 });
             }
        }

        return { ...prev, transactions: [...prev.transactions, ...newTransactions] };
    });
  };

  const importTransactions = (csvData: string) => {
      // Very basic Mock import parser for CSV
      // Expected Format: Date,Description,Amount,Type(INCOME/EXPENSE)
      const lines = csvData.split('\n');
      const newTransactions: FinancialTransaction[] = [];
      
      lines.forEach((line, idx) => {
          if (idx === 0) return; // Skip Header
          const cols = line.split(',');
          if (cols.length >= 4) {
              const typeStr = cols[3].trim().toUpperCase();
              newTransactions.push({
                  id: `trans-imp-${Date.now()}-${idx}`,
                  date: cols[0].trim(),
                  dueDate: cols[0].trim(),
                  description: cols[1].trim(),
                  amount: parseFloat(cols[2]),
                  type: typeStr === 'INCOME' ? TransactionType.Income : TransactionType.Expense,
                  status: TransactionStatus.Paid, // Assuming imported history is paid
                  paidDate: cols[0].trim(),
                  category: 'Importado'
              });
          }
      });
      
      if (newTransactions.length > 0) {
          updateData(prev => ({ ...prev, transactions: [...prev.transactions, ...newTransactions] }));
          alert(`${newTransactions.length} transações importadas com sucesso!`);
      } else {
          alert('Nenhuma transação válida encontrada no arquivo.');
      }
  };

  const saveAttendance = (classId: string, date: string, attendanceRecords: { studentId: string, present: boolean }[]) => {
      updateData(prev => {
          const schoolClass = prev.classes.find(c => c.id === classId);
          // Check if class is eligible for Favocoin (1st to 5th grade)
          const isEligibleForFavocoin = schoolClass && FAVOCOIN_ELIGIBLE_YEARS.some(y => schoolClass.name.toUpperCase().includes(y));

          let updatedFavocoinTransactions = [...prev.favocoinTransactions];

          if (isEligibleForFavocoin) {
              attendanceRecords.forEach(record => {
                  const txDescription = `Presença - ${new Date(date).toLocaleDateString('pt-BR')}`;
                  
                  // Remove existing attendance transactions for this day to avoid duplicates/conflicts
                  updatedFavocoinTransactions = updatedFavocoinTransactions.filter(t => 
                      !(t.studentId === record.studentId && t.date === date && (t.type === 'EARN' || t.type === 'PENALTY') && t.description.includes('Presença'))
                  );

                  // Add new transaction based on presence
                  if (record.present) {
                      updatedFavocoinTransactions.push({
                          id: `ft-att-${record.studentId}-${date}`,
                          studentId: record.studentId,
                          amount: FAVOCOIN_RULES.ATTENDANCE_REWARD,
                          description: 'Presença Confirmada',
                          type: 'EARN',
                          date: date
                      });
                  } else {
                      updatedFavocoinTransactions.push({
                          id: `ft-att-miss-${record.studentId}-${date}`,
                          studentId: record.studentId,
                          amount: -FAVOCOIN_RULES.ABSENCE_PENALTY,
                          description: 'Falta',
                          type: 'PENALTY',
                          date: date
                      });
                  }
              });
          }

          const otherAttendance = prev.attendance.filter(a => a.date !== date || !attendanceRecords.some(ar => ar.studentId === a.studentId));
          const newAttendance: Attendance[] = attendanceRecords.map(ar => ({...ar, date}));
          
          return { 
              ...prev, 
              attendance: [...otherAttendance, ...newAttendance],
              favocoinTransactions: updatedFavocoinTransactions
          };
      });
  };

  const saveGrades = (classId: string, subjectId: string, date: string, gradeRecords: { studentId: string, grade: number }[]) => {
      updateData(prev => {
          const otherGrades = prev.grades.filter(g => !(g.date === date && g.subjectId === subjectId && gradeRecords.some(gr => gr.studentId === g.studentId)));
          const newGrades: Grade[] = gradeRecords.map(gr => ({ studentId: gr.studentId, grade: gr.grade, subjectId, date }));
          return { ...prev, grades: [...otherGrades, ...newGrades] };
      });
  };

  const importGrades = (newGrades: Grade[]) => {
      updateData(prev => {
          // Identify the composite keys of the new grades to remove potential conflicts/duplicates
          // Composite key = studentId + subjectId + date
          const newGradeKeys = new Set(newGrades.map(g => `${g.studentId}-${g.subjectId}-${g.date}`));
          
          // Filter out existing grades that are being replaced
          const filteredOldGrades = prev.grades.filter(g => !newGradeKeys.has(`${g.studentId}-${g.subjectId}-${g.date}`));
          
          return { ...prev, grades: [...filteredOldGrades, ...newGrades] };
      });
  };

  // --- FINANCIAL CONFIG ACTIONS ---

  const addFinancialCategory = (category: Omit<FinancialCategory, 'id'>) => {
      updateData(prev => ({ ...prev, financialCategories: [...prev.financialCategories, { ...category, id: `cat-${Date.now()}` }] }));
  };

  const updateFinancialCategory = (id: string, category: Omit<FinancialCategory, 'id'>) => {
      updateData(prev => ({ ...prev, financialCategories: prev.financialCategories.map(c => c.id === id ? { ...category, id } : c) }));
  };

  const deleteFinancialCategory = (id: string) => {
      updateData(prev => ({ ...prev, financialCategories: prev.financialCategories.filter(c => c.id !== id) }));
  };

  const addFinancialService = (service: Omit<FinancialService, 'id'>) => {
      updateData(prev => ({ ...prev, financialServices: [...prev.financialServices, { ...service, id: `serv-${Date.now()}` }] }));
  };

  const updateFinancialService = (id: string, service: Omit<FinancialService, 'id'>) => {
      updateData(prev => ({ ...prev, financialServices: prev.financialServices.map(s => s.id === id ? { ...service, id } : s) }));
  };

  const deleteFinancialService = (id: string) => {
      updateData(prev => ({ ...prev, financialServices: prev.financialServices.filter(s => s.id !== id) }));
  };

  const addDiscountRule = (rule: Omit<DiscountRule, 'id'>) => {
      updateData(prev => ({ ...prev, discountRules: [...prev.discountRules, { ...rule, id: `disc-${Date.now()}` }] }));
  };

  const updateDiscountRule = (id: string, rule: Omit<DiscountRule, 'id'>) => {
      updateData(prev => ({ ...prev, discountRules: prev.discountRules.map(r => r.id === id ? { ...rule, id } : r) }));
  };

  const deleteDiscountRule = (id: string) => {
      updateData(prev => ({ ...prev, discountRules: prev.discountRules.filter(r => r.id !== id) }));
  };

  const addCostCenter = (cc: Omit<CostCenter, 'id'>) => {
      updateData(prev => ({ ...prev, costCenters: [...prev.costCenters, { ...cc, id: `cc-${Date.now()}` }] }));
  };

  const updateCostCenter = (id: string, cc: Omit<CostCenter, 'id'>) => {
      updateData(prev => ({ ...prev, costCenters: prev.costCenters.map(c => c.id === id ? { ...cc, id } : c) }));
  };

  const deleteCostCenter = (id: string) => {
      updateData(prev => ({ ...prev, costCenters: prev.costCenters.filter(c => c.id !== id) }));
  };

  const addSupplier = (sup: Omit<Supplier, 'id'>) => {
      updateData(prev => ({ ...prev, suppliers: [...prev.suppliers, { ...sup, id: `sup-${Date.now()}` }] }));
  };

  const updateSupplier = (id: string, sup: Omit<Supplier, 'id'>) => {
      updateData(prev => ({ ...prev, suppliers: prev.suppliers.map(s => s.id === id ? { ...sup, id } : s) }));
  };

  const deleteSupplier = (id: string) => {
      updateData(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== id) }));
  };

  const updatePenaltyConfig = (config: PenaltyConfig) => {
      updateData(prev => ({ ...prev, penaltyConfig: config }));
  };

  // --- FAVOCOIN ACTIONS ---

  const addFavocoinTransaction = (studentId: string, amount: number, description: string, type: 'EARN' | 'SPEND' | 'PENALTY') => {
      updateData(prev => ({
          ...prev,
          favocoinTransactions: [...prev.favocoinTransactions, {
              id: `ft-${Date.now()}-${Math.random()}`,
              studentId,
              amount,
              description,
              type,
              date: new Date().toISOString().split('T')[0]
          }]
      }));
  };

  const addStoreItem = (item: Omit<StoreItem, 'id'>) => {
      updateData(prev => ({ ...prev, storeItems: [...prev.storeItems, { ...item, id: `item-${Date.now()}` }] }));
  };

  const updateStoreItem = (id: string, updates: Partial<StoreItem>) => {
      updateData(prev => ({
          ...prev,
          storeItems: prev.storeItems.map(i => i.id === id ? { ...i, ...updates } : i)
      }));
  };

  const deleteStoreItem = (id: string) => {
      updateData(prev => ({ ...prev, storeItems: prev.storeItems.filter(i => i.id !== id) }));
  };

  const purchaseStoreItem = (studentIds: string[], itemId: string) => {
      updateData(prev => {
          const item = prev.storeItems.find(i => i.id === itemId);
          if (!item || item.stock < 1) return prev;

          // Calculate split price
          const pricePerStudent = item.price / studentIds.length;
          
          const newTransactions: FavocoinTransaction[] = studentIds.map(sid => ({
              id: `ft-buy-${sid}-${Date.now()}`,
              studentId: sid,
              amount: -pricePerStudent,
              description: `Compra: ${item.name}${studentIds.length > 1 ? ' (Coletiva)' : ''}`,
              type: 'SPEND',
              date: new Date().toISOString().split('T')[0]
          }));

          const updatedItems = prev.storeItems.map(i => 
              i.id === itemId ? { ...i, stock: i.stock - 1 } : i
          );

          return {
              ...prev,
              storeItems: updatedItems,
              favocoinTransactions: [...prev.favocoinTransactions, ...newTransactions]
          };
      });
  };

  const getStudentFavocoinBalance = (studentId: string): number => {
      const txs = data.favocoinTransactions.filter(t => t.studentId === studentId);
      return txs.reduce((acc, t) => acc + t.amount, 0);
  };

  // --- PASSWORD MANAGEMENT ---
  const changePassword = (userId: string, newPass: string) => {
      updateData(prev => {
          // Update in users array
          const updatedUsers = prev.users.map(u => 
              u.id === userId ? { ...u, password: newPass, needsPasswordChange: false } : u
          );
          
          // Also sync with specific arrays to maintain consistency
          const updatedTeachers = prev.teachers.map(t => 
              t.id === userId ? { ...t, password: newPass, needsPasswordChange: false } : t
          );
          
          const updatedParents = prev.parents.map(p => 
              p.id === userId ? { ...p, password: newPass, needsPasswordChange: false } : p
          );

          // Update Admin if it matches
          // Note: Mock data structure has admin in `users` array primarily.

          return { 
              ...prev, 
              users: updatedUsers,
              teachers: updatedTeachers,
              parents: updatedParents
          };
      });
  };

  return (
    <DataContext.Provider value={{ 
        ...data, 
        data,
        findUserByEmail, 
        addStudent, updateStudent, deleteStudent, migrateStudents,
        addTeacher, deleteTeacher,
        addClass, updateClass, deleteClass,
        addSubject, deleteSubject,
        addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, 
        addTransaction, deleteTransaction, markAsPaid, generateTuitionBatch, generateStudentCarne, importTransactions,
        saveAttendance, saveGrades, importGrades,
        addFinancialCategory, updateFinancialCategory, deleteFinancialCategory,
        addFinancialService, updateFinancialService, deleteFinancialService,
        addDiscountRule, updateDiscountRule, deleteDiscountRule,
        addCostCenter, updateCostCenter, deleteCostCenter,
        addSupplier, updateSupplier, deleteSupplier,
        updatePenaltyConfig,
        addFavocoinTransaction, addStoreItem, updateStoreItem, deleteStoreItem, purchaseStoreItem, getStudentFavocoinBalance,
        changePassword,
        setData: (value) => {
            // Intercept setData to ensure sanitization even on manual updates
            if (typeof value === 'function') {
                setData(prev => {
                    const next = value(prev);
                    return sanitizeData(next, initialData);
                });
            } else {
                setData(sanitizeData(value, initialData));
            }
        },
        supabaseConfig,
        updateSupabaseConfig,
        forceCloudSync,
        loadFromCloud,
        saveStatus
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
