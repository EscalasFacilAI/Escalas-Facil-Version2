
import React, { useState } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../constants';

interface Props {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, verify against DB. Here, verify against constants + local storage simulation
    const storedUsersStr = localStorage.getItem('APP_USERS');
    const allUsers: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : INITIAL_USERS;

    const user = allUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciais inválidas. Tente admin / 123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-96 border-t-4 border-company-blue">
         <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-company-blue rounded flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                PS
            </div>
         </div>
         <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">ESCALA FÁCIL</h2>
         <p className="text-center text-slate-500 mb-6 text-sm">Acesso Restrito - Prevent Senior</p>
         
         <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Usuário</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                placeholder="123"
              />
            </div>
            
            {error && <p className="text-red-600 text-xs font-bold text-center">{error}</p>}
            
            <button 
              type="submit" 
              className="w-full bg-company-blue text-white font-bold py-2 rounded hover:bg-blue-900 transition-colors uppercase shadow"
            >
              Entrar
            </button>
         </form>
         <p className="mt-4 text-center text-[10px] text-slate-400">Sistema de Gestão de Escalas v2.0</p>
      </div>
    </div>
  );
};
