
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Employee, Shift, MonthlySchedule, AIRulesConfig, StaffingConfig, GridSelection, ExtendedColumnKey, AttachmentData } from '../types';
import { getDaysInMonth, validateSchedule, calculateRequiredDaysOff } from '../services/schedulerService';
import { Tooltip } from './Tooltip';
import { HOLIDAYS } from '../constants';

// --- PERFORMANCE CONSTANTS ---
const ROW_HEIGHT = 30; 
const BUFFER_ROWS = 15;

const OBSERVATION_OPTIONS = [
    "Horas Extras",
    "Horas Shows",
    "Cobertura",
    "Banco de Horas",
    "Declaração de Horas",
    "Atraso",
    "Saída Antecipada"
];

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
  currentUserId?: string;
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
  currentShiftId?: string; // Track current shift to preserve it when attaching
  view?: 'default' | 'observations'; // New: Control menu view
}

interface DailyStat {
  day: number;
  totalActive: number;
  roleCounts: Record<string, number>;
  roleIdeals: Record<string, number>;
}

// Pequeno ícone de calendário
const CalendarIconMini = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-500 hover:text-blue-700 cursor-pointer">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
    </svg>
);

export const RosterGrid: React.FC<Props> = ({ 
    employees, shifts, currentSchedule, setSchedule, rules, staffingConfig, 
    onReorderEmployees, onUpdateEmployee, isReadOnly = false, onUndo, onRedo, currentUserId
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, type: 'cell', x: 0, y: 0, view: 'default' });
  const menuRef = useRef<HTMLDivElement>(null);
  
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for the virtual scroll container
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAssignmentRef = useRef<{employeeId: string, day: number, shiftId: string} | null>(null);
  
  // Clipboard Ref to store Shift ID internally
  const clipboardRef = useRef<string | null>(null);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: ExtendedColumnKey | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  
  // Editing State for Left Columns (ShiftType, UF)
  const [editingLeftCell, setEditingLeftCell] = useState<{ id: string, key: ExtendedColumnKey, value: string } | null>(null);

  // --- VIRTUALIZATION STATE ---
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600); 

  // User Preferences
  const [hiddenColumns, setHiddenColumns] = useState<ExtendedColumnKey[]>([]);
  const [frozenColumns, setFrozenColumns] = useState<ExtendedColumnKey[]>(['name']); 
  const [colWidths, setColWidths] = useState<Record<ExtendedColumnKey, number>>({
      name: 220, id: 80, role: 120, cpf: 100, scale: 60, time: 80, shiftType: 110, position: 80, council: 100, bh: 60, uf: 100
  });

  // Load Prefs
  useEffect(() => {
      if (currentUserId) {
          const stored = localStorage.getItem(`USER_PREFS_${currentUserId}`);
          if (stored) {
              const prefs = JSON.parse(stored);
              if (prefs.hiddenColumns) setHiddenColumns(prefs.hiddenColumns);
              if (prefs.frozenColumns) setFrozenColumns(prefs.frozenColumns);
              if (prefs.colWidths) setColWidths(prefs.colWidths);
          }
      }
  }, [currentUserId]);

  // Save Prefs
  useEffect(() => {
      if (currentUserId) {
          localStorage.setItem(`USER_PREFS_${currentUserId}`, JSON.stringify({ hiddenColumns, frozenColumns, colWidths }));
      }
  }, [hiddenColumns, frozenColumns, colWidths, currentUserId]);

  // Grid Height Observer
  useEffect(() => {
      if (gridContainerRef.current) {
          const observer = new ResizeObserver(entries => {
             for (let entry of entries) { setContainerHeight(entry.contentRect.height); }
          });
          observer.observe(gridContainerRef.current);
          return () => observer.disconnect();
      }
  }, []);

  const [resizing, setResizing] = useState<{ key: ExtendedColumnKey, startX: number, startWidth: number } | null>(null);
  
  // SELECTION STATE
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{empIndex: number, day: number} | null>(null); // To handle Shift+Select
  const [isSelecting, setIsSelecting] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{empIndex: number, day: number} | null>(null);

  const daysInMonth = useMemo(() => getDaysInMonth(currentSchedule.month, currentSchedule.year), [currentSchedule.month, currentSchedule.year]);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // Sorting Logic
  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key) return employees;
    return [...employees].sort((a, b) => {
        let valA = ''; let valB = '';
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

  // --- VIRTUALIZATION CALCS ---
  const totalRows = sortedEmployees.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const endIndex = Math.min(totalRows, Math.floor((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS);
  
  // The subset of employees to render
  const visibleEmployees = sortedEmployees.slice(startIndex, endIndex);
  
  // Padding to simulate the full list height
  const paddingTop = startIndex * ROW_HEIGHT;
  const paddingBottom = (totalRows - endIndex) * ROW_HEIGHT;

  // Define Columns Order
  const orderedKeys: ExtendedColumnKey[] = ['name', 'id', 'role', 'cpf', 'scale', 'time', 'shiftType', 'position', 'council', 'bh', 'uf'];
  
  const visibleColumns = useMemo(() => orderedKeys.filter(k => !hiddenColumns.includes(k)), [hiddenColumns]);
  
  // Calculate Widths for Footer Separation (Frozen vs Scrollable)
  const frozenLeftWidth = useMemo(() => visibleColumns.filter(k => frozenColumns.includes(k)).reduce((acc, k) => acc + colWidths[k], 0), [visibleColumns, frozenColumns, colWidths]);
  const scrollableLeftWidth = useMemo(() => visibleColumns.filter(k => !frozenColumns.includes(k)).reduce((acc, k) => acc + colWidths[k], 0), [visibleColumns, frozenColumns, colWidths]);

  const getStickyLeft = (key: ExtendedColumnKey) => {
      let offset = 0;
      for (const k of visibleColumns) {
          if (k === key) break;
          if (frozenColumns.includes(k)) offset += colWidths[k];
      }
      return offset;
  }

  // --- KEYBOARD HANDLING ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if user is typing in an input/textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
            return;
        }

        // Undo (Ctrl+Z) / Redo (Ctrl+Y or Ctrl+Shift+Z)
        if ((e.ctrlKey || e.metaKey) && !isReadOnly) {
            if (e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    onRedo?.();
                } else {
                    onUndo?.();
                }
                return;
            }
            if (e.key.toLowerCase() === 'y') {
                e.preventDefault();
                onRedo?.();
                return;
            }
        }

        // Delete / Backspace: Clear Selected Cells
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (!selection || isReadOnly) return;
            e.preventDefault();

            setSchedule(prev => {
                const newAssignments = { ...prev.assignments };
                // const newAttachments = { ...prev.attachments };
                // const newComments = { ...prev.comments };

                for (let r = Math.min(selection.startRow, selection.endRow); r <= Math.max(selection.startRow, selection.endRow); r++) {
                    const emp = sortedEmployees[r];
                    if (!emp) continue;
                    
                    const empAssignments = { ...(newAssignments[emp.id] || {}) };
                    let changed = false;

                    for (let c = Math.min(selection.startCol, selection.endCol); c <= Math.max(selection.startCol, selection.endCol); c++) {
                        const dateKey = `${prev.year}-${String(prev.month + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
                        if (empAssignments[dateKey]) {
                            delete empAssignments[dateKey];
                            changed = true;
                        }
                    }

                    if (changed) {
                        newAssignments[emp.id] = empAssignments;
                    }
                }
                return { ...prev, assignments: newAssignments };
            });
            return;
        }

        // Copy (Ctrl+C / Meta+C)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            if (!focusedCell) return;
            const emp = sortedEmployees[focusedCell.empIndex];
            if (!emp) return;
            
            const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(focusedCell.day).padStart(2, '0')}`;
            const shiftId = currentSchedule.assignments[emp.id]?.[dateKey];
            
            if (shiftId) {
                clipboardRef.current = shiftId;
                const shift = shifts.find(s => s.id === shiftId);
                if (shift) navigator.clipboard.writeText(shift.code);
            } else {
                clipboardRef.current = null;
            }
            return;
        }

        // Paste (Ctrl+V / Meta+V)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            if (!selection || isReadOnly || !clipboardRef.current) return;
            const shiftIdToPaste = clipboardRef.current;
            e.preventDefault();

            setSchedule(prev => {
                const newAssignments = { ...prev.assignments };
                
                for (let r = Math.min(selection.startRow, selection.endRow); r <= Math.max(selection.startRow, selection.endRow); r++) {
                    const emp = sortedEmployees[r];
                    if (!emp) continue;
                    
                    const empAssignments = { ...(newAssignments[emp.id] || {}) };
                    
                    for (let c = Math.min(selection.startCol, selection.endCol); c <= Math.max(selection.startCol, selection.endCol); c++) {
                        const dateKey = `${prev.year}-${String(prev.month + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
                        empAssignments[dateKey] = shiftIdToPaste;
                    }
                    newAssignments[emp.id] = empAssignments;
                }
                return { ...prev, assignments: newAssignments };
            });
            return;
        }

        // Navigation (Arrows) + Selection (Shift)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (!focusedCell) return;
            e.preventDefault();

            let newRow = focusedCell.empIndex;
            let newDay = focusedCell.day;

            if (e.key === 'ArrowUp') newRow = Math.max(0, newRow - 1);
            if (e.key === 'ArrowDown') newRow = Math.min(sortedEmployees.length - 1, newRow + 1);
            if (e.key === 'ArrowLeft') newDay = Math.max(1, newDay - 1);
            if (e.key === 'ArrowRight') newDay = Math.min(daysInMonth, newDay + 1);

            if (newRow !== focusedCell.empIndex || newDay !== focusedCell.day) {
                setFocusedCell({ empIndex: newRow, day: newDay });
                
                if (e.shiftKey) {
                    // Shift held: Expand selection from Anchor
                    const anchor = selectionAnchor || { empIndex: focusedCell.empIndex, day: focusedCell.day };
                    if (!selectionAnchor) setSelectionAnchor(anchor);

                    setSelection({
                        startRow: Math.min(anchor.empIndex, newRow),
                        endRow: Math.max(anchor.empIndex, newRow),
                        startCol: Math.min(anchor.day, newDay),
                        endCol: Math.max(anchor.day, newDay)
                    });
                } else {
                    // No Shift: Reset selection and anchor
                    setSelection({ startRow: newRow, startCol: newDay, endRow: newRow, endCol: newDay });
                    setSelectionAnchor({ empIndex: newRow, day: newDay });
                }
                
                // Scroll Logic
                if (scrollContainerRef.current) {
                    const currentScrollTop = scrollContainerRef.current.scrollTop;
                    const rowTop = newRow * ROW_HEIGHT;
                    const rowBottom = rowTop + ROW_HEIGHT;
                    const viewHeight = containerHeight;

                    // Vertical Scroll
                    if (rowTop < currentScrollTop) {
                        scrollContainerRef.current.scrollTop = rowTop;
                    } else if (rowBottom > currentScrollTop + viewHeight) {
                        scrollContainerRef.current.scrollTop = rowBottom - viewHeight;
                    }
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [focusedCell, selection, selectionAnchor, sortedEmployees, currentSchedule, isReadOnly, daysInMonth, containerHeight, shifts, onUndo, onRedo]);


  // --- EVENTS ---
  useEffect(() => {
    const handleBackgroundClick = (e: MouseEvent) => {
      // Logic to close context menu if clicked outside
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setContextMenu(prev => ({...prev, visible: false}));
      }

      // Logic to clear selection if clicked outside the grid AND outside the menu
      const isGridClick = gridContainerRef.current && gridContainerRef.current.contains(e.target as Node);
      const isMenuClick = menuRef.current && menuRef.current.contains(e.target as Node);

      if (!isGridClick && !isMenuClick) {
          // Check if it's not a modal or button outside (simple check: if body or main container)
          setSelection(null);
          setFocusedCell(null);
          setSelectionAnchor(null);
      }

      if (gridContainerRef.current && gridContainerRef.current.contains(e.target as Node)) {
          const target = e.target as HTMLElement;
          // Close editing left cell if clicked outside
          if (!target.classList.contains('editable-cell-input')) {
              setEditingLeftCell(null);
          }
      } else {
          setEditingLeftCell(null);
      }
    };
    document.addEventListener('mousedown', handleBackgroundClick);
    return () => document.removeEventListener('mousedown', handleBackgroundClick);
  }, []); 

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!resizing) return;
        setColWidths(prev => ({ ...prev, [resizing.key]: Math.max(40, resizing.startWidth + (e.pageX - resizing.startX)) }));
    };
    const handleMouseUp = () => { if (resizing) { setResizing(null); document.body.style.cursor = 'default'; } };
    if (resizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); document.body.style.cursor = 'col-resize'; }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [resizing]);

  const handleResizeStart = (e: React.MouseEvent, key: ExtendedColumnKey) => { e.preventDefault(); e.stopPropagation(); setResizing({ key, startX: e.pageX, startWidth: colWidths[key] }); };
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

  // Interaction handlers
  const handleMouseDown = (rowIndex: number, day: number) => { 
      if (isReadOnly) return; 
      setIsSelecting(true); 
      setSelection({ startRow: rowIndex, startCol: day, endRow: rowIndex, endCol: day }); 
      setFocusedCell({ empIndex: rowIndex, day }); 
      setSelectionAnchor({ empIndex: rowIndex, day }); // Set anchor for drag/shift
      setContextMenu(prev => ({...prev, visible: false})); 
  };
  
  const handleMouseEnter = (rowIndex: number, day: number) => { 
      if (isSelecting && selectionAnchor) {
          // Drag selection logic using Anchor
          setSelection({ 
              startRow: Math.min(selectionAnchor.empIndex, rowIndex),
              endRow: Math.max(selectionAnchor.empIndex, rowIndex),
              startCol: Math.min(selectionAnchor.day, day),
              endCol: Math.max(selectionAnchor.day, day)
          });
      }
  };
  
  const handleMouseUp = () => setIsSelecting(false);

  // --- ATTACHMENT HANDLING ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const pending = pendingAssignmentRef.current;

      if (file && pending) {
          const reader = new FileReader();
          reader.onload = (evt) => {
             const base64 = evt.target?.result as string;
             const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(pending.day).padStart(2, '0')}`;
             
             setSchedule(prev => ({
                 ...prev,
                 assignments: {
                     ...prev.assignments,
                     [pending.employeeId]: {
                         ...(prev.assignments[pending.employeeId] || {}),
                         [dateKey]: pending.shiftId // Preserve the current shift ID
                     }
                 },
                 attachments: {
                     ...prev.attachments,
                     [pending.employeeId]: {
                         ...(prev.attachments?.[pending.employeeId] || {}),
                         [dateKey]: { name: file.name, data: base64 }
                     }
                 }
             }));
             pendingAssignmentRef.current = null;
          };
          reader.readAsDataURL(file);
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadAttachment = (e: React.MouseEvent, attachment: AttachmentData) => {
      e.stopPropagation(); // Prevent cell click
      const link = document.createElement("a");
      link.href = attachment.data;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- LEFT COLUMN EDITING LOGIC ---
  const handleLeftCellClick = (id: string, key: ExtendedColumnKey, currentValue: string) => {
      if (isReadOnly) return;
      if (key === 'shiftType' || key === 'uf') {
          let val = currentValue;
          if (key === 'uf' && val) {
             const [y, m, d] = val.split('-');
             if (y && m && d) val = `${d}/${m}`;
          }
          setEditingLeftCell({ id, key, value: val });
      }
  };

  const handleLeftCellSave = () => {
      if (!editingLeftCell || !onUpdateEmployee) return;
      let finalValue = editingLeftCell.value;

      if (editingLeftCell.key === 'uf') {
         if (/^\d{1,2}\/\d{1,2}$/.test(finalValue)) {
            const [d, m] = finalValue.split('/');
            finalValue = `${currentSchedule.year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
         } else if (finalValue.trim() === '') {
             finalValue = '';
         }
         onUpdateEmployee(editingLeftCell.id, 'lastDayOff', finalValue);
      } else {
         onUpdateEmployee(editingLeftCell.id, editingLeftCell.key, finalValue);
      }
      setEditingLeftCell(null);
  };

  const handleDateIconChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
      if (onUpdateEmployee) {
          onUpdateEmployee(id, 'lastDayOff', e.target.value);
      }
  };

  // Stats
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
              const isWork = !shift || (shift.category !== 'dayoff' && shift.category !== 'absence' && shift.category !== 'leave');
              if (isWork) { totalActive++; roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1; }
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

  // Context Menu Actions
  const handleCellContextMenu = (e: React.MouseEvent, employeeId: string, day: number) => { 
      e.preventDefault(); 
      if(isReadOnly) return; 
      
      const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
      const shiftId = currentSchedule.assignments[employeeId]?.[dateKey]; 
      const shift = shifts.find(s => s.id === shiftId); 
      
      let assignmentType: ContextMenuState['assignmentType'] = 'other'; 
      if (shift?.category === 'absence' || shift?.category === 'leave') assignmentType = 'leave'; 
      
      const hasAttachment = !!currentSchedule.attachments?.[employeeId]?.[dateKey]; 
      
      setContextMenu({ 
          visible: true, 
          type: 'cell', 
          x: e.pageX, 
          y: e.pageY, 
          employeeId, 
          day, 
          assignmentType, 
          hasAttachment, 
          isCommentMenu: false,
          currentShiftId: shiftId,
          view: 'default' // Reset view on open
      }); 
  };
  
  const handleSelectShift = (shiftId: string) => { 
      if (!contextMenu.employeeId || !contextMenu.day) return;

      const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`;

      // Just apply the shift and close menu. 
      // Attachments are now handled via right-click on an existing leave cell.
      setSchedule(prev => ({ 
          ...prev, 
          assignments: { 
              ...prev.assignments, 
              [contextMenu.employeeId!]: { ...(prev.assignments[contextMenu.employeeId!] || {}), [dateKey]: shiftId } 
          } 
      }));

      setContextMenu(prev => ({ ...prev, visible: false })); 
  };

  const handleAttachFromMenu = () => {
      if (contextMenu.employeeId && contextMenu.day && contextMenu.currentShiftId) {
          pendingAssignmentRef.current = {
              employeeId: contextMenu.employeeId,
              day: contextMenu.day,
              shiftId: contextMenu.currentShiftId
          };
          setContextMenu(prev => ({ ...prev, visible: false }));
          if (fileInputRef.current) fileInputRef.current.click();
      }
  };

  const handleDownloadFromMenu = () => {
      if (contextMenu.employeeId && contextMenu.day) {
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
          setContextMenu(prev => ({ ...prev, visible: false }));
      }
  };

  const handleSaveObservation = (obs: string) => {
      if (!contextMenu.employeeId || !contextMenu.day) return;
      const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`;
      
      setSchedule(prev => ({
          ...prev,
          comments: {
              ...prev.comments,
              [contextMenu.employeeId!]: {
                  ...(prev.comments?.[contextMenu.employeeId!] || {}),
                  [dateKey]: obs
              }
          }
      }));
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleClearCell = () => { 
      if (contextMenu.employeeId && contextMenu.day) { 
          const dateKey = `${currentSchedule.year}-${String(currentSchedule.month + 1).padStart(2, '0')}-${String(contextMenu.day).padStart(2, '0')}`; 
          
          const newAssignments = { ...(currentSchedule.assignments[contextMenu.employeeId!] || {}) }; 
          delete newAssignments[dateKey]; 
          
          const newAttachments = { ...(currentSchedule.attachments?.[contextMenu.employeeId!] || {}) };
          delete newAttachments[dateKey];

          const newComments = { ...(currentSchedule.comments?.[contextMenu.employeeId!] || {}) };
          delete newComments[dateKey];

          setSchedule(prev => ({ 
              ...prev, 
              assignments: { ...prev.assignments, [contextMenu.employeeId!]: newAssignments },
              attachments: { ...prev.attachments, [contextMenu.employeeId!]: newAttachments },
              comments: { ...prev.comments, [contextMenu.employeeId!]: newComments }
          })); 
      } 
      setContextMenu(prev => ({ ...prev, visible: false })); 
  }
  
  const toggleFreezeColumn = (key: ExtendedColumnKey) => { setFrozenColumns(prev => { if (prev.includes(key)) return prev.filter(k => k !== key); return [...prev, key]; }); setContextMenu(prev => ({...prev, visible: false})); };

  const isSelected = (rowIndex: number, day: number) => { if (!selection) return false; return rowIndex >= Math.min(selection.startRow, selection.endRow) && rowIndex <= Math.max(selection.startRow, selection.endRow) && day >= Math.min(selection.startCol, selection.endCol) && day <= Math.max(selection.startCol, selection.endCol); };
  const isWeekendOrHoliday = (day: number) => { const dayOfWeek = new Date(currentSchedule.year, currentSchedule.month, day).getDay(); const holidayKey = `${String(day).padStart(2, '0')}-${String(currentSchedule.month + 1).padStart(2, '0')}`; return dayOfWeek === 0 || dayOfWeek === 6 || HOLIDAYS[holidayKey] !== undefined; }
  const getDayLabel = (day: number) => weekDays[new Date(currentSchedule.year, currentSchedule.month, day).getDay()];
  const labelMap: Record<ExtendedColumnKey, string> = { name: 'NOME COLABORADOR', id: 'ID', role: 'CARGO', cpf: 'CPF', scale: 'ESCALA', time: 'HORÁRIO', shiftType: 'TURNO', position: 'Nº POSIÇÃO', council: 'REG. CONSELHO', bh: 'BH', uf: 'UF' };

  // --- RENDER ---
  return (
    <div ref={gridContainerRef} className="roster-bg bg-white rounded shadow-sm border border-slate-200 flex flex-col h-full w-full overflow-hidden select-none relative print:border-none print:shadow-none min-w-0" onMouseUp={handleMouseUp} tabIndex={0}>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      {hiddenColumns.length > 0 && <button onClick={() => setHiddenColumns([])} className="absolute top-1 left-1 z-[80] bg-blue-100 text-blue-700 p-1.5 rounded-full shadow hover:bg-blue-200 print:hidden transition-all w-fit h-fit" title="Mostrar todas colunas">👁️</button>}
      
      {/* BODY - VIRTUALIZED */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto w-full relative bg-white outline-none touch-auto" onScroll={handleScroll}>
        
        {/* HEADER */}
        <div className="flex bg-company-blue text-white z-[60] shadow-md w-fit min-w-full sticky top-0">
            <div className="flex-shrink-0 flex border-r border-blue-800 bg-company-blue z-[70]">
                {visibleColumns.map((key) => {
                    const isFrozen = frozenColumns.includes(key); const left = getStickyLeft(key);
                    return (
                    <div key={key} style={{ width: colWidths[key], position: isFrozen ? 'sticky' : 'relative', left: isFrozen ? left : 'auto', zIndex: isFrozen ? 80 : 'auto' }} onClick={() => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: true, type: 'header', x: e.pageX, y: e.pageY, columnKey: key }); }} className={`relative p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center overflow-hidden whitespace-nowrap cursor-pointer hover:bg-blue-900 group ${isFrozen ? 'bg-company-blue shadow-[2px_0_5px_rgba(0,0,0,0.2)]' : ''}`}>
                        {labelMap[key]} {sortConfig.key === key && <span className="ml-1 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-50 group-hover:bg-blue-600/50" onMouseDown={(e) => handleResizeStart(e, key)} onClick={(e) => e.stopPropagation()}/>
                    </div>
                )})}
            </div>
            <div className="flex min-w-max">
                {daysArray.map(day => (
                    <div key={day} className={`w-8 flex flex-col items-center justify-center border-r border-blue-800 ${isWeekendOrHoliday(day) ? 'bg-sky-500/30' : ''}`}><span className="text-[9px] font-medium opacity-80 uppercase">{getDayLabel(day).substring(0, 1)}</span><span className="text-[10px] font-bold">{String(day).padStart(2, '0')}</span></div>
                ))}
                <div className="w-16 flex-shrink-0 p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center bg-company-blue">FOLGAS</div>
                <div className="w-10 flex-shrink-0 p-2 font-bold text-[10px] border-r border-blue-800 flex items-center justify-center bg-company-blue">ST</div>
            </div>
        </div>

        <div style={{ height: totalRows * ROW_HEIGHT, position: 'relative' }}>
          {/* Filler top */}
          <div style={{ height: paddingTop }}></div>

          {/* Rendered Items */}
          {visibleEmployees.map((employee, idx) => {
            const rowIndex = startIndex + idx; 
            const validation = validateSchedule(employee.id, currentSchedule, shifts, rules, employees);
            let daysOffCount = 0;
            Object.values(currentSchedule.assignments[employee.id] || {}).forEach(sid => { if (shifts.find(s=>s.id===sid)?.category === 'dayoff') daysOffCount++; });
            const targetDaysOff = calculateRequiredDaysOff(currentSchedule.month, currentSchedule.year, employee.shiftPattern);
            const isExcessDaysOff = daysOffCount > targetDaysOff;

            return (
                <div key={employee.id} style={{ height: ROW_HEIGHT }} className="flex border-b border-slate-200 bg-white hover:bg-blue-50 transition-colors group w-fit min-w-full">
                    {/* Left Cols */}
                    <div className="flex-shrink-0 flex border-r border-slate-200 bg-white z-[30] group-hover:bg-blue-50">
                        {visibleColumns.map(key => {
                            let rawValue = key === 'scale' ? employee.shiftPattern : key === 'time' ? employee.workTime : key === 'position' ? employee.positionNumber : key === 'council' ? employee.categoryCode : key === 'bh' ? employee.bankHoursBalance : key === 'uf' ? employee.lastDayOff : (employee as any)[key];
                            let displayValue = rawValue;
                            if (key === 'uf' && rawValue) { 
                                const [y, m, d] = rawValue.split('-'); 
                                if (y && m && d) displayValue = `${d}/${m}`; 
                            }
                            let colorClass = 'text-slate-500';
                            if (key === 'bh') {
                                colorClass = (displayValue && displayValue.startsWith('-') ? 'text-red-600' : 'text-green-600 font-bold');
                            } else if (key === 'shiftType' || key === 'uf') {
                                colorClass = 'text-black font-bold';
                            }
                            
                            const isFrozen = frozenColumns.includes(key); const left = getStickyLeft(key);
                            const isEditing = editingLeftCell?.id === employee.id && editingLeftCell.key === key;
                            const isUF = key === 'uf';
                            const isShiftType = key === 'shiftType';
                            const canEdit = !isReadOnly && (isUF || isShiftType);

                            return (
                                <div 
                                    key={key} 
                                    style={{ width: colWidths[key], position: isFrozen ? 'sticky' : 'relative', left: isFrozen ? left : 'auto', zIndex: isFrozen ? 40 : 'auto' }} 
                                    className={`flex items-center px-2 border-r border-slate-200 overflow-hidden bg-white group-hover:bg-blue-50 ${isFrozen ? 'shadow-[2px_0_5px_rgba(0,0,0,0.05)]' : ''} ${canEdit ? 'cursor-text hover:bg-yellow-50' : ''}`}
                                    onClick={() => handleLeftCellClick(employee.id, key, rawValue)}
                                >
                                    {isEditing ? (
                                        <input 
                                            autoFocus
                                            className="w-full text-[10px] border border-blue-400 rounded px-1 py-0.5 outline-none editable-cell-input bg-white z-50 uppercase"
                                            value={editingLeftCell.value}
                                            onChange={(e) => setEditingLeftCell({...editingLeftCell, value: e.target.value})}
                                            onBlur={handleLeftCellSave}
                                            onKeyDown={(e) => { if(e.key === 'Enter') handleLeftCellSave(); }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-[9px] md:text-[10px] truncate uppercase font-medium ${colorClass}`} title={displayValue}>{displayValue}</span>
                                            {isUF && !isReadOnly && (
                                                <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="opacity-60 hover:opacity-100 transition-opacity p-1">
                                                        <CalendarIconMini />
                                                    </div>
                                                    <input 
                                                        type="date" 
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        value={rawValue || ''}
                                                        onChange={(e) => handleDateIconChange(e, employee.id)}
                                                    />
                                                </div>
                                            )}
                                        </div>
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
                                    className={`w-8 h-full border-r border-slate-200 flex items-center justify-center text-[9px] md:text-[10px] font-bold select-none relative
                                        ${!shift && isOff ? 'bg-sky-50' : ''} ${shift ? shift.color : 'bg-transparent'} ${shift?.textColor ? shift.textColor : 'text-slate-700'}
                                        ${selected ? 'ring-2 ring-inset ring-blue-600 bg-blue-100/50' : ''} ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}
                                    `}>
                                    {shift ? shift.code : ''}
                                    {attachment && (
                                        <Tooltip content={`Baixar Anexo: ${attachment.name}`}>
                                            <span onClick={(e) => handleDownloadAttachment(e, attachment)} className="absolute top-0 right-0 text-[8px] cursor-pointer hover:text-blue-600 bg-white/50 rounded z-10 p-[1px]">📎</span>
                                        </Tooltip>
                                    )}
                                    {comment && <Tooltip content={`Obs: ${comment}`}><span className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-orange-500"></span></Tooltip>}
                                </div>
                            );
                        })}
                         <div className={`w-16 flex-shrink-0 border-r border-slate-200 flex items-center justify-center text-[10px] bg-slate-50 font-bold ${isExcessDaysOff ? 'text-red-600' : 'text-slate-700'}`}>{String(daysOffCount).padStart(2, '0')}/{String(targetDaysOff).padStart(2, '0')}</div>
                         <div className="w-10 flex-shrink-0 border-r border-slate-200 flex items-center justify-center bg-slate-50 relative group/st">
                            {validation.valid ? <span className="text-green-500 font-bold">✔</span> : (<div className="relative flex justify-center w-full h-full items-center"><span className="text-red-500 font-bold cursor-help text-xs">⚠</span></div>)}
                        </div>
                    </div>
                </div>
            );
          })}
          
          {/* Filler bottom */}
          <div style={{ height: paddingBottom }}></div>
        </div>
        
        {/* FOOTER - STICKY BOTTOM */}
        <div className="flex bg-slate-50 border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] w-fit min-w-full sticky bottom-0 z-[60]">
             {/* Frozen Part - Sticky Left */}
             <div className="sticky left-0 z-[70] flex-shrink-0 flex items-center justify-end px-2 font-bold text-[9px] md:text-[10px] text-slate-700 uppercase bg-slate-100 border-r border-slate-200 border-t overflow-hidden whitespace-nowrap" style={{ width: frozenLeftWidth, display: frozenLeftWidth > 0 ? 'flex' : 'none' }}>
                Total Ativos / Ideal
             </div>
             
             {/* Scrollable Part - Moves Left */}
             <div className="flex-shrink-0 flex items-center justify-end px-2 font-bold text-[9px] md:text-[10px] text-slate-700 uppercase bg-slate-100 border-r border-slate-200 border-t overflow-hidden whitespace-nowrap" style={{ width: scrollableLeftWidth }}>
                {frozenLeftWidth === 0 && "Total Ativos / Ideal"}
             </div>

             {/* Stats - Moves Left */}
             <div className="flex min-w-max"> 
                 {dailyStats.map(stat => (<div key={stat.day} className="w-8 flex flex-col items-center justify-center border-r border-slate-200 text-[9px] h-10"><span className={`font-bold ${stat.totalActive < (Object.values(stat.roleIdeals) as number[]).reduce((a,b)=>a+b,0) ? 'text-red-600' : 'text-slate-800'}`}>{stat.totalActive}</span></div>))}
                 <div className="w-16 border-r border-slate-200 bg-slate-100"></div><div className="w-10 border-r border-slate-200 bg-slate-100"></div>
             </div>
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu.visible && (
          <div ref={menuRef} className="fixed z-[100] bg-white shadow-xl rounded-lg border border-slate-200 py-1 min-w-[180px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
              {contextMenu.type === 'header' ? (
                  <>
                      {contextMenu.columnKey && (
                        <button onClick={() => toggleFreezeColumn(contextMenu.columnKey as ExtendedColumnKey)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-700 font-bold border-b">
                            {frozenColumns.includes(contextMenu.columnKey as ExtendedColumnKey) ? 'Descongelar Coluna' : 'Congelar Coluna'}
                        </button>
                      )}
                      <button onClick={() => { if(contextMenu.columnKey) setHiddenColumns(prev => [...prev, contextMenu.columnKey as ExtendedColumnKey]); setContextMenu(prev => ({...prev, visible:false}))}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-red-600 font-bold">Ocultar Coluna</button>
                      
                      {hiddenColumns.length > 0 && (
                          <button onClick={() => { setHiddenColumns([]); setContextMenu(prev => ({...prev, visible:false}))}} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs text-blue-600 font-bold border-t">
                              Mostrar Colunas Ocultas
                          </button>
                      )}
                  </>
              ) : contextMenu.view === 'observations' ? (
                  <>
                    <button onClick={() => setContextMenu(prev => ({ ...prev, view: 'default' }))} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-500 font-bold border-b flex items-center gap-2">
                        <span>←</span> Voltar
                    </button>
                    <div className="max-h-60 overflow-y-auto">
                        {OBSERVATION_OPTIONS.map(obs => (
                            <button key={obs} onClick={() => handleSaveObservation(obs)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs text-slate-700 border-b last:border-0">
                                {obs}
                            </button>
                        ))}
                    </div>
                  </>
              ) : (
                  <>
                    {/* Attach / Download Actions based on State */}
                    {contextMenu.assignmentType === 'leave' && !contextMenu.hasAttachment && (
                        <button onClick={handleAttachFromMenu} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs text-blue-700 font-bold border-b flex items-center gap-2">
                           <span>📎</span> Anexar Arquivo
                        </button>
                    )}
                    {contextMenu.hasAttachment && (
                        <button onClick={handleDownloadFromMenu} className="w-full text-left px-4 py-2 hover:bg-green-50 text-xs text-green-700 font-bold border-b flex items-center gap-2">
                           <span>📥</span> Baixar Anexo
                        </button>
                    )}

                    <button onClick={() => setContextMenu(prev => ({ ...prev, view: 'observations' }))} className="w-full text-left px-4 py-2 hover:bg-orange-50 text-xs text-orange-700 font-bold border-b flex items-center gap-2">
                        <span>💬</span> Adicionar Observação
                    </button>

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
    </div>
  );
};
