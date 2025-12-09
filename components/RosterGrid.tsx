
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Employee, Shift, MonthlySchedule, AIRulesConfig, StaffingConfig, GridSelection, ExtendedColumnKey } from '../types';
import { getDaysInMonth, validateSchedule } from '../services/schedulerService';
import { Tooltip } from './Tooltip';
import { HOLIDAYS, COMMENTS_OPTIONS } from '../constants';

interface Props {
  employees: Employee[];
  shifts: Shift[];
  currentSchedule: MonthlySchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthlySchedule>>;
  rules: AIRulesConfig;
  staffingConfig: StaffingConfig; 
  onReorderEmployees?: (draggedId: string, targetId: string) => void;
  onUpdateEmployee?: (id: string, field: string, value: string) => void;
  isReadOnly?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

interface ContextMenuState {
  visible: boolean;
  type: 'cell' | 'header'; 
  x: number;
  y: number;
  employeeId?: string;
  day?: number;
  columnKey?: string;
  assignmentType?: 'absence' | 'leave' | 'other';
  hasAttachment?: boolean;
  isCommentMenu?: boolean;
}

interface DailyStat {
  day: number;
  totalActive: number;
  roleCounts: Record<string, number>;
  roleIdeals: Record<string, number>;
}

export const RosterGrid: React.FC<Props> = ({ 
    employees, shifts, currentSchedule, setSchedule, rules, staffingConfig, 
    onReorderEmployees, onUpdateEmployee, isReadOnly = false, onUndo, onRedo 
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, type: 'cell', x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const internalClipboard = useRef<string | null>(null);
  const footerScrollRef = useRef<HTMLDivElement>(null);

  // Attachment Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentTarget = useRef<{employeeId: string, day: number} | null>(null);

  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: ExtendedColumnKey | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [hiddenColumns, setHiddenColumns] = useState<ExtendedColumnKey[]>([]);
  
  // Initialize frozen columns with 'name' by default so it stays sticky, others scroll
  const [frozenColumns, setFrozenColumns] = useState<ExtendedColumnKey[]>(['name']);

  // RESIZING STATE
  const [colWidths, setColWidths] = useState<Record<ExtendedColumnKey, number>>({
      name: 220, id: 80, role: 120, cpf: 100, scale: 60, time: 80, shiftType: 100, position: 80, council: 100, bh: 60, uf: 95
  });
  const [resizing, setResizing] = useState<{ key: ExtendedColumnKey, startX: number, startWidth: number } | null>(null);

  // Selection & Focus
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{empIndex: number, day: number} | null>(null);

  const daysInMonth = useMemo(() => 
    getDaysInMonth(currentSchedule.month, currentSchedule.year), 
    [currentSchedule.month, currentSchedule.year]
  );
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // Sorting
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
            case 'time': valA = a.workTime || ''; valB = b.workTime || ''; break;
            case 'shiftType': valA = a.shiftType || ''; valB = b.shiftType || ''; break;
            case 'position': valA = a.positionNumber; valB = b.positionNumber; break;
            case 'council': valA = a.categoryCode; valB = b.categoryCode; break;
            case 'bh': valA = a.bankHoursBalance; valB = b.bankHoursBalance; break;
            case 'uf': valA = a.lastDayOff || ''; valB = b.lastDayOff || ''; break;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [employees, sortConfig]);

  // FIXED: Explicit column order to ensure consistent rendering and hiding
  const orderedKeys: ExtendedColumnKey[] = ['name', 'id', 'role', 'cpf', 'scale', 'time', 'shiftType', 'position', 'council', 'bh', 'uf'];

  // FIXED: Calculate visible columns based on ordered keys and hidden columns
  const visibleColumns = useMemo(() => {
      return orderedKeys.filter(k => !hiddenColumns.includes(k));
  }, [hiddenColumns]);

  const totalLeftWidth = visibleColumns.reduce((acc, key) => acc + colWidths[key], 0);

  const getStickyLeft = (key: ExtendedColumnKey) => {
      let offset = 0;
      for (const k of visibleColumns) {
          if (k === key) break;
          if (frozenColumns.includes(k)) {
              offset += colWidths[k];
          }
      }
      return offset;
  }

  // --- CLICK OUTSIDE TO CLEAR SELECTION & CLOSE MENU ---
  useEffect(() => {
    const handleBackgroundClick = (e: MouseEvent) => {
      // Check if click is inside grid container but NOT on a cell/row (or outside completely)
      if (gridContainerRef.current && gridContainerRef.current.contains(e.target as Node)) {
          const target = e.target as HTMLElement;
          if (target === gridContainerRef.current || target.classList.contains('roster-bg')) {
             setSelection(null);
             setFocusedCell(null);
             setContextMenu(prev => ({...prev, visible: false})); // Close Menu
          }
      } else {
          // If clicked outside grid entirely
          setContextMenu(prev => ({...prev, visible: false}));
      }
    };
    document.addEventListener('mousedown', handleBackgroundClick);
    return () => document.removeEventListener('mousedown', handleBackgroundClick);
  }, []);


  // --- RESIZING LOGIC ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!resizing) return;
        const delta = e.pageX - resizing.startX;
        setColWidths(prev => ({
            ...prev,
            [resizing.key]: Math.max(40, resizing.startWidth + delta)
        }));
    };

    const handleMouseUp = () => {
        if (resizing) {
            setResizing(null);
            document.body.style.cursor = 'default';
        }
    };

    if (resizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const handleResizeStart = (e: React.MouseEvent, key: ExtendedColumnKey) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing({ key, startX: e.pageX, startWidth: colWidths[key] });
  };


  // Selection Handlers
  const handleMouseDown = (rowIndex: number, day: number) => {
    if (isReadOnly) return;
    setIsSelecting(true);
    setSelection({ startRow: rowIndex, startCol: day, endRow: rowIndex, endCol: day });
    setFocusedCell({ empIndex: rowIndex, day });
    setContextMenu(prev => ({...prev, visible: false}));
  };

  const handleMouseEnter = (rowIndex: number, day: number) => {
    if (isSelecting && selection) {
        setSelection({ ...selection, endRow: rowIndex, endCol: day });
    }
  };

  const handleMouseUp = () => setIsSelecting(false);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isReadOnly) return;

        // --- ARROW NAVIGATION ---
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            // Check if focus is inside an input (like shiftType or uf)
            if (document.activeElement?.tagName === 'INPUT') return;
            
            e.preventDefault();
            if (!focusedCell) {
                setFocusedCell({ empIndex: 0, day: 1 });
                setSelection({ startRow: 0, startCol: 1, endRow: 0, endCol: 1 });
                return;
            }

            let { empIndex, day } = focusedCell;
            
            if (e.key === 'ArrowUp') empIndex = Math.max(0, empIndex - 1);
            if (e.key === 'ArrowDown') empIndex = Math.min(sortedEmployees.length - 1, empIndex + 1);
            if (e.key === 'ArrowLeft') day = Math.max(1, day - 1);
            if (e.key === 'ArrowRight') day = Math.min(daysInMonth, day + 1);

            setFocusedCell({ empIndex, day });
            if (e.shiftKey && selection) {
                 setSelection({ ...selection, endRow: empIndex, endCol: day });
            } else {
                 setSelection({ startRow: empIndex, startCol: day, endRow: empIndex, endCol: day });
            }
            return;
        }

        // UNDO / REDO
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); if (onUndo) onUndo(); return; }
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); if (onRedo) onRedo(); return; }

        if (!selection) return;

        // DELETE
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Check if focus is inside an input (like shiftType or uf)
            if (document.activeElement?.tagName === 'INPUT') return;

            e.preventDefault();
            const minR = Math.min(selection.startRow, selection.endRow);
            const maxR = Math.max(selection.startRow, selection.endRow);
            const minC = Math.min(selection.startCol, selection.endCol);
            const maxC = Math.max(selection.startCol, selection.endCol);

            const newAssignments = { ...currentSchedule.assignments };
            const newAttachments = { ...currentSchedule.attachments };
            const newComments = { ...currentSchedule.comments };
            
            let changed = false;
            for (let r = minR; r <= maxR; r++) {
                const emp = sortedEmployees[r];
                if (!emp) continue;
                const dateKeys = [];
                for (let c = minC; c <= maxC; c++) {
                    dateKeys.push(`${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}`);
                }
                
                if (newAssignments[emp.id]) {
                    dateKeys.forEach(k => { if(newAssignments[emp.id][k]) { delete newAssignments[emp.id][k]; changed = true; }});
                }
                if (newAttachments[emp.id]) {
                     dateKeys.forEach(k => { if(newAttachments[emp.id][k]) { delete newAttachments[emp.id][k]; changed = true; }});
                }
                 if (newComments[emp.id]) {
                     dateKeys.forEach(k => { if(newComments[emp.id][k]) { delete newComments[emp.id][k]; changed = true; }});
                }
            }
            if (changed) setSchedule(prev => ({ ...prev, assignments: newAssignments, attachments: newAttachments, comments: newComments }));
        }

        // COPY
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const startR = Math.min(selection.startRow, selection.endRow);
            const startC = Math.min(selection.startCol, selection.endCol);
            const emp = sortedEmployees[startR];
            if (!emp) return;
            const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(startC).padStart(2, '0')}`;
            const shiftId = currentSchedule.assignments[emp.id]?.[dateKey];
            if (shiftId) internalClipboard.current = shiftId;
        }

        // PASTE
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
             let shiftId = internalClipboard.current;
             if (shiftId) {
                const minR = Math.min(selection.startRow, selection.endRow);
                const maxR = Math.max(selection.startRow, selection.endRow);
                const minC = Math.min(selection.startCol, selection.endCol);
                const maxC = Math.max(selection.startCol, selection.endCol);

                const newAssignments = { ...currentSchedule.assignments };
                for (let r = minR; r <= maxR; r++) {
                    const emp = sortedEmployees[r];
                    if (!emp) continue;
                    if (!newAssignments[emp.id]) newAssignments[emp.id] = {};
                    const empSchedule = { ...newAssignments[emp.id] };
                    for (let c = minC; c <= maxC; c++) {
                        const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
                        empSchedule[dateKey] = shiftId;
                    }
                    newAssignments[emp.id] = empSchedule;
                }
                setSchedule(prev => ({ ...prev, assignments: newAssignments }));
             }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, currentSchedule, sortedEmployees, isReadOnly, focusedCell, setSchedule, onUndo, onRedo]);

  const isSelected = (rowIndex: number, day: number) => {
    if (!selection) return false;
    const minR = Math.min(selection.startRow, selection.endRow);
    const maxR = Math.max(selection.startRow, selection.endRow);
    const minC = Math.min(selection.startCol, selection.endCol);
    const maxC = Math.max(selection.startCol, selection.endCol);
    return rowIndex >= minR && rowIndex <= maxR && day >= minC && day <= maxC;
  };

  // --- STATS ---
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
              // Count if explicitly Work OR if Empty (undefined)
              const isWork = !shift || (shift.category !== 'dayoff' && shift.category !== 'absence' && shift.category !== 'leave');
              if (isWork) {
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

  // Helpers
  const getDayLabel = (day: number) => weekDays[new Date(currentSchedule.year, currentSchedule.month, day).getDay()];
  const isWeekendOrHoliday = (day: number) => {
    const dayOfWeek = new Date(currentSchedule.year, currentSchedule.month, day).getDay();
    const holidayKey = `${String(day).padStart(2, '0')}-${String(currentSchedule.month + 1).padStart(2, '0')}`;
    return dayOfWeek === 0 || dayOfWeek === 6 || HOLIDAYS[holidayKey] !== undefined;
  }
  const getHolidayName = (day: number) => HOLIDAYS[`${String(day).padStart(2, '0')}-${String(currentSchedule.month + 1).padStart(2, '0')}`];

  // --- CONTEXT MENU HANDLERS ---
  const handleCellContextMenu = (e: React.MouseEvent, employeeId: string, day: number) => {
      e.preventDefault();
      if (isReadOnly) return;
      
      const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const shiftId = currentSchedule.assignments[employeeId]?.[dateKey];
      const shift = shifts.find(s => s.id === shiftId);
      
      let assignmentType: ContextMenuState['assignmentType'] = 'other';
      if (shift?.category === 'absence' || shift?.category === 'leave') assignmentType = 'leave';

      const hasAttachment = !!currentSchedule.attachments?.[employeeId]?.[dateKey];

      setContextMenu({ visible: true, type: 'cell', x: e.pageX, y: e.pageY, employeeId, day, assignmentType, hasAttachment, isCommentMenu: false });
  };

  const handleHeaderContextMenu = (e: React.MouseEvent, key: ExtendedColumnKey) => {
      e.preventDefault();
      setContextMenu({ visible: true, type: 'header', x: e.pageX, y: e.pageY, columnKey: key });
  };

  const handleAttachFile = () => {
      if(contextMenu.employeeId && contextMenu.day) {
          attachmentTarget.current = { employeeId: contextMenu.employeeId, day: contextMenu.day };
          fileInputRef.current?.click();
      }
      setContextMenu(prev => ({...prev, visible: false}));
  };
  
  const handleAddComment = (comment: string) => {
      if (contextMenu.employeeId && contextMenu.day) {
          const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`;
          setSchedule(prev => ({
              ...prev,
              comments: {
                  ...prev.comments,
                  [contextMenu.employeeId!]: {
                      ...(prev.comments?.[contextMenu.employeeId!] || {}),
                      [dateKey]: comment
                  }
              }
          }));
      }
      setContextMenu(prev => ({...prev, visible: false, isCommentMenu: false}));
  }

  const handleDownloadAttachment = () => {
     if(contextMenu.employeeId && contextMenu.day) {
        const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`;
        const attachment = currentSchedule.attachments?.[contextMenu.employeeId]?.[dateKey];
        
        if (attachment) {
            const link = document.createElement("a");
            link.href = attachment.data;
            link.download = attachment.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
     }
     setContextMenu(prev => ({...prev, visible: false}));
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && attachmentTarget.current) {
          const file = e.target.files[0];
          const { employeeId, day } = attachmentTarget.current;
          const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const reader = new FileReader();
          reader.onload = (event) => {
             const base64Data = event.target?.result as string;
             if (base64Data) {
                setSchedule(prev => ({
                    ...prev,
                    attachments: {
                        ...prev.attachments,
                        [employeeId]: {
                            ...(prev.attachments?.[employeeId] || {}),
                            [dateKey]: { name: file.name, data: base64Data }
                        }
                    }
                }));
             }
          };
          reader.readAsDataURL(file);
      }
      if (e.target) e.target.value = '';
  };

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
          // Clear attachment
          const newAttachments = { ...(currentSchedule.attachments?.[contextMenu.employeeId!] || {}) };
          if(newAttachments[dateKey]) delete newAttachments[dateKey];
          // Clear comment
          const newComments = { ...(currentSchedule.comments?.[contextMenu.employeeId!] || {}) };
          if(newComments[dateKey]) delete newComments[dateKey];
          
          setSchedule(prev => ({ 
              ...prev, 
              assignments: { ...prev.assignments, [contextMenu.employeeId!]: newAssignments },
              attachments: { ...prev.attachments, [contextMenu.employeeId!]: newAttachments },
              comments: { ...prev.comments, [contextMenu.employeeId!]: newComments }
          }));
       }
       setContextMenu(prev => ({ ...prev, visible: false }));
  }

  // Row Drag
  const handleDragStart = (e: React.DragEvent, id: string) => { if (isReadOnly) return; setDraggedEmployeeId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e: React.DragEvent, targetId: string) => { e.preventDefault(); if (isReadOnly) return; if (draggedEmployeeId && draggedEmployeeId !== targetId && onReorderEmployees) { onReorderEmployees(draggedEmployeeId, targetId); } setDraggedEmployeeId(null); };

  const labelMap: Record<ExtendedColumnKey, string> = { 
      name: 'NOME COLABORADOR', id: 'ID', role: 'CARGO', cpf: 'CPF', 
      scale: 'ESCALA', time: 'HORÁRIO', shiftType: 'TURNO', position: 'Nº POSIÇÃO', council: 'REG. CONSELHO', bh: 'BH', uf: 'UF' 
  };

  return (
    <div ref={gridContainerRef} className="roster-bg bg-white rounded shadow-sm border border-slate-300 flex flex-col h-full w-full overflow-auto select-none relative print:border-none print:shadow-none" onMouseUp={handleMouseUp}>
      {hiddenColumns.length > 0 && (
          <button 
            onClick={() => setHiddenColumns([])} 
            title="Restaurar Colunas"
            className="absolute top-1 left-1 z-[70] bg-blue-100 text-blue-700 p-1.5 rounded-full shadow hover:bg-blue-200 print:hidden transition-all w-fit h-fit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </button>
      )}
      
      {/* Hidden File Input for Attachments */}
      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        accept=".png,.jpg,.jpeg,.pdf" 
        onChange={handleFileSelected} 
      />

      {contextMenu.visible && (
          <div ref={menuRef} className="fixed z-[100] bg-white shadow-xl rounded-lg border border-slate-200 py-1 min-w-[180px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
              {contextMenu.type === 'header' ? (
                  <>
                    <button onClick={() => { if(contextMenu.columnKey) { setFrozenColumns(prev => prev.includes(contextMenu.columnKey as any) ? prev.filter(k=>k!==contextMenu.columnKey) : [...prev, contextMenu.columnKey as any]); setContextMenu(prev=>({...prev, visible:false})); }}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700">Congelar/Descongelar</button>
                    <button onClick={() => { if(contextMenu.columnKey) setHiddenColumns(prev => [...prev, contextMenu.columnKey as ExtendedColumnKey]); setContextMenu(prev => ({...prev, visible:false}))}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-red-600 font-bold border-t">Ocultar Coluna</button>
                    {hiddenColumns.length > 0 && <button onClick={() => { setHiddenColumns([]); setContextMenu(prev=>({...prev, visible:false})); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-blue-600 font-bold border-t">Mostrar Todas</button>}
                  </>
              ) : contextMenu.isCommentMenu ? (
                  <>
                      <button onClick={() => setContextMenu(prev => ({...prev, isCommentMenu: false}))} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-500 border-b">◄ Voltar</button>
                      {COMMENTS_OPTIONS.map(opt => (
                           <button key={opt} onClick={() => handleAddComment(opt)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs font-bold text-slate-700">{opt}</button>
                      ))}
                  </>
              ) : (
                  <>
                    {contextMenu.assignmentType === 'leave' && (
                        <button onClick={handleAttachFile} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs font-bold text-blue-700 border-b flex items-center gap-2">📎 Anexar Arquivo</button>
                    )}
                    {contextMenu.hasAttachment && (
                        <button onClick={handleDownloadAttachment} className="w-full text-left px-4 py-2 hover:bg-green-50 text-xs font-bold text-green-700 border-b flex items-center gap-2">📥 Baixar Anexo</button>
                    )}
                    <button onClick={() => setContextMenu(prev => ({...prev, isCommentMenu: true}))} className="w-full text-left px-4 py-2 hover:bg-orange-50 text-xs font-bold text-orange-700 border-b flex items-center gap-2">💬 Adicionar Observação</button>
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

      {/* HEADER */}
      <div className="flex bg-company-blue text-white z-40 shadow-md w-fit sticky top-0">
        <div className="flex-shrink-0 flex border-r border-blue-800 bg-company-blue z-40">
            {visibleColumns.map((key) => {
                const isFrozen = frozenColumns.includes(key);
                const left = getStickyLeft(key);
                return (
                <div key={key} style={{ width: colWidths[key], position: isFrozen ? 'sticky' : 'relative', left: isFrozen ? left : 'auto', zIndex: isFrozen ? 50 : 'auto' }} onClick={() => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))} onContextMenu={(e) => handleHeaderContextMenu(e, key)} className={`relative p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer hover:bg-blue-900 group ${isFrozen ? 'bg-company-blue shadow-[2px_0_5px_rgba(0,0,0,0.2)]' : ''}`}>
                    {labelMap[key]} {sortConfig.key === key && <span className="ml-1 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                    {/* RESIZER HANDLE */}
                    <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-50 group-hover:bg-blue-600/50"
                        onMouseDown={(e) => handleResizeStart(e, key)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )})}
        </div>
        <div className="flex min-w-max">
            {daysArray.map(day => (
                <div key={day} className={`w-8 flex flex-col items-center justify-center border-r border-blue-800 ${isWeekendOrHoliday(day) ? 'bg-sky-500/30' : ''}`} title={getHolidayName(day)}>
                    <span className="text-[9px] font-medium opacity-80 uppercase">{getDayLabel(day).substring(0, 1)}</span>
                    <span className="text-[10px] font-bold">{String(day).padStart(2, '0')}</span>
                </div>
            ))}
             <div className="w-16 flex-shrink-0 p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center bg-company-blue">FOLGAS</div>
             <div className="w-10 flex-shrink-0 p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center bg-company-blue">ST</div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-col min-w-max">
        {sortedEmployees.map((employee, rowIndex) => {
        const validation = validateSchedule(employee.id, currentSchedule, shifts, rules, employees);
        // Stats
        let daysOffCount = 0;
        Object.values(currentSchedule.assignments[employee.id] || {}).forEach(sid => { if (shifts.find(s=>s.id===sid)?.category === 'dayoff') daysOffCount++; });

        return (
            <div key={employee.id} className="flex border-b border-slate-300 bg-white hover:bg-blue-50 transition-colors group h-9">
                {/* Left Cols */}
                <div draggable={!isReadOnly} onDragStart={(e) => handleDragStart(e, employee.id)} onDrop={(e) => handleDrop(e, employee.id)} className="flex-shrink-0 flex border-r border-slate-300 bg-white z-10 group-hover:bg-blue-50 cursor-move">
                    {visibleColumns.map(key => {
                        let val = key === 'scale' ? employee.shiftPattern : key === 'time' ? employee.workTime : key === 'position' ? employee.positionNumber : key === 'council' ? employee.categoryCode : key === 'bh' ? employee.bankHoursBalance : key === 'uf' ? employee.lastDayOff : (employee as any)[key];
                        
                        let displayVal = val;
                        // FORMAT DATE FOR UF (dd/mm/yy)
                        if (key === 'uf' && val) {
                             const [year, month, day] = val.split('-');
                             if (year && month && day) {
                                 displayVal = `${day}/${month}/${year.slice(-2)}`;
                             }
                        }

                        const colorClass = key === 'bh' ? (val && val.startsWith('-') ? 'text-red-600' : 'text-green-600 font-bold') : 'text-slate-500';
                        const isFrozen = frozenColumns.includes(key); const left = getStickyLeft(key);
                        
                        const isShiftType = key === 'shiftType';
                        const isUf = key === 'uf';
                        const canEditCell = !isReadOnly && (isShiftType || isUf);

                        return (
                            <div key={key} style={{ width: colWidths[key], position: isFrozen ? 'sticky' : 'relative', left: isFrozen ? left : 'auto', zIndex: isFrozen ? 30 : 'auto' }} className={`flex items-center px-2 border-r border-slate-100 overflow-hidden bg-white group-hover:bg-blue-50 ${isFrozen ? 'shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''}`}>
                                {canEditCell ? (
                                    <input 
                                        type={isUf ? "date" : "text"}
                                        className={`w-full bg-transparent border-none text-[10px] uppercase font-medium focus:ring-1 focus:ring-blue-500 rounded px-1 min-w-0 h-full ${isUf ? 'cursor-text' : ''}`}
                                        value={val || ''}
                                        onChange={(e) => {
                                             if (onUpdateEmployee) {
                                                 onUpdateEmployee(employee.id, key === 'shiftType' ? 'shiftType' : 'lastDayOff', e.target.value);
                                             }
                                        }}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === 'Enter') e.currentTarget.blur();
                                        }}
                                    />
                                ) : (
                                    <span className={`text-[9px] truncate uppercase font-medium ${colorClass}`} title={val}>
                                        {displayVal}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
                {/* Grid */}
                <div className="flex">
                    {daysArray.map(day => {
                        const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const shiftId = currentSchedule.assignments[employee.id]?.[dateKey];
                        const shift = shifts.find(s => s.id === shiftId);
                        const isOff = isWeekendOrHoliday(day);
                        const selected = isSelected(rowIndex, day);
                        const attachment = currentSchedule.attachments?.[employee.id]?.[dateKey];
                        const comment = currentSchedule.comments?.[employee.id]?.[dateKey];

                        return (
                            <div key={day} onMouseDown={() => handleMouseDown(rowIndex, day)} onMouseEnter={() => handleMouseEnter(rowIndex, day)} onContextMenu={(e) => handleCellContextMenu(e, employee.id, day)}
                                className={`w-8 h-full border-r border-slate-300 flex items-center justify-center text-[10px] font-bold select-none relative
                                    ${!shift && isOff ? 'bg-sky-50' : ''} ${shift ? shift.color : 'bg-transparent'} ${shift?.textColor ? shift.textColor : 'text-slate-700'}
                                    ${selected ? 'ring-2 ring-inset ring-blue-600 bg-blue-100/50' : ''} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}
                                `}>
                                {shift ? shift.code : ''}
                                {attachment && <Tooltip content={`Anexo: ${attachment.name}`}><span className="absolute top-0 right-0 text-[8px] cursor-help">📎</span></Tooltip>}
                                {comment && <Tooltip content={`Obs: ${comment}`}><span className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-orange-500"></span></Tooltip>}
                            </div>
                        );
                    })}
                     <div className="w-16 flex-shrink-0 border-r border-slate-300 flex items-center justify-center text-[10px] bg-slate-50 font-bold text-slate-700">{daysOffCount}</div>
                     <div className="w-10 flex-shrink-0 border-r border-slate-300 flex items-center justify-center bg-slate-50 relative group/st">
                        {validation.valid ? <span className="text-green-500 font-bold">✔</span> : (
                            <div className="relative flex justify-center w-full h-full items-center">
                                <span className="text-red-500 font-bold cursor-help text-xs">⚠</span>
                                {/* CUSTOM TOOLTIP FOR ST: Wider, Right-Aligned, White-space Pre-line */}
                                <div className="absolute top-full right-0 mt-1 hidden group-hover/st:block z-[100] w-72 bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl whitespace-pre-line text-left border border-gray-700">
                                    {validation.messages.join('\n')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
        })}
      </div>
      
      {/* FOOTER */}
      <div className="bg-slate-50 border-t border-slate-300 shadow-inner flex shrink-0 print:hidden w-fit sticky bottom-0 z-40" ref={footerScrollRef}>
          <div className="flex h-10 border-b border-slate-200 w-full">
             <div className="flex-shrink-0 flex items-center justify-end px-2 font-bold text-[10px] text-slate-700 uppercase bg-slate-100 border-r border-slate-300 sticky left-0 z-40" style={{ width: totalLeftWidth }}>Total Ativos / Ideal</div>
             <div className="flex min-w-max"> 
                 {dailyStats.map(stat => {
                     const values = Object.values(stat.roleIdeals) as number[];
                     const globalIdeal = values.reduce((a, b) => a + b, 0);
                     const isDeficit = stat.totalActive < globalIdeal;
                     return (<div key={stat.day} className="w-8 flex flex-col items-center justify-center border-r border-slate-200 text-[9px]"><span className={`font-bold ${isDeficit ? 'text-red-600' : 'text-slate-800'}`}>{stat.totalActive}</span></div>)
                 })}
                 <div className="w-16 border-r border-slate-200 bg-slate-100"></div><div className="w-10 border-r border-slate-200 bg-slate-100"></div>
             </div>
          </div>
      </div>
    </div>
  );
};
