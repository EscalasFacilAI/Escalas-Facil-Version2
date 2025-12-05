
import { Employee, Shift, User } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'admin', username: 'admin', password: '123', name: 'Administrador Master', role: 'admin' }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: '62036630', name: 'CAMILA CAIRES ALQUIMIM', role: 'ENFERMEIRO LIDER', unit: 'Unidade Central', sector: 'UTI', contractType: 'CLT',
    cpf: '123.456.789-00', positionNumber: '14009423', categoryCode: 'ENF-1234', shiftPattern: '5x2', bankHoursBalance: '10:00', shiftType: 'Diurno',
    organizationalUnit: 'Diretoria Médica', birthDate: '1990-05-15', admissionDate: '2020-01-10', email: 'camila.caires@company.com', gender: 'Feminino'
  },
  { 
    id: '62033733', name: 'ILCA SOFIA DOS SANTOS', role: 'TECNICO DE ENFERMAGEM', unit: 'Unidade Central', sector: 'UTI', contractType: 'CLT',
    cpf: '234.567.890-11', positionNumber: '14010311', categoryCode: 'COREN-SP', shiftPattern: '12x36', bankHoursBalance: '-02:00', shiftType: 'Noturno',
    organizationalUnit: 'Enfermagem Geral', birthDate: '1992-08-20', admissionDate: '2021-03-15', email: 'ilca.sofia@company.com', gender: 'Feminino'
  },
  { 
    id: '62034119', name: 'KAUANE RODRIGUES', role: 'TECNICO DE ENFERMAGEM', unit: 'Unidade Sul', sector: 'Pediatria', contractType: 'CLT',
    cpf: '345.678.901-22', positionNumber: '14007887', categoryCode: 'COREN-SP', shiftPattern: '12x36', bankHoursBalance: '05:30', shiftType: 'Diurno',
    organizationalUnit: 'Enfermagem Pediátrica', birthDate: '1995-12-01', admissionDate: '2022-06-01', email: 'kauane.rodrigues@company.com', gender: 'Feminino'
  },
  { 
    id: '62033902', name: 'MYCHELLY MATIAS MORAES', role: 'RECEPCIONISTA', unit: 'Unidade Sul', sector: 'Recepção', contractType: 'CLT',
    cpf: '456.789.012-33', positionNumber: '14005695', categoryCode: 'ADM', shiftPattern: '6x1', bankHoursBalance: '00:00', shiftType: 'Administrativo',
    organizationalUnit: 'Atendimento', birthDate: '1998-02-10', admissionDate: '2023-01-20', email: 'mychelly.moraes@company.com', gender: 'Feminino'
  },
];

export const INITIAL_SHIFTS: Shift[] = [
  { id: 'folga', code: 'F', name: 'Folga', category: 'dayoff', startTime: '', endTime: '', color: 'bg-green-100', textColor: 'text-green-800', isDayOff: true },
  { id: 'folga_bh', code: 'FBH', name: 'Folga Banco Horas', category: 'dayoff', startTime: '', endTime: '', color: 'bg-purple-100', textColor: 'text-purple-800', isDayOff: true },
  
  // Ausências e Afastamentos
  { id: 'falta_abo', code: 'FA', name: 'Falta Abonada', category: 'absence', startTime: '', endTime: '', color: 'bg-gray-200', textColor: 'text-gray-600', isDayOff: true },
  { id: 'falta_inj', code: 'FF', name: 'Falta Injustificada', category: 'absence', startTime: '', endTime: '', color: 'bg-red-200', textColor: 'text-red-900', isDayOff: true },
  { id: 'ferias', code: 'FE', name: 'Férias', category: 'leave', startTime: '', endTime: '', color: 'bg-yellow-200', textColor: 'text-yellow-900', isDayOff: true },
  { id: 'atestado', code: 'AT', name: 'Atestado Médico', category: 'leave', startTime: '', endTime: '', color: 'bg-pink-100', textColor: 'text-pink-900', isDayOff: true },
  { id: 'licenca_mat', code: 'LM', name: 'Licença Maternidade', category: 'leave', startTime: '', endTime: '', color: 'bg-pink-200', textColor: 'text-pink-900', isDayOff: true },
  { id: 'inss', code: 'INSS', name: 'Afastamento INSS', category: 'leave', startTime: '', endTime: '', color: 'bg-indigo-200', textColor: 'text-indigo-900', isDayOff: true },
  
  // Trabalho
  { id: 'manha', code: 'M', name: 'Manhã', category: 'work', startTime: '07:00', endTime: '13:00', color: 'bg-white', textColor: 'text-slate-900', isDayOff: false },
  { id: 'tarde', code: 'T', name: 'Tarde', category: 'work', startTime: '13:00', endTime: '19:00', color: 'bg-orange-50', textColor: 'text-orange-900', isDayOff: false },
  { id: 'noite', code: 'N', name: 'Noite', category: 'work', startTime: '19:00', endTime: '07:00', color: 'bg-indigo-50', textColor: 'text-indigo-900', isDayOff: false },
  { id: 'plantao', code: 'P', name: 'Plantão', category: 'work', startTime: '07:00', endTime: '19:00', color: 'bg-blue-50', textColor: 'text-blue-900', isDayOff: false },
];

export const MONTH_NAMES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

export const INITIAL_UNITS = ['Unidade Central', 'Unidade Sul', 'Unidade Norte', 'Hospital Dia', 'Diagnóstico'];
export const INITIAL_SECTORS = ['UTI', 'Pediatria', 'Emergência', 'Recepção', 'Diagnóstico', 'Enfermagem'];
export const INITIAL_SHIFT_TYPES = ['Diurno', 'Noturno', 'Misto', 'Administrativo'];

export const HOLIDAYS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "21-04": "Tiradentes",
  "01-05": "Dia do Trabalho",
  "07-09": "Independência do Brasil",
  "12-10": "Nossa Senhora Aparecida",
  "02-11": "Finados",
  "15-11": "Proclamação da República",
  "25-12": "Natal"
};
