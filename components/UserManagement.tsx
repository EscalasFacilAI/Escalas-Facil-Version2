
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../constants';

interface Props {
  onClose: () => void;
  availableUnits: string[];
}

export const UserManagement: React.FC<Props> = ({ onClose, availableUnits }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({ 
      username: '', 
      password: '', 
      name: '', 
      role: 'viewer' as 'admin'|'manager'|'viewer',
      allowedUnits: [] as string[]
  });

  useEffect(() => {
    const stored = localStorage.getItem('APP_USERS');
    if (stored) {
        setUsers(JSON.parse(stored));
    } else {
        setUsers(INITIAL_USERS);
    }
  }, []);

  const saveUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      localStorage.setItem('APP_USERS', JSON.stringify(newUsers));
  };

  const handleAdd = () => {
      if (!formData.username || !formData.password) return;
      const newUser: User = {
          id: Date.now().toString(),
          username: formData.username,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          allowedUnits: formData.role === 'admin' ? [] : formData.allowedUnits
      };
      saveUsers([...users, newUser]);
      setFormData({ username: '', password: '', name: '', role: 'viewer', allowedUnits: [] });
  };

  const handleRemove = (id: string) => {
      if(id === 'admin') {
          alert('Não é possível remover o super admin.');
          return;
      }
      saveUsers(users.filter(u => u.id !== id));
  };

  const toggleUnit = (unit: string) => {
      setFormData(prev => {
          const exists = prev.allowedUnits.includes(unit);
          return {
              ...prev,
              allowedUnits: exists 
                ? prev.allowedUnits.filter(u => u !== unit)
                : [...prev.allowedUnits, unit]
          };
      });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
       <div className="bg-white rounded-lg shadow-2xl w-[800px] flex flex-col h-[700px]">
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
             <div className="w-1/3 flex flex-col gap-3 bg-blue-50 p-4 rounded border border-blue-100 overflow-y-auto">
                <h4 className="font-bold text-sm text-blue-900 uppercase mb-2">Novo Usuário</h4>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Nome Completo</label>
                    <input className="w-full border rounded p-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Usuário (Login)</label>
                    <input className="w-full border rounded p-1" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Senha</label>
                    <input className="w-full border rounded p-1" type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Nível de Acesso</label>
                    <select className="w-full border rounded p-1" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any, allowedUnits: []})}>
                        <option value="viewer">Visualizador (Somente Leitura)</option>
                        <option value="manager">Gerente (Edita Escala)</option>
                        <option value="admin">Administrador (Total)</option>
                    </select>
                </div>
                
                {formData.role !== 'admin' && (
                    <div className="flex-1 border-t pt-2 mt-2">
                        <label className="text-xs font-bold uppercase text-slate-500 block mb-2">Unidades Permitidas</label>
                        <div className="space-y-1 max-h-40 overflow-y-auto bg-white p-2 rounded border">
                            {availableUnits.map(unit => (
                                <label key={unit} className="flex items-center gap-2 text-xs">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.allowedUnits.includes(unit)}
                                        onChange={() => toggleUnit(unit)}
                                    />
                                    {unit}
                                </label>
                            ))}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">* Se nenhuma for selecionada, não verá nada.</p>
                    </div>
                )}

                <button onClick={handleAdd} className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 mt-auto uppercase text-xs">Adicionar Usuário</button>
             </div>

             {/* List */}
             <div className="flex-1 overflow-y-auto border rounded bg-white">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs sticky top-0">
                         <tr>
                             <th className="p-2">Nome / Login</th>
                             <th className="p-2">Permissão</th>
                             <th className="p-2">Acesso</th>
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
                                         {u.role === 'manager' ? 'Gerente' : u.role === 'viewer' ? 'Visualizador' : 'Admin'}
                                     </span>
                                 </td>
                                 <td className="p-2 text-xs text-slate-500">
                                     {u.role === 'admin' ? (
                                         <span className="text-green-600 font-bold">TOTAL</span>
                                     ) : (
                                         u.allowedUnits?.length ? u.allowedUnits.join(', ') : <span className="text-red-400">Nenhuma</span>
                                     )}
                                 </td>
                                 <td className="p-2 text-right">
                                     <button onClick={() => handleRemove(u.id)} className="text-red-500 hover:underline text-xs">Remover</button>
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
