
export enum Role {
  Admin = 'ADMIN',
  Teacher = 'TEACHER',
  Parent = 'PARENT',
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  password?: string; // New field for auth
  needsPasswordChange?: boolean; // Force password change on first login
}

export interface Parent extends User {
  role: Role.Parent;
  studentId: string;
  phone?: string; // New from CSV
  birthDate?: string; // New from CSV
}

export interface Teacher extends User {
  role: Role.Teacher;
  subjectIds: string[];
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  parentId: string;
  
  // New Fields from CSV
  enrollmentId?: string; // Matrícula
  birthDate?: string; // Data de Nascimento
  cpf?: string; // CPF
  email?: string; // Email do Aluno
  phone?: string; // Telefone do Aluno
  address?: string; // Endereço
  cityOfBirth?: string; // Naturalidade
  status?: string; // Status da Matrícula (ativo/inativo)
  
  photoUrl?: string; // Base64 Photo
}

export interface Subject {
  id: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
  subjectIds: string[];
  shift?: 'Matutino' | 'Vespertino'; // Novo campo
  schedule?: string; // Novo campo
}

export interface Attendance {
  studentId: string;
  date: string; // YYYY-MM-DD
  present: boolean;
}

export interface ClassLog {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  content: string;
  subjectId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Start Date)
  endDate?: string; // YYYY-MM-DD (End Date) - Optional, defaults to start date if missing
  description?: string;
  classId?: string; // Optional: link event to a specific class
}

// --- FAVOCOIN TYPES ---

export interface FavocoinTransaction {
    id: string;
    studentId: string;
    amount: number; // Positive for gain, Negative for loss
    description: string; // e.g., "Presença", "Tarefa de Casa", "Compra na Loja"
    date: string; // ISO Date
    type: 'EARN' | 'SPEND' | 'PENALTY';
}

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl?: string;
}

// --- FINANCIAL SETTINGS TYPES ---

export enum TransactionType {
  Income = 'INCOME',
  Expense = 'EXPENSE',
}

export enum TransactionStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Overdue = 'OVERDUE',
  Cancelled = 'CANCELLED'
}

export enum PaymentMethod {
  Boleto = 'BOLETO',
  Pix = 'PIX',
  CreditCard = 'CREDIT_CARD',
  Cash = 'CASH',
  Transfer = 'TRANSFER'
}

export interface Supplier {
    id: string;
    name: string;
    cnpj?: string;
    category: string; // ex: Material, Manutenção
    contact?: string;
}

export interface FinancialCategory {
    id: string;
    name: string;
    type: TransactionType;
}

export interface FinancialService {
    id: string;
    name: string;
    value: number;
    description?: string;
}

export interface DiscountRule {
    id: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    condition?: string; // e.g., "Pontualidade", "Bolsa"
}

export interface CostCenter {
    id: string;
    name: string;
    code?: string;
}

export interface PenaltyConfig {
    interestRate: number; // Monthly interest %
    finePercentage: number; // One-time fine %
    gracePeriodDays: number;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // Data de competência/lançamento YYYY-MM-DD
  dueDate: string; // Data de Vencimento YYYY-MM-DD
  paidDate?: string; // Data do Pagamento (se pago)
  
  category: string;
  costCenterId?: string;
  
  status: TransactionStatus;
  paymentMethod?: PaymentMethod;
  
  // Links
  studentId?: string; // Para mensalidades/taxas de alunos
  supplierId?: string; // Para despesas com fornecedores
  
  attachmentUrl?: string; // Link para comprovante/boleto
  recurrence?: boolean; // Se é recorrente
}

export interface Grade {
  studentId: string;
  subjectId: string;
  grade: number; // 0-10 scale
  date: string; // YYYY-MM-DD
}

export interface SchoolData {
    students: Student[];
    teachers: Teacher[];
    parents: Parent[];
    classes: SchoolClass[];
    subjects: Subject[];
    attendance: Attendance[];
    classLogs: ClassLog[];
    calendarEvents: CalendarEvent[];
    transactions: FinancialTransaction[];
    users: User[];
    grades: Grade[];
    
    // Favocoin Data
    favocoinTransactions: FavocoinTransaction[];
    storeItems: StoreItem[];

    // Financial Configuration Data
    financialCategories: FinancialCategory[];
    financialServices: FinancialService[];
    discountRules: DiscountRule[];
    costCenters: CostCenter[];
    suppliers: Supplier[];
    penaltyConfig: PenaltyConfig;

    lastUpdated: number; // Timestamp para controle de sincronização
}
