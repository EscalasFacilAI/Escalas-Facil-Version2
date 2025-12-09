
export interface User {
  id: string;
  username: string;
  password?: string; // In real app, hash this. Here simulated.
  name: string;
  role: 'admin' | 'manager' | 'viewer'; // Admin: all; Manager: edit allowed units; Viewer: read-only allowed units
  allowedUnits?: string[]; // If empty/undefined for admin, means all. For others, restricts view.
  allowedSectors?: string[]; // New: Granular control within units
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  unit: string;
  sector: string;
  shiftType: string; 
  contractType: 'CLT' | 'PJ' | 'Estágio';
  cpf: string;
  positionNumber: string; 
  categoryCode: string; 
  shiftPattern: string; 
  bankHoursBalance: string;
  
  // New Fields
  organizationalUnit?: string;
  birthDate?: string;
  admissionDate?: string;
  email?: string;
  gender?: string;
  workTime?: string;
  lastDayOff?: string; // UF: Última Folga (YYYY-MM-DD)
  terminationDate?: string; // Data de Desligamento (YYYY-MM-DD)
}

export type ShiftCategory = 'work' | 'dayoff' | 'absence' | 'leave';

export interface Shift {
  id: string;
  code: string;
  name: string;
  category: ShiftCategory; // New field
  startTime: string;
  endTime: string;
  color: string; 
  textColor?: string;
  isDayOff: boolean;
  isSystem?: boolean;
}

export type ScheduleMap = Record<string, string>;

export interface AttachmentData {
    name: string;
    data: string; // Base64 string
}

export interface MonthlySchedule {
  month: number; 
  year: number;
  assignments: Record<string, ScheduleMap>; 
  attachments?: Record<string, Record<string, AttachmentData>>; // employeeId -> dateKey -> {name, data}
  comments?: Record<string, Record<string, string>>; // employeeId -> dateKey -> Comment Type (e.g., "Hora Extra")
}

export interface ValidationResult {
  valid: boolean;
  messages: string[];
}

export interface AIRulesConfig {
  maxConsecutiveDays: number;
  minRestHours: number;
  preferSundayOff: boolean;
  sundayOffFrequency: number; 
  preferConsecutiveDaysOff: boolean; // Dobradinhas
  allowExtraDaysOff: boolean; // New: Allow generating extra days off
  extraDaysOffCount: number; // New: How many extra days
}

// Role Name -> Default Count OR Specific Day Config
export interface StaffingDayConfig {
  default: number;
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
  sunday?: number;
}

export type StaffingConfig = Record<string, StaffingDayConfig>;

export interface GridSelection {
  startRow: number;
  startCol: number; // Day number
  endRow: number;
  endCol: number;
}

export interface GridProps {
    onUndo?: () => void;
    onRedo?: () => void;
}

// Added 'shiftType' to the keys
export type ExtendedColumnKey = 'name' | 'id' | 'role' | 'cpf' | 'scale' | 'time' | 'shiftType' | 'position' | 'council' | 'bh' | 'uf';
