
import React, { useState } from 'react';
import { Employee } from '../types';
import { decimalToTime } from '../services/schedulerService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newEmployees: Employee[]) => void;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setFile(e.target.files[0]);
          setError('');
      }
  };

  const processCSV = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        try {
            const rows = text.split(/\r?\n/);
            const newEmployees: Employee[] = [];
            const startIdx = 1; 

            for (let i = startIdx; i < rows.length; i++) {
                const separator = rows[i].includes(';') ? ';' : ',';
                const cols = rows[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
                
                if (cols.length < 3) continue;

                // Handle Bank Hours: If it contains ".", assume decimal and convert.
                let bh = cols[7] || '00:00';
                if (bh.includes('.') || (bh.includes(',') && !bh.includes(':'))) {
                    bh = decimalToTime(bh);
                }

                const emp: Employee = {
                    name: cols[0]?.toUpperCase() || 'SEM NOME',
                    id: cols[1] || Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    role: cols[2]?.toUpperCase() || 'COLABORADOR',
                    cpf: cols[3] || '',
                    shiftPattern: cols[4]?.toUpperCase() || '5X2',
                    positionNumber: cols[5] || '',
                    categoryCode: cols[6]?.toUpperCase() || '',
                    bankHoursBalance: bh,
                    unit: cols[8] || 'Unidade Central',
                    sector: cols[9] || 'Geral',
                    shiftType: cols[10] || 'Diurno',
                    
                    // New Fields
                    organizationalUnit: cols[11] || '',
                    birthDate: cols[12] || '',
                    admissionDate: cols[13] || '',
                    email: cols[14] || '',
                    gender: cols[15] || 'Indefinido',

                    contractType: 'CLT'
                };
                newEmployees.push(emp);
            }

            if (newEmployees.length === 0) {
                setError("Nenhum dado válido encontrado.");
                return;
            }

            onImport(newEmployees);
            onClose();
            setFile(null);
        } catch (err) {
            setError("Erro ao ler o arquivo CSV.");
            console.error(err);
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-[600px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             Importar CSV
          </h3>
          <button onClick={onClose} className="text-slate-400">X</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
             <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                 <p className="text-sm font-bold text-blue-800 mb-2">Instruções:</p>
                 <code className="block bg-white p-2 border border-blue-200 rounded text-[10px] text-slate-600 font-mono break-all leading-relaxed">
                    0:Nome, 1:ID, 2:Cargo, 3:CPF, 4:Escala, 5:Posição, 6:Categoria, 7:BH, 8:Unidade, 9:Setor, 10:Turno, 11:Unid. Org, 12:Nascimento, 13:Admissão, 14:Email, 15:Sexo
                 </code>
                 <p className="text-[10px] text-blue-600 mt-2">
                     * BH Decimal (ex: 10.5) será convertido para Hora (10:30).
                 </p>
             </div>

             <div className="flex flex-col gap-2">
                <input type="file" accept=".csv" onChange={handleFileChange} className="border rounded p-2 block w-full text-sm" />
             </div>
             
             {error && <p className="text-xs text-red-600 mt-3 font-bold">{error}</p>}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
           <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 rounded border bg-white">Cancelar</button>
           <button onClick={processCSV} disabled={!file} className="px-4 py-2 text-sm bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50">
               Processar
           </button>
        </div>
      </div>
    </div>
  );
};
