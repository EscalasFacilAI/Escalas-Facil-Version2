
import React, { useState, useEffect, useMemo } from 'react';
import { User, Employee } from '../types';
import { INITIAL_USERS } from '../constants';

interface Props {
  onClose: () => void;
  availableUnits: string[];
  employees: Employee[];
}

export const UserManagement: React.FC<Props> = ({ onClose, availableUnits, employees }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
      username: '', 
      password: '', 
      name: '', 
      role: 'viewer' as 'admin'|'manager'|'viewer',
      allowedUnits: [] as string[],
      allowedSectors: [] as string[]
  });

  useEffect(() => {
    const stored = localStorage.getItem('APP_USERS');
    if (stored) {
        setUsers(JSON.parse(stored));
    } else {
        setUsers(INITIAL_USERS);
    }
  }, []);

  // Derive available sectors ONLY from the selected Allowed Units
  const availableSectors = useMemo(() => {
      if (formData.allowedUnits.length === 0) return [];
      const relevantEmployees = employees.filter(e => formData.allowedUnits.includes(e.unit));
      const sectors = new Set(relevantEmployees.map(e => e.sector));
      return Array.from(sectors).filter(Boolean).sort();
  }, [employees, formData.allowedUnits]);

  const saveUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      localStorage.setItem('APP_USERS', JSON.stringify(newUsers));
  };

  const handleSave = () => {
      if (!formData.username || !formData.password) return;
      
      const newUser: User = {
          id: editingId || Date.now().toString(),
          username: formData.username,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          allowedUnits: formData.role === 'admin' ? [] : formData.allowedUnits,
          allowedSectors: formData.role === 'admin' ? [] : formData.allowedSectors
      };

      if (editingId) {
          saveUsers(users.map(u => u.id === editingId ? newUser : u));
      } else {
          saveUsers([...users, newUser]);
      }
      resetForm();
  };

  const handleEdit = (user: User) => {
      setEditingId(user.id);
      setFormData({
          username: user.username,
          password: user.password || '',
          name: user.name,
          role: user.role,
          allowedUnits: user.allowedUnits || [],
          allowedSectors: user.allowedSectors || []
      });
  }

  const resetForm = () => {
      setEditingId(null);
      setFormData({ username: '', password: '', name: '', role: 'viewer', allowedUnits: [], allowedSectors: [] });
  }

  const handleRemove = (id: string) => {
      if(id === 'admin') {
          alert('Não é possível remover o super admin.');
          return;
      }
      if(confirm('Tem certeza que deseja excluir este usuário?')) {
          saveUsers(users.filter(u => u.id !== id));
          if (editingId === id) resetForm();
      }
  };

  const toggleUnit = (unit: string) => {
      setFormData(prev => {
          const exists = prev.allowedUnits.includes(unit);
          return {
              ...prev,
              allowedUnits: exists 
                ? prev.allowedUnits.filter(u => u !== unit)
                : [...prev.allowedUnits, unit],
              allowedSectors: exists ? [] : prev.allowedSectors
          };
      });
  };

  const toggleSector = (sector: string) => {
      setFormData(prev => {
          const exists = prev.allowedSectors.includes(sector);
          return {
              ...prev,
              allowedSectors: exists 
                ? prev.allowedSectors.filter(s => s !== sector)
                : [...prev.allowedSectors, sector]
          };
      });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
       <div className="bg-white rounded-lg shadow-2xl w-[900px] flex flex-col h-[700px]">
          <div className="flex items-center justify-between p-4 border-b bg-slate-100">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                 </svg>
                 Gerenciar Usuários e Permissões
             </h3>
             <button onClick={onClose} className="text-slate-400 hover:text-red-500">X</button>
          </div>
          
          <div className="flex-1 flex gap-4 p-4 overflow-hidden">
             {/* Form */}
             <div className="w-5/12 flex flex-col gap-3 bg-blue-50 p-4 rounded border border-blue-100 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-blue-900 uppercase mb-2">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h4>
                    {editingId && <button onClick={resetForm} className="text-xs text-blue-500 underline">Cancelar Edição</button>}
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Nome Completo</label>
                    <input className="w-full border rounded p-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onKeyDown={e => e.stopPropagation()} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Usuário</label>
                        <input className="w-full border rounded p-1" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} onKeyDown={e => e.stopPropagation()} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Senha</label>
                        <input className="w-full border rounded p-1" type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} onKeyDown={e => e.stopPropagation()} />
                    </div>
                </div>
                
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Nível de Acesso</label>
                    <select className="w-full border rounded p-1" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any, allowedUnits: [], allowedSectors: []})}>
                        <option value="viewer">Visualizador (Somente Leitura)</option>
                        <option value="manager">Gerente (Edita Escala)</option>
                        <option value="admin">Administrador (Total)</option>
                    </select>
                </div>
                
                {formData.role !== 'admin' && (
                    <div className="flex-1 border-t pt-2 mt-2 flex flex-col gap-2 overflow-hidden">
                        <div className="flex-1 overflow-hidden flex flex-col h-1/2">
                            <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Unidades Permitidas</label>
                            <div className="flex-1 overflow-y-auto bg-white p-2 rounded border mb-2">
                                {availableUnits.map(unit => (
                                    <label key={unit} className="flex items-center gap-2 text-xs mb-1 cursor-pointer hover:bg-slate-50">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.allowedUnits.includes(unit)}
                                            onChange={() => toggleUnit(unit)}
                                        />
                                        {unit}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col h-1/2">
                            <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Setores (Filtrado por Unidade)</label>
                            {formData.allowedUnits.length === 0 ? (
                                <div className="text-xs text-slate-400 italic p-2 border bg-slate-50 rounded">Selecione uma unidade primeiro.</div>
                            ) : (
                                <div className="flex-1 overflow-y-auto bg-white p-2 rounded border">
                                    {availableSectors.length > 0 ? availableSectors.map(sec => (
                                        <label key={sec} className="flex items-center gap-2 text-xs mb-1 cursor-pointer hover:bg-slate-50">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.allowedSectors.includes(sec)}
                                                onChange={() => toggleSector(sec)}
                                            />
                                            {sec}
                                        </label>
                                    )) : (
                                        <span className="text-[10px] text-slate-400 p-2">Nenhum setor encontrado para as unidades selecionadas.</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <button onClick={handleSave} className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 mt-2 uppercase text-xs">
                    {editingId ? 'Atualizar Usuário' : 'Adicionar Usuário'}
                </button>
             </div>

             {/* List */}
             <div className="flex-1 overflow-y-auto border rounded bg-white">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs sticky top-0">
                         <tr>
                             <th className="p-2">Usuário</th>
                             <th className="p-2">Nível</th>
                             <th className="p-2">Unidades</th>
                             <th className="p-2 text-right">Ação</th>
                         </tr>
                     </thead>
                     <tbody>
                         {users.map(u => (
                             <tr key={u.id} className="border-b hover:bg-slate-50">
                                 <td className="p-2">
                                     <div className="font-bold">{u.name}</div>
                                     <div className="text-xs text-slate-400">{u.username}</div>
                                 </td>
                                 <td className="p-2">
                                     <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase 
                                        ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                          u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                         {u.role}
                                     </span>
                                 </td>
                                 <td className="p-2 text-xs text-slate-500">
                                     {u.role === 'admin' ? (
                                         <span className="text-green-600 font-bold">TOTAL</span>
                                     ) : (
                                         <div className="flex flex-col gap-1">
                                             <span>U: {u.allowedUnits?.length ? u.allowedUnits.length : 0}</span>
                                             <span>S: {u.allowedSectors?.length ? u.allowedSectors.length : 0}</span>
                                         </div>
                                     )}
                                 </td>
                                 <td className="p-2 text-right">
                                     <div className="flex gap-2 justify-end">
                                         <button onClick={() => handleEdit(u)} className="text-blue-500 hover:underline text-xs">✏️</button>
                                         <button onClick={() => handleRemove(u.id)} className="text-red-500 hover:underline text-xs">🗑️</button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
       </div>
    </div>
  );
};
