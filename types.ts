
export interface User {
  id: string;
  username: string;
  password?: string; // In real app, hash this. Here simulated.
  name: string;
  role: 'admin' | 'manager' | 'viewer'; // Admin: all; Manager: edit allowed units; Viewer: read-only allowed units
  allowedUnits?: string[]; // If empty/undefined for admin, means all. For others, restricts view.
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
  gender?: string; // Added field
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

export interface MonthlySchedule {
  month: number; 
  year: number;
  assignments: Record<string, ScheduleMap>; 
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
