
import React, { useState } from 'react';
import { Shift, ShiftCategory } from '../types';

interface Props {
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  onClose: () => void;
}

export const ShiftManager: React.FC<Props> = ({ shifts, setShifts, onClose }) => {
  const [formData, setFormData] = useState({
     id: '', 
     code: '', name: '', 
     category: 'work' as ShiftCategory,
     startTime: '', endTime: '', 
     color: 'bg-white', textColor: 'text-slate-900', 
     isDayOff: false
  });

  const colors = [
     { bg: 'bg-white', text: 'text-slate-900', label: 'Branco' },
     { bg: 'bg-red-100', text: 'text-red-900', label: 'Vermelho' },
     { bg: 'bg-green-100', text: 'text-green-900', label: 'Verde' },
     { bg: 'bg-blue-100', text: 'text-blue-900', label: 'Azul' },
     { bg: 'bg-yellow-100', text: 'text-yellow-900', label: 'Amarelo' },
     { bg: 'bg-purple-100', text: 'text-purple-900', label: 'Roxo' },
     { bg: 'bg-gray-200', text: 'text-gray-800', label: 'Cinza' },
     { bg: 'bg-orange-100', text: 'text-orange-900', label: 'Laranja' },
     { bg: 'bg-pink-100', text: 'text-pink-900', label: 'Rosa' },
     { bg: 'bg-sky-50', text: 'text-slate-900', label: 'Azul Claro' }
  ];

  const categoryMap: Record<string, string> = {
      work: 'Trabalho',
      dayoff: 'Folga',
      absence: 'Ausência',
      leave: 'Afastamento'
  };

  const handleSaveShift = () => {
      if(!formData.code || !formData.name) return;
      
      const isDayOff = formData.category !== 'work';

      if (formData.id) {
          setShifts(shifts.map(s => s.id === formData.id ? { ...s, ...formData, isDayOff } : s));
      } else {
          const id = formData.code.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
          setShifts([...shifts, { ...formData, id, isDayOff }]);
      }
      
      // Reset
      setFormData({ id: '', code: '', name: '', category: 'work', startTime: '', endTime: '', color: 'bg-white', textColor: 'text-slate-900', isDayOff: false });
  };

  const handleEditClick = (shift: Shift) => {
      setFormData({
          id: shift.id,
          code: shift.code,
          name: shift.name,
          category: shift.category || (shift.isDayOff ? 'dayoff' : 'work'),
          startTime: shift.startTime,
          endTime: shift.endTime,
          color: shift.color,
          textColor: shift.textColor || 'text-slate-900',
          isDayOff: shift.isDayOff
      });
  }

  const handleDeleteShift = (id: string) => {
      if (confirm('Tem certeza que deseja excluir esta legenda?')) {
          setShifts(shifts.filter(s => s.id !== id));
          if (formData.id === id) {
             setFormData({ id: '', code: '', name: '', category: 'work', startTime: '', endTime: '', color: 'bg-white', textColor: 'text-slate-900', isDayOff: false });
          }
      }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col h-[70vh]">
         <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             Configuração de Legendas
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">X</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
             {/* Form */}
             <div className="w-1/3 bg-slate-50 p-4 border-r overflow-y-auto">
                 <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase">
                     {formData.id ? 'Editar Legenda' : 'Nova Legenda'}
                 </h4>
                 <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Código (Sigla)</label>
                        <input type="text" maxLength={4} className="w-full border-slate-300 rounded p-2 border uppercase text-sm" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                    </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Descrição</label>
                        <input type="text" className="w-full border-slate-300 rounded p-2 border text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-slate-500 uppercase">Categoria</label>
                         <select className="w-full border-slate-300 rounded p-2 border bg-white text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as ShiftCategory})}>
                             <option value="work">Trabalho (Expediente)</option>
                             <option value="dayoff">Folga</option>
                             <option value="absence">Ausência / Falta</option>
                             <option value="leave">Afastamento / Licença</option>
                         </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Início</label>
                            <input type="time" disabled={formData.category !== 'work'} className="w-full border-slate-300 rounded p-2 border text-sm disabled:opacity-50" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Fim</label>
                            <input type="time" disabled={formData.category !== 'work'} className="w-full border-slate-300 rounded p-2 border text-sm disabled:opacity-50" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Cor</label>
                        <div className="grid grid-cols-5 gap-2">
                             {colors.map(c => (
                                <button 
                                    key={c.bg} 
                                    onClick={() => setFormData({...formData, color: c.bg, textColor: c.text})}
                                    className={`w-8 h-8 rounded-full border shadow-sm ${c.bg} ${formData.color === c.bg ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSaveShift} disabled={!formData.code} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 uppercase text-sm">
                            {formData.id ? 'Salvar' : 'Adicionar'}
                        </button>
                        {formData.id && (
                             <button onClick={() => setFormData({ id: '', code: '', name: '', category: 'work', startTime: '', endTime: '', color: 'bg-white', textColor: 'text-slate-900', isDayOff: false })} className="px-3 bg-gray-300 text-gray-700 rounded font-bold hover:bg-gray-400">Cancel</button>
                        )}
                    </div>
                 </div>
             </div>

             {/* List */}
            <div className="flex-1 p-4 overflow-y-auto bg-white">
                 <div className="grid grid-cols-1 gap-2">
                    {shifts.map(shift => (
                    <div key={shift.id} onClick={() => handleEditClick(shift)} className={`flex items-center justify-between p-2 rounded bg-white border cursor-pointer hover:shadow-md ${formData.id === shift.id ? 'border-blue-500 ring-1' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 flex items-center justify-center rounded font-bold text-sm border ${shift.color} ${shift.textColor}`}>
                                {shift.code}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{shift.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{categoryMap[shift.category] || shift.category} {shift.category === 'work' ? `• ${shift.startTime} - ${shift.endTime}` : ''}</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }} className="text-slate-300 hover:text-red-500 p-2">🗑️</button>
                    </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
