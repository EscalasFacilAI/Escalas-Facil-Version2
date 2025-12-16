
import React, { useState } from 'react';
import { Employee } from '../types';
import { INITIAL_UNITS as UNITS, INITIAL_SECTORS as SECTORS, INITIAL_SHIFT_TYPES as SHIFT_TYPES } from '../constants';

interface Props {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onClose: () => void;
}

export const EmployeeManager: React.FC<Props> = ({ employees, setEmployees, onClose }) => {
  const [formData, setFormData] = useState({
    name: '', role: '', unit: UNITS[0], sector: SECTORS[0],
    cpf: '', positionNumber: '', categoryCode: '', shiftPattern: '', bankHoursBalance: '00:00',
    shiftType: ''
  });

  const handleChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!formData.name || !formData.role) return;
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: formData.name.toUpperCase(),
      role: formData.role.toUpperCase(),
      unit: formData.unit,
      sector: formData.sector,
      contractType: 'CLT',
      cpf: formData.cpf,
      positionNumber: formData.positionNumber,
      categoryCode: formData.categoryCode.toUpperCase(),
      shiftPattern: formData.shiftPattern.toUpperCase(),
      bankHoursBalance: formData.bankHoursBalance,
      shiftType: formData.shiftType
    };
    setEmployees([...employees, newEmployee]);
    setFormData({
        name: '', role: '', unit: UNITS[0], sector: SECTORS[0],
        cpf: '', positionNumber: '', categoryCode: '', shiftPattern: '', bankHoursBalance: '00:00',
        shiftType: ''
    });
  };

  const handleRemove = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] md:h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-company-blue uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Gestão de Colaboradores
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Form Side */}
            <div className="w-full md:w-1/3 bg-slate-50 p-4 border-b md:border-b-0 md:border-r overflow-y-auto max-h-[40vh] md:max-h-full">
                <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase">Novo Cadastro</h4>
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome Completo</label>
                        <input type="text" className="w-full border-slate-300 rounded p-2 border uppercase text-sm" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Cargo</label>
                        <input type="text" className="w-full border-slate-300 rounded p-2 border uppercase text-sm" value={formData.role} onChange={e => handleChange('role', e.target.value)} />
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-[10px] font-bold text-slate-500 uppercase">Unidade</label>
                             <select className="w-full border-slate-300 rounded p-2 border bg-white text-sm" value={formData.unit} onChange={e => handleChange('unit', e.target.value)}>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-slate-500 uppercase">Setor</label>
                             <select className="w-full border-slate-300 rounded p-2 border bg-white text-sm" value={formData.sector} onChange={e => handleChange('sector', e.target.value)}>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipo de Turno</label>
                         <select className="w-full border-slate-300 rounded p-2 border bg-white text-sm" value={formData.shiftType} onChange={e => handleChange('shiftType', e.target.value)}>
                            <option value="">Selecione</option>
                            {SHIFT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">CPF</label>
                            <input type="text" className="w-full border-slate-300 rounded p-2 border text-sm" value={formData.cpf} onChange={e => handleChange('cpf', e.target.value)} />
                        </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Nº Posição</label>
                            <input type="text" className="w-full border-slate-300 rounded p-2 border text-sm" value={formData.positionNumber} onChange={e => handleChange('positionNumber', e.target.value)} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Cód. Categoria</label>
                            <input type="text" className="w-full border-slate-300 rounded p-2 border uppercase text-sm" value={formData.categoryCode} onChange={e => handleChange('categoryCode', e.target.value)} />
                        </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Escala</label>
                            <input type="text" className="w-full border-slate-300 rounded p-2 border uppercase text-sm" value={formData.shiftPattern} onChange={e => handleChange('shiftPattern', e.target.value)} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Saldo Banco de Horas</label>
                        <input type="text" className="w-full border-slate-300 rounded p-2 border text-sm" value={formData.bankHoursBalance} onChange={e => handleChange('bankHoursBalance', e.target.value)} />
                    </div>

                    <button
                    onClick={handleAdd}
                    disabled={!formData.name || !formData.role}
                    className="w-full bg-company-blue text-white font-bold py-2 rounded hover:bg-blue-900 disabled:opacity-50 transition-colors uppercase mt-4"
                    >
                    Adicionar Colaborador
                    </button>
                </div>
            </div>

            {/* List Side */}
            <div className="flex-1 p-4 overflow-y-auto bg-white">
                <div className="grid grid-cols-1 gap-2">
                    {employees.map(emp => (
                    <div key={emp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white rounded border border-slate-200 hover:border-blue-400 transition-colors shadow-sm group gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full items-center">
                            <div className="col-span-1">
                                <p className="font-bold text-slate-800 text-sm truncate uppercase">{emp.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
                            </div>
                            <div className="col-span-1">
                                <p className="text-xs text-slate-600 truncate">{emp.unit} - {emp.sector}</p>
                                <p className="text-[10px] text-slate-400 truncate">Escala: {emp.shiftPattern} ({emp.shiftType})</p>
                            </div>
                             <div className="col-span-1">
                                <p className="text-xs text-slate-600 truncate">CPF: {emp.cpf}</p>
                                <p className="text-[10px] text-slate-400 truncate">BH: {emp.bankHoursBalance}</p>
                            </div>
                            <div className="flex justify-end col-span-1">
                                <button 
                                onClick={() => handleRemove(emp.id)}
                                className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50"
                                >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
