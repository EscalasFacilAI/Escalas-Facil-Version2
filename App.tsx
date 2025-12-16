
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { ReportsScreen } from './components/ReportsScreen';
import { GenerationScopeModal } from './components/GenerationScopeModal';
import { ConfirmationModal } from './components/ConfirmationModal';

// Services
import { DatabaseService } from './services/databaseService';
import { getSession, destroySession } from './services/securityService';

// Icons (Mesmos ícones)
const SaveIcon = ({ saved }: { saved: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${saved ? 'text-green-400' : 'text-white'}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d={saved ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"} />
    </svg>
);
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 018.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.467a23.879 23.879 0 00-1.014-5.395m0 3.467c-.291 1.126-.541 2.274-.75 3.446M12.5 12h.008v.008H12.5V12z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [currentView, setCurrentView] = useState<'roster' | 'database' | 'reports'>('roster');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dynamic Lists for Filters
  const [units, setUnits] = useState<string[]>(INITIAL_UNITS);
  const [sectors, setSectors] = useState<string[]>(INITIAL_SECTORS);
  const [shiftTypesList, setShiftTypesList] = useState<string[]>(INITIAL_SHIFT_TYPES);

  // Filter States
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // Rules & Config
  const [aiRules, setAiRules] = useState<AIRulesConfig>({ 
      maxConsecutiveDays: 6, minRestHours: 11, preferSundayOff: true, sundayOffFrequency: 2, preferConsecutiveDaysOff: true,
      allowExtraDaysOff: false, extraDaysOffCount: 1 
  });
  const [staffingConfig, setStaffingConfig] = useState<StaffingConfig>({});
  
  // SCHEDULE STATE (Month-based)
  const [schedule, setScheduleState] = useState<MonthlySchedule>({ month: currentDate.getMonth(), year: currentDate.getFullYear(), assignments: {}, attachments: {}, comments: {} });
  const [historyPast, setHistoryPast] = useState<MonthlySchedule[]>([]);
  const [historyFuture, setHistoryFuture] = useState<MonthlySchedule[]>([]);
  
  // DIRTY STATE TRACKING
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
      const init = async () => {
          setIsLoading(true);
          // 1. Security Check
          const sessionUser = getSession();
          if (sessionUser) setCurrentUser(sessionUser);

          // 2. Load Base Data (Employees, Shifts, Settings)
          const [loadedEmps, loadedShifts, settings] = await Promise.all([
              DatabaseService.loadEmployees(),
              DatabaseService.loadShifts(),
              DatabaseService.loadSettings()
          ]);

          setEmployees(loadedEmps);
          setShifts(loadedShifts);
          if (settings.aiRules) setAiRules(settings.aiRules);
          if (settings.staffing) setStaffingConfig(settings.staffing);
          
          setIsLoading(false);
      };
      init();
  }, []);

  // --- MONTH CHANGE & LAZY LOADING ---
  // When date changes, we fetch the schedule for THAT month. 
  // This is the key performance booster: we don't hold 10 years of data in memory.
  useEffect(() => {
      const loadMonth = async () => {
          setIsLoading(true); // Show loading spinner
          const monthData = await DatabaseService.loadMonthlySchedule(currentDate.getMonth(), currentDate.getFullYear());
          setScheduleState(monthData);
          setHistoryPast([]); // Clear undo history on month change
          setHistoryFuture([]);
          setHasUnsavedChanges(false);
          setIsLoading(false);
      };
      loadMonth();
  }, [currentDate]);

  const setSchedule = useCallback((value: React.SetStateAction<MonthlySchedule>) => {
      setScheduleState(prev => {
          const next = typeof value === 'function' ? value(prev) : value;
          if (next !== prev) {
              setHistoryPast(past => [...past, prev]);
              setHistoryFuture([]);
              setHasUnsavedChanges(true);
          }
          return next;
      });
  }, []);

  // --- UNSAVED CHANGES WARNING ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // --- SAVE LOGIC (SHARDED) ---
  const handleSaveData = async () => {
      setIsLoading(true);
      // Save everything in parallel
      await Promise.all([
          DatabaseService.saveEmployees(employees),
          DatabaseService.saveShifts(shifts),
          DatabaseService.saveSettings(aiRules, staffingConfig),
          DatabaseService.saveMonthlySchedule(schedule) // Saves only current month file
      ]);
      
      setIsSaved(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setIsSaved(false), 2000);
      setIsLoading(false);
  };

  const handleUndo = useCallback(() => {
      if (historyPast.length === 0) return;
      const previous = historyPast[historyPast.length - 1];
      const newPast = historyPast.slice(0, -1);
      setHistoryFuture(future => [schedule, ...future]);
      setScheduleState(previous);
      setHistoryPast(newPast);
      setHasUnsavedChanges(true);
  }, [historyPast, schedule]);

  const handleRedo = useCallback(() => {
      if (historyFuture.length === 0) return;
      const next = historyFuture[0];
      const newFuture = historyFuture.slice(1);
      setHistoryPast(past => [...past, schedule]);
      setScheduleState(next);
      setHistoryFuture(newFuture);
      setHasUnsavedChanges(true);
  }, [historyFuture, schedule]);

  const handleLogin = (user: User) => { setCurrentUser(user); };
  const handleLogout = () => { 
      if (hasUnsavedChanges) {
          if(!confirm("Você tem alterações não salvas. Tem certeza que deseja sair e perder os dados?")) return;
      }
      destroySession();
      setCurrentUser(null);
  };

  const handleUpdateEmployee = (id: string, field: string, value: string) => {
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
      setHasUnsavedChanges(true);
  };

  const handleMonthChange = async (offset: number) => {
    if (hasUnsavedChanges) {
        if (!confirm("Existem alterações não salvas. Mudar de mês sem salvar descartará as mudanças. Continuar?")) return;
    }
    // Update State -> Triggers useEffect
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // UI States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [showEmployees, setShowEmployees] = useState(false);
  const [showShifts, setShowShifts] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showStaffing, setShowStaffing] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showGenerationScope, setShowGenerationScope] = useState(false);
  const [filterManager, setFilterManager] = useState<{ isOpen: boolean, type: 'Unit' | 'Sector' | 'Shift' | null }>({ isOpen: false, type: null });

  // Clear Schedule Logic
  const [clearScopeModalOpen, setClearScopeModalOpen] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearTargetIds, setClearTargetIds] = useState<string[]>([]);

  // Refs
  const appContainerRef = useRef<HTMLDivElement>(null);

  // Sync Lists
  useEffect(() => {
      const builtUnits = new Set(INITIAL_UNITS);
      const builtSectors = new Set(INITIAL_SECTORS);
      const builtTypes = new Set(INITIAL_SHIFT_TYPES);

      employees.forEach(e => {
          if(e.unit) builtUnits.add(e.unit);
          if(e.sector) builtSectors.add(e.sector);
          if(e.shiftType) builtTypes.add(e.shiftType.toUpperCase());
      });

      const sortedUnits = Array.from(builtUnits).sort();
      const sortedSectors = Array.from(builtSectors).sort();
      const sortedTypes = Array.from(builtTypes).sort();

      if (JSON.stringify(sortedUnits) !== JSON.stringify(units)) setUnits(sortedUnits);
      if (JSON.stringify(sortedSectors) !== JSON.stringify(sectors)) setSectors(sortedSectors);
      if (JSON.stringify(sortedTypes) !== JSON.stringify(shiftTypesList)) setShiftTypesList(sortedTypes);
      
  }, [employees]);

  // Derived Filters
  const availableEmployees = useMemo(() => {
      if (currentUser?.role !== 'admin' && currentUser?.allowedUnits && currentUser.allowedUnits.length > 0) {
          return employees.filter(e => currentUser.allowedUnits!.includes(e.unit));
      }
      return employees;
  }, [employees, currentUser]);

  const activeUnits = useMemo(() => Array.from(new Set(availableEmployees.map(e => e.unit).filter(Boolean))).sort(), [availableEmployees]);
  const activeSectors = useMemo(() => {
      let rawSectors = Array.from(new Set(availableEmployees.map(e => e.sector).filter(Boolean))).sort();
      if (currentUser?.role !== 'admin' && currentUser?.allowedSectors && currentUser.allowedSectors.length > 0) {
          rawSectors = rawSectors.filter(s => currentUser.allowedSectors!.includes(s));
      }
      return rawSectors;
  }, [availableEmployees, currentUser]);
  const activeShiftTypes = useMemo(() => Array.from(new Set(availableEmployees.map(e => e.shiftType).filter(Boolean))).sort(), [availableEmployees]);

  const filteredEmployees = useMemo(() => {
      return availableEmployees.filter(emp => {
        if (currentUser?.role !== 'admin' && currentUser?.allowedSectors && currentUser.allowedSectors.length > 0) {
            if (!currentUser.allowedSectors.includes(emp.sector)) return false;
        }
        if (globalSearchTerm) {
            const term = globalSearchTerm.toLowerCase();
            const match = emp.name.toLowerCase().includes(term) || emp.id.includes(term) || emp.role.toLowerCase().includes(term);
            if (!match) return false;
        }
        if (emp.terminationDate) {
            const termDate = new Date(emp.terminationDate);
            const scheduleDateStart = new Date(schedule.year, schedule.month, 1);
            const termDateEnd = new Date(termDate.getFullYear(), termDate.getMonth() + 1, 0); 
            if (scheduleDateStart > termDateEnd) return false; 
        }
        const matchUnit = selectedUnits.length === 0 || selectedUnits.includes(emp.unit);
        const matchSector = selectedSectors.length === 0 || selectedSectors.includes(emp.sector);
        const matchShift = selectedShiftTypes.length === 0 || selectedShiftTypes.includes(emp.shiftType);
        return matchUnit && matchSector && matchShift;
      });
  }, [availableEmployees, selectedUnits, selectedSectors, selectedShiftTypes, currentUser, globalSearchTerm, schedule.year, schedule.month]);

  // Actions
  const handleClearClick = () => setClearScopeModalOpen(true);
  const handleScopeConfirm = (ids: string[]) => { setClearTargetIds(ids); setClearScopeModalOpen(false); setShowConfirmClear(true); }

  const executeClearSchedule = () => {
      setSchedule(prev => {
          const newAssignments = { ...prev.assignments };
          const newAttachments = { ...prev.attachments };
          const newComments = { ...prev.comments };
          const targets = clearTargetIds.length > 0 ? filteredEmployees.filter(e => clearTargetIds.includes(e.id)) : filteredEmployees;

          targets.forEach(emp => {
              const daysInMonth = new Date(prev.year, prev.month + 1, 0).getDate();
              for(let d=1; d<=daysInMonth; d++) {
                  const key = `${prev.year}-${String(prev.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  if (newAssignments[emp.id]) delete newAssignments[emp.id][key];
                  if (newAttachments && newAttachments[emp.id]) delete newAttachments[emp.id][key];
                  if (newComments && newComments[emp.id]) delete newComments[emp.id][key];
              }
          });
          return { ...prev, assignments: newAssignments, attachments: newAttachments, comments: newComments };
      });
      setHasUnsavedChanges(true);
  }

  const handleAutoGenerateClick = () => {
      if (!process.env.API_KEY) { alert("API Key não encontrada."); return; }
      if (filteredEmployees.length === 0) { alert("Nenhum colaborador visível."); return; }
      setShowGenerationScope(true);
  }

  const handleConfirmGeneration = async (selectedIds: string[]) => {
      const targetEmployees = filteredEmployees.filter(e => selectedIds.includes(e.id));
      if (targetEmployees.length === 0) return;
      setIsGenerating(true);
      setGenerationProgress({ current: 0, total: targetEmployees.length });
      const result = await generateAISchedule(targetEmployees, shifts, schedule.month, schedule.year, aiRules, (current, total) => setGenerationProgress({ current, total }));
      if (result) { setSchedule(prev => ({ ...prev, assignments: { ...prev.assignments, ...result } })); setHasUnsavedChanges(true); } else { alert("Erro ao gerar escala."); }
      setIsGenerating(false);
  };

  const handlePrint = () => window.print();
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isAdmin = currentUser?.role === 'admin';

  // --- RENDER ---
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div ref={appContainerRef} className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      <header className="bg-company-blue text-white shadow-lg z-40 flex flex-col shrink-0 print:hidden w-full relative">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-2 border-b border-blue-900 w-full min-w-0 gap-2">
            <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded text-company-blue flex items-center justify-center font-bold text-xl">PS</div>
                    <div className="block"><h1 className="text-lg font-bold tracking-tight leading-none">ESCALA FÁCIL</h1><p className="text-[10px] text-blue-200 tracking-wider uppercase">PREVENT SENIOR</p></div>
                 </div>
                 <div className="flex gap-1 bg-blue-900/50 p-1 rounded-lg overflow-x-auto max-w-[200px] md:max-w-none">
                     <button onClick={() => setCurrentView('roster')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all whitespace-nowrap ${currentView === 'roster' ? 'bg-white text-company-blue shadow' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}>Escala</button>
                     {isAdmin && (<button onClick={() => setCurrentView('database')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all whitespace-nowrap ${currentView === 'database' ? 'bg-white text-company-blue shadow' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}>Cadastros</button>)}
                     <button onClick={() => setCurrentView('reports')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all whitespace-nowrap ${currentView === 'reports' ? 'bg-white text-company-blue shadow' : 'text-blue-200 hover:text-white hover:bg-white/10'}`}>Relat.</button>
                 </div>
            </div>

            <div className="flex-1 flex justify-center w-full md:max-w-md mx-0 md:mx-4 min-w-0">
                 <input type="text" placeholder="🔍 Buscar (ID ou Nome)" className="w-full bg-blue-900/50 border border-blue-700 rounded-full px-4 py-1 text-sm text-white placeholder-blue-300 outline-none focus:bg-blue-800 transition-colors" value={globalSearchTerm} onChange={e => setGlobalSearchTerm(e.target.value)} />
            </div>

            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                {currentView === 'roster' && (
                    <div className="flex items-center bg-blue-900 rounded p-1 shrink-0">
                        <button onClick={() => handleMonthChange(-1)} disabled={isLoading} className="p-1 hover:bg-white/10 rounded transition-colors text-white disabled:opacity-50"><span className="text-lg">‹</span></button>
                        <span className="w-28 md:w-40 text-center font-bold text-xs md:text-sm tracking-wide select-none uppercase inline-block">
                            {isLoading ? 'CARREGANDO...' : `${MONTH_NAMES[schedule.month]} / ${schedule.year}`}
                        </span>
                        <button onClick={() => handleMonthChange(1)} disabled={isLoading} className="p-1 hover:bg-white/10 rounded transition-colors text-white disabled:opacity-50"><span className="text-lg">›</span></button>
                    </div>
                )}
                <div className="flex items-center gap-3 shrink-0 ml-auto">
                   <span className="text-xs text-blue-300 border-r border-blue-700 pr-3 mr-1 hidden lg:inline">Olá, {currentUser.name.split(' ')[0]}</span>
                   {isAdmin && (<button onClick={() => setShowUserMgmt(true)} className="text-xs bg-blue-800 px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap">Usuários</button>)}
                   <button onClick={handleLogout} className="text-xs text-red-300 hover:text-red-100 underline whitespace-nowrap">Sair</button>
                </div>
            </div>
        </div>

        {currentView === 'roster' && (
            <div className="bg-[#003399] px-4 py-2 flex flex-nowrap items-center gap-4 shadow-inner shrink-0 text-white z-40 relative w-full overflow-x-auto no-scrollbar">
                <div className="flex gap-4 min-w-max">
                    <MultiSelect label="Unidade" options={activeUnits} selected={selectedUnits} onChange={setSelectedUnits} isAdmin={isAdmin} onEdit={() => setFilterManager({ isOpen: true, type: 'Unit' })} />
                    <MultiSelect label="Setor" options={activeSectors} selected={selectedSectors} onChange={setSelectedSectors} isAdmin={isAdmin} onEdit={() => setFilterManager({ isOpen: true, type: 'Sector' })} />
                    <MultiSelect label="Turno" options={activeShiftTypes} selected={selectedShiftTypes} onChange={setSelectedShiftTypes} isAdmin={isAdmin} onEdit={() => setFilterManager({ isOpen: true, type: 'Shift' })} />
                </div>
                <div className="flex-1 flex justify-end gap-3 items-center h-full min-w-max">
                    {isGenerating && (<div className="flex flex-col justify-center min-w-[100px] mr-4 hidden lg:flex"><div className="flex justify-between text-[10px] text-blue-200 mb-1"><span>Gerando...</span><span>{generationProgress.current} / {generationProgress.total}</span></div><div className="w-full bg-blue-900 rounded-full h-2 overflow-hidden"><div className="bg-emerald-400 h-full transition-all duration-300 ease-out" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}></div></div></div>)}
                    {hasUnsavedChanges && <span className="text-xs text-yellow-300 font-bold animate-pulse mr-2 hidden md:inline">Salvar!</span>}
                    <Tooltip content="Salvar Alterações (Nuvem)"><button onClick={handleSaveData} disabled={isLoading} className={`p-2 rounded-full transition-all ${hasUnsavedChanges ? 'bg-yellow-600/50 animate-bounce' : 'hover:bg-white/10'} disabled:opacity-50`}><SaveIcon saved={isSaved} /></button></Tooltip>
                    <Tooltip content="Imprimir Escala"><button onClick={handlePrint} className="p-2 text-white hover:bg-white/10 rounded-full transition-all"><PrintIcon /></button></Tooltip>
                    {canEdit && (<Tooltip content="Limpar Escala"><button onClick={handleClearClick} className="p-2 text-red-300 hover:bg-red-500/20 hover:text-red-200 rounded-full transition-all"><TrashIcon /></button></Tooltip>)}
                    <div className="w-px h-6 bg-blue-700 mx-2 hidden sm:block"></div>
                    {canEdit && (
                        <>
                            {isAdmin && (<Tooltip content="Legendas & Turnos"><button onClick={() => setShowShifts(true)} className="p-2 text-white hover:bg-white/10 rounded-full"><TagIcon /></button></Tooltip>)}
                            <Tooltip content="Regras da IA"><button onClick={() => setShowRules(true)} className="p-2 text-white hover:bg-white/10 rounded-full"><MegaphoneIcon /></button></Tooltip>
                            <Tooltip content="Dimensionamento"><button onClick={() => setShowStaffing(true)} className="p-2 text-white hover:bg-white/10 rounded-full"><ChartBarIcon /></button></Tooltip>
                            <button onClick={handleAutoGenerateClick} disabled={isGenerating || isLoading} className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold rounded uppercase shadow border border-emerald-400 disabled:opacity-50 whitespace-nowrap min-w-fit">{isGenerating ? 'Parar' : 'Gerar (IA)'}</button>
                        </>
                    )}
                </div>
            </div>
        )}
      </header>
      
      {/* PRINT HEADER */}
      <div className="hidden print:block p-4 border-b border-gray-300 bg-white">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                 <div className="w-10 h-10 bg-[#002060] text-white flex items-center justify-center font-bold text-xl rounded">PS</div>
                 <div><h1 className="text-xl font-bold text-[#002060]">ESCALA FÁCIL - PREVENT SENIOR</h1><p className="text-sm font-bold text-gray-600 uppercase">{MONTH_NAMES[schedule.month]} / {schedule.year}</p></div>
              </div>
              <div className="text-right text-[10px] text-gray-500">Impresso em: {new Date().toLocaleDateString()}</div>
          </div>
          <div className="flex gap-4 text-xs font-bold border rounded p-2 bg-gray-50">
              <div>UNIDADE: {selectedUnits.length ? selectedUnits.join(', ') : 'TODAS'}</div>
              <div className="border-l pl-4">SETOR: {selectedSectors.length ? selectedSectors.join(', ') : 'TODOS'}</div>
              <div className="border-l pl-4">TURNO: {selectedShiftTypes.length ? selectedShiftTypes.join(', ') : 'TODOS'}</div>
          </div>
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative print:p-0 print:overflow-visible bg-white z-0 w-full h-full min-w-0">
          {isLoading && currentView === 'roster' ? (
             <div className="flex-1 flex items-center justify-center flex-col">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold animate-pulse">Carregando dados da nuvem...</p>
             </div>
          ) : currentView === 'roster' ? (
               <div className="flex-1 flex flex-col h-full w-full p-0 print:p-0 overflow-hidden">
                    <RosterGrid employees={filteredEmployees} shifts={shifts} currentSchedule={schedule} setSchedule={setSchedule} rules={aiRules} staffingConfig={staffingConfig} isReadOnly={!canEdit} onUndo={handleUndo} onRedo={handleRedo}
                        currentUserId={currentUser.id}
                        onUpdateEmployee={handleUpdateEmployee}
                        onReorderEmployees={(a,b) => {
                            if (!canEdit) return;
                            const newOrder = [...employees];
                            const from = newOrder.findIndex(e => e.id === a);
                            const to = newOrder.findIndex(e => e.id === b);
                            if(from >=0 && to >=0) { const [moved] = newOrder.splice(from, 1); newOrder.splice(to, 0, moved); setEmployees(newOrder); setHasUnsavedChanges(true); }
                        }}/>
               </div>
          ) : currentView === 'database' ? (
               <div className="h-full w-full"><EmployeeDatabaseScreen employees={employees} setEmployees={setEmployees} units={units} sectors={sectors} shiftTypes={shiftTypesList} /></div>
          ) : (<ReportsScreen employees={filteredEmployees} schedule={schedule} shifts={shifts} />)}
      </main>

      {currentView === 'roster' && (
        <div className="hidden print:block p-4 mt-auto border-t border-gray-300 break-inside-avoid">
             <div className="mb-4">
                 <h4 className="font-bold text-xs uppercase mb-1">Legendas:</h4>
                 <div className="flex flex-wrap gap-2 text-[9px]">
                     {shifts.filter(s => ['work', 'dayoff', 'absence', 'leave'].includes(s.category)).map(s => (
                         <div key={s.id} className="flex items-center border rounded px-1 min-w-[80px]">
                             <span className={`w-4 h-4 flex items-center justify-center font-bold border mr-1 ${s.color} ${s.textColor}`}>{s.code}</span>
                             <span>{s.name}</span>
                         </div>
                     ))}
                 </div>
             </div>
             <div className="flex justify-between items-end pt-8 gap-8">
                 <div className="flex-1 border-t border-black text-center pt-1"><p className="font-bold text-xs">Responsável pela Escala</p><p className="text-[10px] text-gray-500">Assinatura / Carimbo</p></div>
                 <div className="flex-1 border-t border-black text-center pt-1"><p className="font-bold text-xs">Representante Prevent Senior</p><p className="text-[10px] text-gray-500">Assinatura / Carimbo</p></div>
             </div>
        </div>
      )}

      {showEmployees && <EmployeeManager employees={employees} setEmployees={setEmployees} onClose={() => setShowEmployees(false)} />}
      {showShifts && <ShiftManager shifts={shifts} setShifts={setShifts} onClose={() => setShowShifts(false)} />}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} rules={aiRules} setRules={setAiRules} />
      <StaffingModal isOpen={showStaffing} onClose={() => setShowStaffing(false)} employees={employees} config={staffingConfig} setConfig={setStaffingConfig} />
      {showUserMgmt && <UserManagement onClose={() => setShowUserMgmt(false)} availableUnits={units} employees={employees} />}
      <GenerationScopeModal isOpen={showGenerationScope} onClose={() => setShowGenerationScope(false)} employees={filteredEmployees} onConfirm={handleConfirmGeneration} />
      <FilterManagerModal isOpen={filterManager.isOpen} onClose={() => setFilterManager({ isOpen: false, type: null })} title={filterManager.type || ''} items={filterManager.type === 'Unit' ? units : filterManager.type === 'Sector' ? sectors : shiftTypesList} setItems={filterManager.type === 'Unit' ? setUnits : filterManager.type === 'Sector' ? setSectors : setShiftTypesList} />
      <GenerationScopeModal isOpen={clearScopeModalOpen} onClose={() => setClearScopeModalOpen(false)} employees={filteredEmployees} onConfirm={handleScopeConfirm} />
      
      <ConfirmationModal 
        isOpen={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        onConfirm={executeClearSchedule}
        title="Confirmar Limpeza"
        message={`ATENÇÃO: Você está prestes a limpar a escala de ${clearTargetIds.length === 0 ? 'TODOS os colaboradores visíveis' : clearTargetIds.length + ' colaboradores selecionados'} para este mês. Isso apagará turnos, anexos e observações. Deseja continuar?`}
        confirmText="Limpar Agora"
        isDangerous={true}
      />
    </div>
  );
};
export default App;
