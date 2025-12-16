
import { GoogleGenAI } from "@google/genai";
import { HOLIDAYS } from "../constants.js";

// Helper para type do Schema do GenAI (Simulado em JS puro, usamos string ou objeto direto)
const SchemaType = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT'
};

export const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

export const decimalToTime = (decimalStr) => {
    if (!decimalStr) return "00:00";
    let num = typeof decimalStr === 'string' ? parseFloat(decimalStr.replace(',', '.')) : decimalStr;
    
    if (isNaN(num)) return decimalStr.toString(); // Return as is if not a number
    
    const isNegative = num < 0;
    num = Math.abs(num);
    const hours = Math.floor(num);
    const minutes = Math.round((num - hours) * 60);

    return `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Calculate initial consecutive days based on UF (Last Day Off)
const getInitialConsecutiveDays = (lastDayOff, currentMonth, currentYear) => {
    if (!lastDayOff) return 0;
    
    const lastOffDate = new Date(lastDayOff);
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    
    // Safety check: if last day off is in the future relative to month start, ignore
    if (lastOffDate >= startOfMonth) return 0;

    // Difference in time
    const diffTime = Math.abs(startOfMonth.getTime() - lastOffDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays - 1);
};

// Helper to determine if 12x36 starts with DSR or WORK on day 1
const determine12x36Start = (lastDayOffStr, currentMonth, currentYear) => {
    if (!lastDayOffStr) return 'UNKNOWN';
    // Robust parsing
    const parts = lastDayOffStr.split('-');
    if (parts.length !== 3) return 'UNKNOWN';
    
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1; // JS months are 0-based
    const d = parseInt(parts[2]);
    
    const lastOff = new Date(y, m, d);
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    
    // Normalize time to avoid timezone bugs
    lastOff.setHours(0,0,0,0);
    firstOfMonth.setHours(0,0,0,0);

    const diffTime = firstOfMonth.getTime() - lastOff.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'UNKNOWN'; 

    // Logic: 
    // If Last Day Off was yesterday (diff=1), today is WORK.
    // If Last Day Off was 2 days ago (diff=2), today is DSR (Day Off).
    // Pattern: Odd diff = WORK, Even diff = DSR.
    return (diffDays % 2 === 0) ? 'DSR' : 'WORK';
};

export const calculateRequiredDaysOff = (month, year, shiftPattern) => {
    // 12x36 Rule: Technically works 15 days, rests 15 (as DSR). Plus 1 or 2 extra Folgas.
    // For grid target purpose, let's count DSRs + 2 (approximate for fortnightly rule)
    if (shiftPattern && (shiftPattern.includes('12x36') || shiftPattern.includes('12X36'))) {
        return Math.floor(getDaysInMonth(month, year) / 2) + 2; 
    }
    
    const daysInMonth = getDaysInMonth(month, year);
    let count = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const holidayKey = `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}`;
        const isHoliday = HOLIDAYS[holidayKey] !== undefined;

        if (shiftPattern && (shiftPattern.includes('5x2') || shiftPattern.includes('5X2'))) {
            // 5x2: Saturdays, Sundays AND Holidays count as required days off
            if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) {
                count++;
            }
        } else {
            // 6x1 (Default): Sundays AND Holidays count
            // Note: If holiday falls on Sunday, it's just 1 day off (logic handles this as else-if usually, but here OR covers it)
            if (dayOfWeek === 0 || isHoliday) {
                count++;
            }
        }
    }
    
    return count;
};

export const validateSchedule = (
  employeeId,
  schedule,
  shifts,
  rules,
  employees
) => {
  const messages = [];
  const assignments = schedule.assignments[employeeId] || {};
  const daysInMonth = getDaysInMonth(schedule.month, schedule.year);
  
  const maxConsecutive = rules?.maxConsecutiveDays || 6;
  
  // Find employee to get UF
  const emp = employees?.find(e => e.id === employeeId);
  let consecutiveWorkDays = getInitialConsecutiveDays(emp?.lastDayOff, schedule.month, schedule.year);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${schedule.year}-${String(schedule.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const shiftId = assignments[dateKey];
    
    const shift = shifts.find(s => s.id === shiftId);
    
    // If it's a generated 'F' or 'DSR', reset counter.
    if (shift && shift.isDayOff) {
      consecutiveWorkDays = 0;
    } else if (shift && !shift.isDayOff) {
      // Explicit work shift
      consecutiveWorkDays++;
    } else {
        // Empty cell logic treated as work day for calculation safety if strict
        consecutiveWorkDays++;
    }

    if (consecutiveWorkDays > maxConsecutive) {
      messages.push(`CLT: Mais de ${maxConsecutive} dias consecutivos (Dia ${day}).`);
      consecutiveWorkDays = 0; 
    }
  }

  return { valid: messages.length === 0, messages };
};

const BATCH_SIZE = 15; // Process 15 employees at a time to avoid token limits

export const generateAISchedule = async (
  employees,
  shifts,
  month,
  year,
  rules,
  onProgress
) => {
  try {
    const apiKey = "AIzaSyDPYom8PC1Xb6mc7N9ixyGh1_lXOAnASpA"; // Nota: Use sua chave real ou variável de ambiente se possível, hardcoded aqui por ser estático
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const daysInMonth = getDaysInMonth(month, year);
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

    // Find shift IDs
    const folgaShift = shifts.find(s => s.code === 'F');
    const folgaId = folgaShift ? folgaShift.id : 'folga';
    const dsrShift = shifts.find(s => s.code === 'DSR');
    const dsrId = dsrShift ? dsrShift.id : 'dsr'; // Fallback if DSR code changed

    let combinedAssignments = {};
    const totalEmployees = employees.length;

    // Process in batches
    for (let i = 0; i < totalEmployees; i += BATCH_SIZE) {
        const batch = employees.slice(i, i + BATCH_SIZE);
        
        // Notify progress
        if (onProgress) {
            onProgress(i, totalEmployees);
        }

        const prompt = `
          Atue como especialista em escalas de trabalho.
          Gere os dias de FOLGA ("${folgaId}") e DESCANSO ("${dsrId}") para o período ${startDate} a ${endDate}.
          
          IMPORTANTE: Retorne APENAS os dias que NÃO são trabalho (F ou DSR). Os dias de trabalho devem ficar vazios (null).

          REGRAS GERAIS:
          1. Considere os dados fornecidos para cada colaborador individualmente.
          
          REGRAS POR TIPO DE ESCALA:
          
          [ESCALA 12x36]
          - Esta escala é a MAIS IMPORTANTE. Deve ser preenchida RIGOROSAMENTE.
          - O sistema calculou o campo 'patternStart' para cada colaborador.
          - Se patternStart for 'DSR': O Dia 01 do mês é DESCANSO ("${dsrId}"). O Dia 02 é Trabalho (Vazio). O Dia 03 é DESCANSO ("${dsrId}"), etc.
          - Se patternStart for 'WORK': O Dia 01 do mês é Trabalho (Vazio). O Dia 02 é DESCANSO ("${dsrId}"). O Dia 03 é Trabalho (Vazio), etc.
          - Se patternStart for 'UNKNOWN': Assuma Trabalho no dia 01 e Descanso no dia 02.
          - OBRIGATÓRIO: Todos os dias de descanso padrão da alternância 1x1 DEVEM ser preenchidos com "${dsrId}". Não deixe vazio.
          - FOLGA EXTRA: Além do padrão 1x1, insira 1 folga extra ("${folgaId}") a cada quinzena, substituindo um dia que seria de trabalho.
          
          [ESCALA 6x1]
          - Trabalha 6, Folga 1.
          - Quantidade de Folgas = Domingos + Feriados.
          - Use "${folgaId}" para todas as folgas.
          - Mulheres: Priorizar folga quinzenal aos domingos.
          - Homens: Priorizar folga a cada 3 domingos.
          - Limite: ${rules.maxConsecutiveDays} dias consecutivos de trabalho.

          [ESCALA 5x2]
          - Use "${folgaId}" para as 2 folgas semanais e feriados.

          DADOS DOS COLABORADORES (Lote ${Math.floor(i / BATCH_SIZE) + 1}):
          ${JSON.stringify(batch.map(e => ({ 
              id: e.id, 
              pattern: e.shiftPattern,
              gender: e.gender,
              lastDayOff: e.lastDayOff,
              // Explicitly calculate start state for 12x36 to remove ambiguity for AI
              patternStart12x36: determine12x36Start(e.lastDayOff, month, year),
              initialConsecutiveDays: getInitialConsecutiveDays(e.lastDayOff, month, year)
          })))}

          Retorne JSON estrito com array de 'schedules' contendo 'employeeId' e 'days' (array de {date, shiftId}).
        `;

        try {
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: SchemaType.OBJECT,
                  properties: {
                     schedules: {
                        type: SchemaType.ARRAY,
                        items: {
                           type: SchemaType.OBJECT,
                           properties: {
                              employeeId: { type: SchemaType.STRING },
                              days: {
                                 type: SchemaType.ARRAY,
                                 items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                       date: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
                                       shiftId: { type: SchemaType.STRING }
                                    },
                                    required: ["date", "shiftId"]
                                 }
                              }
                           },
                           required: ["employeeId", "days"]
                        }
                     }
                  },
                  required: ["schedules"]
                }
              }
            });

            const json = JSON.parse(response.text);
            
            if (json.schedules && Array.isArray(json.schedules)) {
                json.schedules.forEach((sch) => {
                    const empMap = {};
                    if (sch.days && Array.isArray(sch.days)) {
                        sch.days.forEach((d) => {
                            if (d.date && d.shiftId) {
                                empMap[d.date] = d.shiftId;
                            }
                        });
                    }
                    combinedAssignments[sch.employeeId] = empMap;
                });
            }
        } catch (batchError) {
            console.error(`Erro no lote ${i} a ${i + BATCH_SIZE}:`, batchError);
        }
    }

    if (onProgress) onProgress(totalEmployees, totalEmployees);
    return combinedAssignments;

  } catch (error) {
    console.error("Erro fatal ao gerar escala com IA:", error);
    return null;
  }
};
