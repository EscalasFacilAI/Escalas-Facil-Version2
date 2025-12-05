import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { ImportModal } from './ImportModal';

interface Props {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  units: string[];
  sectors: string[];
  shiftTypes: string[];
}

export const EmployeeDatabaseScreen: React.FC<Props> = ({ employees, setEmployees, units, sectors, shiftTypes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [showImport, setShowImport] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});

  const filtered = useMemo(() => {
      return employees.filter(e => {
          const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.cpf.includes(searchTerm) || e.id.includes(searchTerm);
          const matchUnit = !filterUnit || e.unit === filterUnit;
          const matchSector = !filterSector || e.sector === filterSector;
          return matchSearch && matchUnit && matchSector;
      });
  }, [employees, searchTerm, filterUnit, filterSector]);

  const handleEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setFormData({ ...emp });
  };

  const handleNew = () => {
      setEditingId('NEW');
      setFormData({
          id: Date.now().toString(),
          name: '', role: '', unit: units[0], sector: sectors[0], shiftType: shiftTypes[0],
          contractType: 'CLT', cpf: '', positionNumber: '', categoryCode: '', shiftPattern: '5X2', bankHoursBalance: '00:00',
          organizationalUnit: '', birthDate: '', admissionDate: '', email: '', gender: ''
      });
  };

  const handleSave = () => {
      if (!formData.name || !formData.role) return;

      if (editingId === 'NEW') {
          setEmployees([...employees, formData as Employee]);
      } else {
          setEmployees(employees.map(e => e.id === editingId ? { ...e, ...formData } as Employee : e));
      }
      setEditingId(null);
      setFormData({});
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Stop event propagation
      if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
          setEmployees(prev => prev.filter(e => e.id !== id));
          if (editingId === id) {
              setEditingId(null);
          }
      }
  };

  const handleImport = (newEmps: Employee[]) => {
      setEmployees(prev => [...prev, ...newEmps]);
  }

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Sidebar Form */}
      <div className={`bg-white border-r w-96 flex flex-col transition-all duration-300 ${editingId ? 'translate-x-0' : '-translate-x-full absolute h-full z-10 shadow-2xl'}`}>
         <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-700 uppercase">{editingId === 'NEW' ? 'Novo Colaborador' : 'Editar Colaborador'}</h3>
             <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-red-500">✕</button>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-4">
             <div>
                 <label className="text-[10px] font-bold uppercase text-slate-500">Nome Completo</label>
                 <input className="w-full border rounded p-2 text-sm uppercase" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">ID / Matrícula</label>
                    <input className="w-full border rounded p-2 text-sm" value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">CPF</label>
                    <input className="w-full border rounded p-2 text-sm" value={formData.cpf || ''} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                 </div>
             </div>
             <div>
                 <label className="text-[10px] font-bold uppercase text-slate-500">Cargo</label>
                 <input className="w-full border rounded p-2 text-sm uppercase" value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Unidade</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})}>
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Setor</label>
                    <select className="w-full border rounded p-2 text-sm bg-white" value={formData.sector || ''} onChange={e => setFormData({...formData, sector: e.target.value})}>
                        {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
             </div>
             <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Turno</label>
                <select className="w-full border rounded p-2 text-sm bg-white" value={formData.shiftType || ''} onChange={e => setFormData({...formData, shiftType: e.target.value})}>
                    {shiftTypes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             
             {/* New Fields */}
             <div>
                 <label className="text-[10px] font-bold uppercase text-slate-500">Unidade Organizacional</label>
                 <input className="w-full border rounded p-2 text-sm" value={formData.organizationalUnit || ''} onChange={e => setFormData({...formData, organizationalUnit: e.target.value})} />
             </div>
             <div>
                 <label className="text-[10px] font-bold uppercase text-slate-500">Email</label>
                 <input className="w-full border rounded p-2 text-sm" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Data Nasc.</label>
                    <input className="w-full border rounded p-2 text-sm" type="date" value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Data Admissão</label>
                    <input className="w-full border rounded p-2 text-sm" type="date" value={formData.admissionDate || ''} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                 </div>
             </div>
             <div>
                 <label className="text-[10px] font-bold uppercase text-slate-500">Gênero (Sexo)</label>
                 <select className="w-full border rounded p-2 text-sm bg-white" value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value})}>
                     <option value="">Selecione</option>
                     <option value="Feminino">Feminino</option>
                     <option value="Masculino">Masculino</option>
                     <option value="Outro">Outro</option>
                 </select>
             </div>
             
             <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Escala (Padrão)</label>
                    <input className="w-full border rounded p-2 text-sm uppercase" value={formData.shiftPattern || ''} onChange={e => setFormData({...formData, shiftPattern: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Saldo BH</label>
                    <input className="w-full border rounded p-2 text-sm" value={formData.bankHoursBalance || ''} onChange={e => setFormData({...formData, bankHoursBalance: e.target.value})} />
                 </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Nº Posição</label>
                    <input className="w-full border rounded p-2 text-sm uppercase" value={formData.positionNumber || ''} onChange={e => setFormData({...formData, positionNumber: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Cod. Categoria</label>
                    <input className="w-full border rounded p-2 text-sm" value={formData.categoryCode || ''} onChange={e => setFormData({...formData, categoryCode: e.target.value})} />
                 </div>
             </div>
         </div>
         <div className="p-4 border-t bg-slate-50">
             <button onClick={handleSave} className="w-full bg-company-blue text-white py-2 rounded font-bold uppercase hover:bg-blue-900">Salvar Dados</button>
         </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${editingId ? 'ml-0' : 'ml-0'}`}>
          <div className="bg-white p-4 border-b flex items-center justify-between shadow-sm">
             <div className="flex gap-4 items-center">
                 <input 
                    className="border border-slate-300 rounded-full px-4 py-2 text-sm w-64 bg-slate-50 focus:bg-white transition-colors"
                    placeholder="Buscar por Nome, CPF ou ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
                 <select className="border border-slate-300 rounded px-2 py-2 text-sm bg-white" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                     <option value="">Todas Unidades</option>
                     {units.map(u => <option key={u} value={u}>{u}</option>)}
                 </select>
                 <select className="border border-slate-300 rounded px-2 py-2 text-sm bg-white" value={filterSector} onChange={e => setFilterSector(e.target.value)}>
                     <option value="">Todos Setores</option>
                     {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
             </div>
             <div className="flex gap-2">
                 <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-bold uppercase text-xs hover:bg-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Importar CSV
                 </button>
                 <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-company-blue text-white rounded font-bold uppercase text-xs hover:bg-blue-900">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Novo Colaborador
                 </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded shadow border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs sticky top-0 shadow-sm">
                          <tr>
                              <th className="p-3">Nome / Cargo</th>
                              <th className="p-3">Unidade / Setor</th>
                              <th className="p-3">Dados Pessoais</th>
                              <th className="p-3">Contrato / Escala</th>
                              <th className="p-3 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filtered.map(emp => (
                              <tr key={emp.id} className="border-b hover:bg-blue-50 transition-colors group">
                                  <td className="p-3">
                                      <div className="font-bold text-slate-800">{emp.name}</div>
                                      <div className="text-xs text-slate-500">{emp.role}</div>
                                      <div className="text-[10px] text-blue-600">ID: {emp.id}</div>
                                  </td>
                                  <td className="p-3">
                                      <div className="text-xs font-medium">{emp.unit}</div>
                                      <div className="text-xs text-slate-500">{emp.sector}</div>
                                      <div className="text-[10px] text-slate-400">{emp.organizationalUnit}</div>
                                  </td>
                                  <td className="p-3">
                                      <div className="text-xs">CPF: {emp.cpf}</div>
                                      <div className="text-[10px] text-slate-500">{emp.email}</div>
                                      <div className="text-[10px] text-slate-400">
                                          Nasc: {emp.birthDate} {emp.gender ? `• ${emp.gender}` : ''}
                                      </div>
                                  </td>
                                  <td className="p-3">
                                      <div className="text-xs font-medium">{emp.shiftPattern} ({emp.shiftType})</div>
                                      <div className="text-[10px] text-slate-500">Adm: {emp.admissionDate}</div>
                                      <div className="text-[10px] text-green-600 font-bold">BH: {emp.bankHoursBalance}</div>
                                  </td>
                                  <td className="p-3 text-right">
                                      <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800 mr-3 font-bold text-xs uppercase">Editar</button>
                                      <button onClick={(e) => handleDelete(e, emp.id)} className="text-red-400 hover:text-red-600 text-xs uppercase">Excluir</button>
                                  </td>
                              </tr>
                          ))}
                          {filtered.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum colaborador encontrado.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />
    </div>
  );
};
