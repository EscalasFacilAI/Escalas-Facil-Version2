
import React, { useState } from 'react';
import { StaffingConfig, Employee } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  config: StaffingConfig;
  setConfig: React.Dispatch<React.SetStateAction<StaffingConfig>>;
}

const WEEKDAYS = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

export const StaffingModal: React.FC<Props> = ({ isOpen, onClose, employees, config, setConfig }) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const roles = Array.from(new Set(employees.map(e => e.role).filter(Boolean))).sort();

  const handleDefaultChange = (role: string, val: string) => {
      const num = parseInt(val) || 0;
      setConfig(prev => ({
          ...prev,
          [role]: { ...prev[role], default: num }
      }));
  };

  const handleDayChange = (role: string, dayKey: string, val: string) => {
      const num = val === '' ? undefined : parseInt(val);
      setConfig(prev => ({
          ...prev,
          [role]: { ...prev[role], [dayKey]: num } // If undefined, will fallback to default in calculation logic
      }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-[800px] flex flex-col h-[600px]">
        <div className="flex items-center justify-between p-4 border-b bg-company-blue text-white rounded-t-lg">
          <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wide">
             Dimensionamento por Dia da Semana
          </h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white">X</button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Roles */}
            <div className="w-1/3 border-r overflow-y-auto bg-slate-50 p-2">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">Cargos</p>
                {roles.map(role => (
                    <button 
                        key={role} 
                        onClick={() => setSelectedRole(role)}
                        className={`w-full text-left px-3 py-2 rounded text-xs font-bold uppercase mb-1 ${selectedRole === role ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        {role}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
                {selectedRole ? (
                    <div>
                        <h4 className="font-bold text-lg text-company-blue mb-4 uppercase">{selectedRole}</h4>
                        
                        <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
                             <label className="block text-xs font-bold uppercase text-blue-800 mb-1">Meta Padrão (Diária)</label>
                             <input 
                                type="number" 
                                className="border border-blue-300 rounded p-2 w-24 text-center font-bold"
                                value={config[selectedRole]?.default || 0}
                                onChange={e => handleDefaultChange(selectedRole, e.target.value)}
                             />
                             <p className="text-[10px] text-blue-600 mt-1">Este valor será usado caso o dia da semana não tenha valor específico.</p>
                        </div>

                        <p className="text-xs font-bold uppercase text-slate-500 mb-2">Personalizar por Dia da Semana (Opcional)</p>
                        <div className="grid grid-cols-2 gap-4">
                             {WEEKDAYS.map(day => (
                                 <div key={day.key} className="flex items-center justify-between border-b pb-1">
                                     <span className="text-sm text-slate-700">{day.label}</span>
                                     <input 
                                        type="number"
                                        placeholder={(config[selectedRole]?.default || 0).toString()}
                                        className="w-16 border rounded p-1 text-center text-sm"
                                        value={config[selectedRole]?.[day.key as keyof typeof config[string]] ?? ''}
                                        onChange={e => handleDayChange(selectedRole, day.key, e.target.value)}
                                     />
                                 </div>
                             ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        Selecione um cargo para configurar.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
