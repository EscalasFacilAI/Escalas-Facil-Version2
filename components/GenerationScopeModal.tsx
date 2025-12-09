
import React, { useState } from 'react';
import { Employee } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onConfirm: (selectedEmployeeIds: string[]) => void;
}

export const GenerationScopeModal: React.FC<Props> = ({ isOpen, onClose, employees, onConfirm }) => {
  const [scope, setScope] = useState<'all' | 'specific'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.id.includes(searchTerm)
  );

  const toggleEmployee = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleGenerate = () => {
      if (scope === 'all') {
          onConfirm(employees.map(e => e.id));
      } else {
          if (selectedIds.length === 0) {
              alert('Selecione pelo menos um colaborador.');
              return;
          }
          onConfirm(selectedIds);
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col max-h-[600px]">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            Configurar Geração de Escala (IA)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">X</button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
            <p className="text-sm text-slate-600 font-bold">Para quem você deseja gerar folgas?</p>
            
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-slate-50 flex-1">
                    <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
                    <span className="text-sm font-bold text-slate-700">Toda a Lista Filtrada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-slate-50 flex-1">
                    <input type="radio" name="scope" checked={scope === 'specific'} onChange={() => setScope('specific')} />
                    <span className="text-sm font-bold text-slate-700">Colaboradores Específicos</span>
                </label>
            </div>

            {scope === 'specific' && (
                <div className="border rounded p-2 bg-slate-50 h-64 flex flex-col">
                    <input 
                        type="text" 
                        placeholder="Buscar por Nome ou ID..." 
                        className="w-full border rounded p-2 text-sm mb-2"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="flex-1 overflow-y-auto bg-white border rounded">
                        {filteredEmployees.map(emp => (
                            <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 border-b cursor-pointer" onClick={() => toggleEmployee(emp.id)}>
                                <input type="checkbox" checked={selectedIds.includes(emp.id)} readOnly className="pointer-events-none" />
                                <div>
                                    <div className="text-xs font-bold text-slate-700">{emp.name}</div>
                                    <div className="text-[10px] text-slate-500">{emp.id} - {emp.shiftPattern}</div>
                                </div>
                            </div>
                        ))}
                         {filteredEmployees.length === 0 && <div className="p-4 text-xs text-center text-slate-400">Nada encontrado.</div>}
                    </div>
                    <div className="text-right text-[10px] text-slate-500 mt-1">
                        {selectedIds.length} selecionados
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded text-slate-600 text-sm hover:bg-white">Cancelar</button>
            <button onClick={handleGenerate} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 shadow uppercase text-sm">
                Confirmar e Gerar
            </button>
        </div>
      </div>
    </div>
  );
};
