
import React from 'react';
import { AIRulesConfig } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rules: AIRulesConfig;
  setRules: React.Dispatch<React.SetStateAction<AIRulesConfig>>;
}

export const RulesModal: React.FC<Props> = ({ isOpen, onClose, rules, setRules }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-[500px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Regras da Escala (IA)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">X</button>
        </div>
        
        <div className="p-6 space-y-6">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Máximo de dias consecutivos</label>
                <div className="flex items-center gap-4">
                    <input 
                        type="range" min="1" max="10" 
                        value={rules.maxConsecutiveDays} 
                        onChange={(e) => setRules({...rules, maxConsecutiveDays: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="font-bold text-lg text-company-blue w-8 text-center">{rules.maxConsecutiveDays}</span>
                </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
                <div>
                     <label className="block text-sm font-bold text-slate-700">Preferir folga aos Domingos?</label>
                </div>
                <input 
                    type="checkbox" 
                    checked={rules.preferSundayOff}
                    onChange={(e) => setRules({...rules, preferSundayOff: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
            </div>

             <div className="flex items-center justify-between border-t pt-4">
                <div>
                     <label className="block text-sm font-bold text-slate-700">Preferir Dobradinhas?</label>
                     <p className="text-xs text-slate-500">Agrupar dias de folga (ex: Sáb+Dom).</p>
                </div>
                <input 
                    type="checkbox" 
                    checked={rules.preferConsecutiveDaysOff}
                    onChange={(e) => setRules({...rules, preferConsecutiveDaysOff: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
            </div>

             <div className="border-t pt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Frequência mínima de Domingo Livre</label>
                <div className="flex items-center gap-2">
                    <span className="text-sm">1 Domingo a cada</span>
                    <input 
                        type="number" min="1" max="8" 
                        value={rules.sundayOffFrequency} 
                        onChange={(e) => setRules({...rules, sundayOffFrequency: parseInt(e.target.value)})}
                        className="w-16 border rounded p-1 text-center font-bold"
                    />
                    <span className="text-sm">semanas</span>
                </div>
            </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
           <button onClick={onClose} className="px-6 py-2 bg-company-blue text-white font-bold rounded hover:bg-blue-900 shadow">
               Salvar Regras
           </button>
        </div>
      </div>
    </div>
  );
};
