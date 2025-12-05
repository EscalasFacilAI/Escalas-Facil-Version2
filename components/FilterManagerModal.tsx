
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  setItems: (items: string[]) => void;
}

export const FilterManagerModal: React.FC<Props> = ({ isOpen, onClose, title, items, setItems }) => {
  const [newValue, setNewValue] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
      if (newValue && !items.includes(newValue)) {
          setItems([...items, newValue]);
          setNewValue('');
      }
  };

  const handleRemove = (item: string) => {
      if (confirm(`Remover "${item}" da lista de opções?`)) {
          setItems(items.filter(i => i !== item));
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-96 flex flex-col max-h-[600px]">
        <div className="flex items-center justify-between p-3 border-b bg-slate-100">
           <h3 className="font-bold text-slate-800 text-sm uppercase">Gerenciar {title}</h3>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600">X</button>
        </div>
        
        <div className="p-4 bg-slate-50 border-b">
            <div className="flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 border rounded p-1 text-sm uppercase" 
                    placeholder="Novo item..."
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                />
                <button onClick={handleAdd} className="bg-green-600 text-white px-3 rounded font-bold hover:bg-green-700">+</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
            {items.map(item => (
                <div key={item} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-slate-50">
                    <span className="text-sm text-slate-700 uppercase">{item}</span>
                    <button onClick={() => handleRemove(item)} className="text-red-400 hover:text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
