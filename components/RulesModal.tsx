
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
                <div className="flex flex-col">
                     <label className="block text-sm font-bold text-slate-700">Preferir folga aos Domingos?</label>
                     <p className="text-[10px] text-slate-400">Tenta alocar folgas aos domingos sempre que possível para todos.</p>
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
                <div className="mt-2 bg-blue-50 p-2 rounded border border-blue-100">
                    <p className="text-[10px] text-blue-800 font-bold mb-1">Nota sobre Legislação (Art. 386 CLT):</p>
                    <p className="text-[10px] text-slate-600 leading-tight text-justify">
                        A IA verificará o campo <strong>"Sexo"</strong> no cadastro de cada colaborador. 
                        Para mulheres, será priorizada a escala quinzenal (1 domingo a cada 2 semanas). 
                        Para homens, será respeitada a configuração padrão de 1 domingo a cada 3 semanas.
                    </p>
                </div>
            </div>

            {/* NEW: Extra Days Off Rule */}
            <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                         <label className="block text-sm font-bold text-slate-700">Gerar folgas a mais?</label>
                         <p className="text-xs text-slate-500">Permite gerar folgas extras além da quantidade mensal.</p>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={rules.allowExtraDaysOff}
                        onChange={(e) => setRules({...rules, allowExtraDaysOff: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                </div>
                {rules.allowExtraDaysOff && (
                    <div className="flex items-center gap-2 mt-2 pl-4 border-l-2 border-blue-200">
                        <span className="text-sm text-slate-700">Quantidade Máxima:</span>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setRules({...rules, extraDaysOffCount: num})}
                                    className={`w-8 h-8 rounded-full text-xs font-bold ${rules.extraDaysOffCount === num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    +{num}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
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
