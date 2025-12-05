import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_EMPLOYEES, INITIAL_SHIFTS, MONTH_NAMES, INITIAL_UNITS, INITIAL_SECTORS, INITIAL_SHIFT_TYPES } from './constants';
import { Employee, MonthlySchedule, Shift, AIRulesConfig, StaffingConfig, User } from './types';
import { EmployeeManager } from './components/EmployeeManager';
import { ShiftManager } from './components/ShiftManager';
import { RosterGrid } from './components/RosterGrid';
import { RulesModal } from './components/RulesModal';
import { ImportModal } from './components/ImportModal';
import { StaffingModal } from './components/StaffingModal';
import { LoginScreen } from './components/LoginScreen';
import { UserManagement } from './components/UserManagement';
import { FilterManagerModal } from './components/FilterManagerModal';
import { generateAISchedule } from './services/schedulerService';
import { Tooltip } from './components/Tooltip';
import { EmployeeDatabaseScreen } from './components/EmployeeDatabaseScreen';
import { MultiSelect } from './components/MultiSelect';

// Icons
const SaveIcon = ({ saved }: { saved: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${saved ? 'text-green-400' : 'text-white'}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d={saved ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"} />
    </svg>
);
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>;
const ScaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'roster' | 'database'>('roster');

  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dynamic Lists for Filters (Master Lists)
  const [units, setUnits] = useState<string[]>(INITIAL_UNITS);
  const [sectors, setSectors] = useState<string[]>(INITIAL_SECTORS);
  const [shiftTypesList, setShiftTypesList] = useState<string[]>(INITIAL_SHIFT_TYPES);

  // Filter States (Arrays for Multi-Select)
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);

  const [aiRules, setAiRules] = useState<AIRulesConfig>({ maxConsecutiveDays: 6, minRestHours: 11, preferSundayOff: true, sundayOffFrequency: 2, preferConsecutiveDaysOff: true });
  const [staffingConfig, setStaffingConfig] = useState<StaffingConfig>({});
  
  const [schedule, setSchedule] = useState<MonthlySchedule>({ month: currentDate.getMonth(), year: currentDate.getFullYear(), assignments: {} });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Modals
  const [showEmployees, setShowEmployees] = useState(false);
  const [showShifts, setShowShifts] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStaffing, setShowStaffing] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  
  const [filterManager, setFilterManager] = useState<{ isOpen: boolean, type: 'Unit' | 'Sector' | 'Shift' | null }>({ isOpen: false, type: null });

  // Load Data on Start
  useEffect(() => {
    const savedData = localStorage.getItem('ESCALA_FACIL_DATA');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if(parsed.employees) setEmployees(parsed.employees);
            if(parsed.shifts) setShifts(parsed.shifts);
            if(parsed.schedule) setSchedule(parsed.schedule);
            if(parsed.aiRules) setAiRules(parsed.aiRules);
            if(parsed.staffingConfig) setStaffingConfig(parsed.staffingConfig);
            if(parsed.units) setUnits(parsed.units);
            if(parsed.sectors) setSectors(parsed.sectors);
            if(parsed.shiftTypesList) setShiftTypesList(parsed.shiftTypesList);
        } catch (e) {
            console.error("Failed to load saved data", e);
        }
    }
  }, []);

  // Save Data
  const handleSaveData = () => {
      const dataToSave = {
          employees, shifts, schedule, aiRules, staffingConfig, units, sectors, shiftTypesList
      };
      localStorage.setItem('ESCALA_FACIL_DATA', JSON.stringify(dataToSave));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000); // Visual feedback
  };

  // Sync employees units/sectors with lists
  useEffect(() => {
      const newUnits = new Set(units);
      const newSectors = new Set(sectors);
      const newTypes = new Set(shiftTypesList);
      
      let changed = false;
      employees.forEach(e => {
          if(e.unit && !newUnits.has(e.unit)) { newUnits.add(e.unit); changed = true; }
          if(e.sector && !newSectors.has(e.sector)) { newSectors.add(e.sector); changed = true; }
          if(e.shiftType && !newTypes.has(e.shiftType)) { newTypes.add(e.shiftType); changed = true; }
      });

      if(changed) {
          setUnits(Array.from(newUnits).sort());
          setSectors(Array.from(newSectors).sort());
          setShiftTypesList(Array.from(newTypes).sort());
      }
  }, [employees]);

  // DERIVED LISTS FOR ROSTER FILTERS (Strict Mode)
  const activeUnits = useMemo(() => Array.from(new Set(employees.map(e => e.unit).filter(Boolean))).sort(), [employees]);
  const activeSectors = useMemo(() => Array.from(new Set(employees.map(e => e.sector).filter(Boolean))).sort(), [employees]);
  const activeShiftTypes = useMemo(() => Array.from(new Set(employees.map(e => e.shiftType).filter(Boolean))).sort(), [employees]);

  // Apply Filters
  const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
        // User Restriction
        if (currentUser?.role !== 'admin' && currentUser?.allowedUnits && currentUser.allowedUnits.length > 0) {
            if (!currentUser.allowedUnits.includes(emp.unit)) return false;
        }

        const matchUnit = selectedUnits.length === 0 || selectedUnits.includes(emp.unit);
        const matchSector = selectedSectors.length === 0 || selectedSectors.includes(emp.sector);
        const matchShift = selectedShiftTypes.length === 0 || selectedShiftTypes.includes(emp.shiftType);
        
        return matchUnit && matchSector && matchShift;
      });
  }, [employees, selectedUnits, selectedSectors, selectedShiftTypes, currentUser]);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setSchedule(prev => ({ ...prev, month: newDate.getMonth(), year: newDate.getFullYear() }));
  };

  const handleAutoGenerate = async () => {
    if (!process.env.API_KEY) { alert("API Key não encontrada."); return; }
    if (filteredEmployees.length === 0) { alert("Nenhum colaborador visível."); return; }
    setIsGenerating(true);
    const result = await generateAISchedule(filteredEmployees, shifts, schedule.month, schedule.year, aiRules);
    if (result) {
        setSchedule(prev => ({ ...prev, assignments: { ...prev.assignments, ...result } }));
    } else {
        alert("Erro ao gerar escala. Tente novamente.");
    }
    setIsGenerating(false);
  };

  const handlePrint = () => {
      window.print();
  };

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isAdmin = currentUser?.role === 'admin';

  if (!currentUser) {
      return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* Header - Hidden on Print */}
      <header className="bg-company-blue text-white shadow-lg z-50 flex flex-col shrink-0 print:hidden">
        <div className="flex items-center justify-between px-6 py-2 border-b border-blue-900">
            <div className="flex items-center gap-8">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded text-company-blue flex items-center justify-center font-bold text-xl">PS</div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight leading-none">ESCALA FÁCIL</h1>
                        <p className="text-[10px] text-blue-200 tracking-wider uppercase">PREVENT SENIOR</p>
                    </div>
                 </div>
                 
                 <div className="flex gap-1 bg-blue-900/50 p-1 rounded-lg">
                     <button 
                        onClick={() => setCurrentView('roster')}
                        className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${currentView === 'roster' ? 'bg-white text-company-blue shadow' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
                     >
                         Escala Mensal
                     </button>
                     {isAdmin && (
                         <button 
                            onClick={() => setCurrentView('database')}
                            className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${currentView === 'database' ? 'bg-white text-company-blue shadow' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}
                         >
                             Base de Colaboradores
                         </button>
                     )}
                 </div>
            </div>

            {currentView === 'roster' && (
                <div className="flex items-center bg-blue-900 rounded p-1">
                    <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-white/10 rounded transition-colors text-white"><span className="text-lg">‹</span></button>
                    <span className="w-40 text-center font-bold text-sm tracking-wide select-none uppercase">{MONTH_NAMES[schedule.month]} / {schedule.year}</span>
                    <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-white/10 rounded transition-colors text-white"><span className="text-lg">›</span></button>
                </div>
            )}
            
            <div className="flex items-center gap-3">
               <span className="text-xs text-blue-300 border-r border-blue-700 pr-3 mr-1">Olá, {currentUser.name}</span>
               {isAdmin && (
                   <button onClick={() => setShowUserMgmt(true)} className="text-xs bg-blue-800 px-2 py-1 rounded hover:bg-blue-700">Usuários</button>
               )}
               <button onClick={() => setCurrentUser(null)} className="text-xs text-red-300 hover:text-red-100 underline">Sair</button>
            </div>
        </div>

        {/* Toolbar - Only for Roster View */}
        {currentView === 'roster' && (
            <div className="bg-[#003399] px-6 py-2 flex items-center gap-6 shadow-inner shrink-0 text-white z-40 relative">
                
                <MultiSelect 
                    label="Unidade" 
                    options={activeUnits} 
                    selected={selectedUnits} 
                    onChange={setSelectedUnits} 
                    isAdmin={isAdmin}
                    onEdit={() => setFilterManager({ isOpen: true, type: 'Unit' })}
                />

                <MultiSelect 
                    label="Setor" 
                    options={activeSectors} 
                    selected={selectedSectors} 
                    onChange={setSelectedSectors}
                    isAdmin={isAdmin}
                    onEdit={() => setFilterManager({ isOpen: true, type: 'Sector' })}
                />

                <MultiSelect 
                    label="Turno" 
                    options={activeShiftTypes} 
                    selected={selectedShiftTypes} 
                    onChange={setSelectedShiftTypes}
                    isAdmin={isAdmin}
                    onEdit={() => setFilterManager({ isOpen: true, type: 'Shift' })}
                />
                
                <div className="flex-1 flex justify-end gap-3 items-end h-full pt-1">
                    <Tooltip content="Salvar Alterações">
                        <button onClick={handleSaveData} className="p-2 text-white hover:bg-white/10 rounded-full transition-all">
                            <SaveIcon saved={isSaved} />
                        </button>
                    </Tooltip>

                    <Tooltip content="Imprimir Escala">
                        <button onClick={handlePrint} className="p-2 text-white hover:bg-white/10 rounded-full transition-all">
                            <PrintIcon />
                        </button>
                    </Tooltip>

                    <div className="w-px h-8 bg-blue-700 mx-2"></div>

                    {canEdit && (
                        <>
                            {isAdmin && (
                                <>
                                    <Tooltip content="Legendas & Turnos">
                                        <button onClick={() => setShowShifts(true)} className="p-2 text-white hover:bg-white/10 rounded-full">
                                            <TagIcon />
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                            <Tooltip content="Regras da IA">
                                <button onClick={() => setShowRules(true)} className="p-2 text-white hover:bg-white/10 rounded-full">
                                    <ScaleIcon />
                                </button>
                            </Tooltip>
                            <Tooltip content="Dimensionamento">
                                <button onClick={() => setShowStaffing(true)} className="p-2 text-white hover:bg-white/10 rounded-full">
                                    <ChartBarIcon />
                                </button>
                            </Tooltip>
                            
                            <button onClick={handleAutoGenerate} disabled={isGenerating} className="ml-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded uppercase shadow border border-emerald-400 disabled:opacity-50">
                                {isGenerating ? '...' : 'Gerar (IA)'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden relative print:p-0 print:overflow-visible bg-white z-0">
          {currentView === 'roster' ? (
               <div className="h-full p-4 print:p-0">
                    <RosterGrid 
                        employees={filteredEmployees} 
                        shifts={shifts} 
                        currentSchedule={schedule} 
                        setSchedule={setSchedule} 
                        rules={aiRules} 
                        staffingConfig={staffingConfig}
                        isReadOnly={!canEdit} 
                        onReorderEmployees={(a,b) => {
                            if (!canEdit) return;
                            const newOrder = [...employees];
                            const from = newOrder.findIndex(e => e.id === a);
                            const to = newOrder.findIndex(e => e.id === b);
                            if(from >=0 && to >=0) {
                                const [moved] = newOrder.splice(from, 1);
                                newOrder.splice(to, 0, moved);
                                setEmployees(newOrder);
                            }
                        }}/>
               </div>
          ) : (
               <div className="h-full">
                    <EmployeeDatabaseScreen 
                        employees={employees} 
                        setEmployees={setEmployees}
                        units={units}
                        sectors={sectors}
                        shiftTypes={shiftTypesList}
                    />
               </div>
          )}
      </main>

      {/* Modals */}
      {showEmployees && <EmployeeManager employees={employees} setEmployees={setEmployees} onClose={() => setShowEmployees(false)} />}
      {showShifts && <ShiftManager shifts={shifts} setShifts={setShifts} onClose={() => setShowShifts(false)} />}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} rules={aiRules} setRules={setAiRules} />
      <StaffingModal isOpen={showStaffing} onClose={() => setShowStaffing(false)} employees={employees} config={staffingConfig} setConfig={setStaffingConfig} />
      {showUserMgmt && <UserManagement onClose={() => setShowUserMgmt(false)} availableUnits={units} />}
      
      <FilterManagerModal 
        isOpen={filterManager.isOpen} 
        onClose={() => setFilterManager({ isOpen: false, type: null })} 
        title={filterManager.type || ''}
        items={filterManager.type === 'Unit' ? units : filterManager.type === 'Sector' ? sectors : shiftTypesList}
        setItems={filterManager.type === 'Unit' ? setUnits : filterManager.type === 'Sector' ? setSectors : setShiftTypesList}
      />
    </div>
  );
};

export default App;
