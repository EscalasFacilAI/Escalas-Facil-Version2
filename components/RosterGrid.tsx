
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Employee, Shift, MonthlySchedule, AIRulesConfig, StaffingConfig } from '../types';
import { getDaysInMonth, validateSchedule } from '../services/schedulerService';
import { Tooltip } from './Tooltip';
import { HOLIDAYS } from '../constants';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  currentSchedule: MonthlySchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthlySchedule>>;
  rules: AIRulesConfig;
  staffingConfig: StaffingConfig; 
  onReorderEmployees?: (draggedId: string, targetId: string) => void;
  isReadOnly?: boolean;
}

interface ContextMenuState {
  visible: boolean;
  type: 'cell' | 'header'; 
  x: number;
  y: number;
  employeeId?: string;
  day?: number;
  columnKey?: string;
}

type ColumnKey = 'name' | 'id' | 'role' | 'cpf' | 'scale' | 'position' | 'council' | 'bh';

interface DailyStat {
  day: number;
  totalActive: number;
  roleCounts: Record<string, number>;
  roleIdeals: Record<string, number>;
}

export const RosterGrid: React.FC<Props> = ({ employees, shifts, currentSchedule, setSchedule, rules, staffingConfig, onReorderEmployees, isReadOnly = false }) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, type: 'cell', x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Refs for scroll sync
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  // Flags to prevent infinite scroll loops
  const isSyncingHeader = useRef(false);
  const isSyncingBody = useRef(false);

  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: ColumnKey | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);

  const [colWidths, setColWidths] = useState<Record<ColumnKey, number>>({
      name: 220, id: 80, role: 120, cpf: 100, scale: 80, position: 80, council: 100, bh: 60
  });
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const startResizeX = useRef(0);
  const startResizeWidth = useRef(0);

  const daysInMonth = useMemo(() => 
    getDaysInMonth(currentSchedule.month, currentSchedule.year), 
    [currentSchedule.month, currentSchedule.year]
  );
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // Scroll Sync Logic
  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (!isSyncingHeader.current && headerScrollRef.current) {
          isSyncingBody.current = true;
          headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
      isSyncingHeader.current = false;
  };

  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (!isSyncingBody.current && bodyScrollRef.current) {
          isSyncingHeader.current = true;
          bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
      isSyncingBody.current = false;
  };

  // Sorting logic...
  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key) return employees;
    return [...employees].sort((a, b) => {
        let valA = '';
        let valB = '';
        switch (sortConfig.key) {
            case 'name': valA = a.name; valB = b.name; break;
            case 'id': valA = a.id; valB = b.id; break;
            case 'role': valA = a.role; valB = b.role; break;
            case 'cpf': valA = a.cpf; valB = b.cpf; break;
            case 'scale': valA = a.shiftPattern; valB = b.shiftPattern; break;
            case 'position': valA = a.positionNumber; valB = b.positionNumber; break;
            case 'council': valA = a.categoryCode; valB = b.categoryCode; break;
            case 'bh': valA = a.bankHoursBalance; valB = b.bankHoursBalance; break;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [employees, sortConfig]);

  const visibleColumns = (Object.keys(colWidths) as ColumnKey[]).filter(k => !hiddenColumns.includes(k));
  const totalLeftWidth = visibleColumns.reduce((acc, key) => acc + colWidths[key], 0);

  // Stats calculation...
  const dailyStats = useMemo<DailyStat[]>(() => {
      return daysArray.map(day => {
          const date = new Date(currentSchedule.year, currentSchedule.month, day);
          const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayKey = dayKeys[date.getDay()];
          const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          let totalActive = 0;
          const roleCounts: Record<string, number> = {};

          employees.forEach(emp => {
              const shiftId = currentSchedule.assignments[emp.id]?.[dateKey];
              const shift = shifts.find(s => s.id === shiftId);
              if (shift && shift.category === 'work') {
                  totalActive++;
                  roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
              }
          });

          const roleIdeals: Record<string, number> = {};
          Object.keys(staffingConfig).forEach(role => {
              const cfg = staffingConfig[role];
              const specific = (cfg as any)[dayKey];
              roleIdeals[role] = specific !== undefined ? specific : cfg.default;
          });

          return { day, totalActive, roleCounts, roleIdeals };
      });
  }, [employees, currentSchedule, shifts, daysArray, staffingConfig]);

  const getDayLabel = (day: number) => {
    const date = new Date(currentSchedule.year, currentSchedule.month, day);
    return weekDays[date.getDay()];
  };

  const isWeekendOrHoliday = (day: number) => {
    const date = new Date(currentSchedule.year, currentSchedule.month, day);
    const dayOfWeek = date.getDay(); 
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(currentSchedule.month + 1).padStart(2, '0');
    const holidayKey = `${dayStr}-${monthStr}`;
    return dayOfWeek === 0 || dayOfWeek === 6 || HOLIDAYS[holidayKey] !== undefined;
  }
  
  const getHolidayName = (day: number) => {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(currentSchedule.month + 1).padStart(2, '0');
      return HOLIDAYS[`${dayStr}-${monthStr}`];
  }

  // ... (Header click, Context Menu handlers remain similar)
   const handleHeaderClick = (key: ColumnKey) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const handleHeaderContextMenu = (e: React.MouseEvent, key: ColumnKey) => {
      e.preventDefault();
      setContextMenu({ visible: true, type: 'header', x: e.pageX, y: e.pageY, columnKey: key });
  };

  const startResizing = (e: React.MouseEvent, colName: ColumnKey) => {
      e.preventDefault(); e.stopPropagation();
      setResizingCol(colName);
      startResizeX.current = e.clientX;
      startResizeWidth.current = colWidths[colName];
      document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (resizingCol) {
              const diff = e.clientX - startResizeX.current;
              setColWidths(prev => ({ ...prev, [resizingCol]: Math.max(40, startResizeWidth.current + diff) }));
          }
      };
      const handleMouseUp = () => {
          if (resizingCol) { setResizingCol(null); document.body.style.cursor = 'default'; }
      };
      if (resizingCol) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [resizingCol]);

  const handleCellContextMenu = (e: React.MouseEvent, employeeId: string, day: number) => {
      e.preventDefault();
      if (isReadOnly) return;
      setContextMenu({ visible: true, type: 'cell', x: e.pageX, y: e.pageY, employeeId, day });
  };

  useEffect(() => {
      const handleClick = (e: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(prev => ({ ...prev, visible: false }));
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSelectShift = (shiftId: string) => {
      if (contextMenu.employeeId && contextMenu.day) {
          const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`;
          setSchedule(prev => ({
            ...prev, assignments: { ...prev.assignments, [contextMenu.employeeId!]: { ...(prev.assignments[contextMenu.employeeId!] || {}), [dateKey]: shiftId } }
         }));
      }
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleClearCell = () => {
       if (contextMenu.employeeId && contextMenu.day) {
          const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`;
          const newAssignments = { ...(currentSchedule.assignments[contextMenu.employeeId!] || {}) };
          delete newAssignments[dateKey];
          setSchedule(prev => ({ ...prev, assignments: { ...prev.assignments, [contextMenu.employeeId!]: newAssignments } }));
       }
       setContextMenu(prev => ({ ...prev, visible: false }));
  }

  const handleCellClick = (employeeId: string, day: number) => {
       if (isReadOnly) return;
       const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const currentAssignment = currentSchedule.assignments[employeeId]?.[dateKey];
        let nextShiftIndex = -1;
        if (currentAssignment) {
            const currentIdx = shifts.findIndex(s => s.id === currentAssignment);
            nextShiftIndex = (currentIdx + 1) % shifts.length;
        } else { nextShiftIndex = 0; }
        const nextShiftId = shifts[nextShiftIndex].id;
        setSchedule(prev => ({
        ...prev, assignments: { ...prev.assignments, [employeeId]: { ...(prev.assignments[employeeId] || {}), [dateKey]: nextShiftId } }
        }));
  }
  
  const calculateStats = (employeeId: string) => {
      let daysOff = 0;
      const assignments = currentSchedule.assignments[employeeId] || {};
      Object.values(assignments).forEach(shiftId => {
          const shift = shifts.find(s => s.id === shiftId);
          if (shift && shift.category === 'dayoff') daysOff++;
      });
      return { daysOff };
  };

  const handleDragStart = (e: React.DragEvent, id: string) => { 
      if (isReadOnly) return;
      setDraggedEmployeeId(id); 
      e.dataTransfer.effectAllowed = 'move'; 
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (isReadOnly) return;
      if (draggedEmployeeId && draggedEmployeeId !== targetId && onReorderEmployees) { onReorderEmployees(draggedEmployeeId, targetId); }
      setDraggedEmployeeId(null);
  };

  const labelMap: Record<ColumnKey, string> = { 
      name: 'NOME COLABORADOR', id: 'ID', role: 'CARGO', cpf: 'CPF', 
      scale: 'ESCALA', position: 'Nº POSIÇÃO', council: 'REG. CONSELHO', bh: 'BH' 
  };

  return (
    <div className="bg-white rounded shadow-sm border border-slate-300 flex flex-col h-full overflow-hidden select-none relative print:border-none print:shadow-none">
      
      {/* Restore Cols */}
      {hiddenColumns.length > 0 && (
          <button onClick={() => setHiddenColumns([])} className="absolute top-1 left-1 z-30 bg-blue-100 text-blue-700 p-1 rounded hover:bg-blue-200 shadow print:hidden">
             Restaurar Colunas
          </button>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
          <div ref={menuRef} className="fixed z-50 bg-white shadow-xl rounded-lg border border-slate-200 py-1 min-w-[160px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
              {contextMenu.type === 'header' ? (
                  <button onClick={() => { if(contextMenu.columnKey) setHiddenColumns(prev => [...prev, contextMenu.columnKey as ColumnKey]); setContextMenu(prev => ({...prev, visible:false}))}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700">Ocultar Coluna</button>
              ) : (
                  <>
                    <button onClick={handleClearCell} className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs text-red-600 font-bold border-b">Limpar</button>
                    <div className="max-h-60 overflow-y-auto">
                        {shifts.map(shift => (
                            <button key={shift.id} onClick={() => handleSelectShift(shift.id)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs text-slate-700 flex items-center gap-2">
                                <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold border ${shift.color} ${shift.textColor || 'text-slate-800'}`}>{shift.code}</span>
                                <span>{shift.name}</span>
                            </button>
                        ))}
                    </div>
                  </>
              )}
          </div>
      )}

      {/* Header Container - Syncs Scroll */}
      <div className="flex bg-company-blue text-white z-20 shadow-md">
        <div className="flex-shrink-0 flex border-r border-blue-800 bg-company-blue z-20" style={{ width: totalLeftWidth }}>
            {visibleColumns.map((key) => (
                <div key={key} style={{ width: colWidths[key] }} onClick={() => handleHeaderClick(key)} onContextMenu={(e) => handleHeaderContextMenu(e, key)} className="relative p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer hover:bg-blue-900 group">
                    {labelMap[key]}
                    {sortConfig.key === key && <span className="ml-1 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                    <div onMouseDown={(e) => startResizing(e, key)} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10" />
                </div>
            ))}
        </div>
        {/* Scrollable Date Header */}
        <div ref={headerScrollRef} onScroll={handleHeaderScroll} className="flex-1 overflow-x-auto flex no-scrollbar">
            <div className="flex min-w-max">
            {daysArray.map(day => {
                const isOff = isWeekendOrHoliday(day);
                return (
                <div key={day} className={`w-8 flex flex-col items-center justify-center border-r border-blue-800 ${isOff ? 'bg-sky-500/30' : ''}`} title={getHolidayName(day)}>
                    <span className="text-[9px] font-medium opacity-80 uppercase">{getDayLabel(day).substring(0, 1)}</span>
                    <span className="text-[10px] font-bold">{String(day).padStart(2, '0')}</span>
                </div>
            )})}
            </div>
        </div>
        <div className="w-16 flex-shrink-0 p-2 font-bold text-[10px] border-l border-blue-800 flex items-center justify-center bg-company-blue">FOLGAS</div>
        <div className="w-8 flex-shrink-0 p-2 font-bold text-[10px] border-l border-blue-800 flex items-center justify-center bg-company-blue" title="Status CLT">ST</div>
      </div>

      {/* Body Container - Main Scroll */}
      {/* CRITICAL FIX: Removed overflow-x-hidden to allow horizontal scrolling, enabled sync */}
      <div ref={bodyScrollRef} onScroll={handleBodyScroll} className="flex-1 overflow-y-auto overflow-x-auto relative bg-slate-200 print:bg-white print:overflow-visible" >
        <div className="min-w-max">
            {sortedEmployees.map(employee => {
            const validation = validateSchedule(employee.id, currentSchedule, shifts, rules);
            const stats = calculateStats(employee.id);

            return (
                <div 
                    key={employee.id} draggable={!isReadOnly} onDragStart={(e) => handleDragStart(e, employee.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, employee.id)}
                    className={`flex border-b border-slate-300 bg-white hover:bg-blue-50 transition-colors group h-9 ${draggedEmployeeId === employee.id ? 'opacity-50' : ''}`}
                >
                    {/* Fixed Left Columns - Sticky to follow horizontal scroll */}
                    <div className="flex-shrink-0 flex border-r border-slate-300 bg-white sticky left-0 z-10 group-hover:bg-blue-50" style={{ width: totalLeftWidth }}>
                        {visibleColumns.map(key => {
                            const val = key === 'scale' ? employee.shiftPattern : key === 'position' ? employee.positionNumber : key === 'council' ? employee.categoryCode : key === 'bh' ? employee.bankHoursBalance : (employee as any)[key];
                            const colorClass = key === 'bh' ? (val.startsWith('-') ? 'text-red-600' : 'text-green-600 font-bold') : 'text-slate-500';
                            const align = key === 'name' ? 'justify-start px-2' : 'justify-center px-1';
                            return (
                                <div key={key} style={{ width: colWidths[key] }} className={`flex items-center ${align} border-r border-slate-100 overflow-hidden`}>
                                    <span className={`text-[9px] truncate uppercase font-medium ${colorClass}`} title={val}>{val}</span>
                                </div>
                            )
                        })}
                    </div>
                    
                    {/* Grid Cells */}
                    <div className="flex">
                        {daysArray.map(day => {
                            const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const shiftId = currentSchedule.assignments[employee.id]?.[dateKey];
                            const shift = shifts.find(s => s.id === shiftId);
                            const isOff = isWeekendOrHoliday(day);
                            return (
                                <div key={day} onClick={() => handleCellClick(employee.id, day)} onContextMenu={(e) => handleCellContextMenu(e, employee.id, day)}
                                    className={`w-8 h-full border-r border-slate-300 flex items-center justify-center cursor-pointer text-[10px] font-bold select-none
                                        ${!shift && isOff ? 'bg-sky-50' : ''} ${shift ? shift.color : 'bg-transparent'} ${shift?.textColor ? shift.textColor : 'text-slate-700'}
                                        hover:brightness-95 hover:z-10 hover:shadow-inner
                                        ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}
                                    `}>
                                    {shift ? shift.code : ''}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Fixed Columns (Not Sticky, just at end of row) */}
                    <div className="w-16 flex-shrink-0 border-l border-slate-300 flex items-center justify-center text-[10px] bg-slate-50 font-bold text-slate-700">{stats.daysOff}</div>
                    <div className="w-8 flex-shrink-0 border-l border-slate-300 flex items-center justify-center bg-slate-50">
                        {validation.valid ? (
                            <span className="text-green-500 font-bold">✔</span>
                        ) : (
                            <Tooltip content={validation.messages.join('\n')}>
                                <span className="text-red-500 font-bold cursor-help text-xs">⚠</span>
                            </Tooltip>
                        )}
                    </div>
                </div>
            );
            })}
        </div>
      </div>

      {/* Footer (Simplified for this update to focus on sync) */}
      <div className="bg-slate-50 border-t border-slate-300 shadow-inner flex flex-col shrink-0 print:hidden">
          <div className="flex h-10 border-b border-slate-200">
             <div className="flex-shrink-0 flex items-center justify-end px-2 font-bold text-[10px] text-slate-700 uppercase bg-slate-100 border-r border-slate-300" style={{ width: totalLeftWidth }}>Total Ativos / Ideal</div>
             <div className="flex-1 overflow-x-hidden flex no-scrollbar"> 
                 {/* Manually transform to sync with header scroll */}
                 <div className="flex min-w-max" style={{ transform: `translateX(-${headerScrollRef.current?.scrollLeft || 0}px)` }}> 
                     {dailyStats.map(stat => {
                         const values = Object.values(stat.roleIdeals) as number[];
                         const globalIdeal = values.reduce((a, b) => a + b, 0);
                         const isDeficit = stat.totalActive < globalIdeal;
                         return (
                            <div key={stat.day} className="w-8 flex flex-col items-center justify-center border-r border-slate-200 text-[9px]">
                                <span className={`font-bold ${isDeficit ? 'text-red-600' : 'text-slate-800'}`}>{stat.totalActive}</span>
                            </div>
                         )
                     })}
                 </div>
             </div>
             <div className="w-24 bg-slate-100 border-l border-slate-300"></div>
          </div>
      </div>
    </div>
  );
};
