
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, Shift, MonthlySchedule, AIRulesConfig, StaffingConfig } from "../types";
import { HOLIDAYS } from "../constants";

export const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const decimalToTime = (decimalStr: string | number): string => {
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
const getInitialConsecutiveDays = (lastDayOff: string | undefined, currentMonth: number, currentYear: number): number => {
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

export const calculateRequiredDaysOff = (month: number, year: number, shiftPattern: string): number => {
    // 12x36 Rule: Technically works 15 days, rests 15 (as DSR). Plus 1 or 2 extra Folgas.
    // For grid target purpose, let's count DSRs + 2 (approximate for fortnightly rule)
    if (shiftPattern.includes('12x36') || shiftPattern.includes('12X36')) {
        return Math.floor(getDaysInMonth(month, year) / 2) + 2; 
    }
    
    const daysInMonth = getDaysInMonth(month, year);
    let count = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const holidayKey = `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}`;
        const isHoliday = HOLIDAYS[holidayKey] !== undefined;

        if (shiftPattern.includes('5x2') || shiftPattern.includes('5X2')) {
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
  employeeId: string,
  schedule: MonthlySchedule,
  shifts: Shift[],
  rules?: AIRulesConfig,
  employees?: Employee[] // Pass employees to get UF
): { valid: boolean, messages: string[] } => {
  const messages: string[] = [];
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
  employees: Employee[],
  shifts: Shift[],
  month: number,
  year: number,
  rules: AIRulesConfig,
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, Record<string, string>> | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const daysInMonth = getDaysInMonth(month, year);
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

    // Find shift IDs
    const folgaShift = shifts.find(s => s.code === 'F');
    const folgaId = folgaShift ? folgaShift.id : 'folga';
    const dsrShift = shifts.find(s => s.code === 'DSR');
    const dsrId = dsrShift ? dsrShift.id : 'dsr';

    let combinedAssignments: Record<string, Record<string, string>> = {};
    const totalEmployees = employees.length;

    // Process in batches
    for (let i = 0; i < totalEmployees; i += BATCH_SIZE) {
        const batch = employees.slice(i, i + BATCH_SIZE);
        
        // Notify progress
        if (onProgress) {
            onProgress(i, totalEmployees);
        }

        const prompt = `
          Atue como especialista em escalas de trabalho CLT.
          Gere os dias de FOLGA ("${folgaId}") e DESCANSO ("${dsrId}") para o período ${startDate} a ${endDate}.
          
          IMPORTANTE: Retorne APENAS os dias que NÃO são trabalho (F ou DSR). Os dias de trabalho devem ficar vazios (null).

          REGRAS GERAIS:
          1. Considere 'lastDayOff' para determinar se o dia 1 do mês é trabalho ou folga (especialmente para 12x36).
          2. Não deixe todos os colaboradores do mesmo setor folgarem no mesmo dia (para escalas diárias).
          
          REGRAS POR TIPO DE ESCALA:
          
          [ESCALA 12x36]
          - ESSENCIAL: Você DEVE gerar os dias de descanso ("${dsrId}") alternados com os dias de trabalho.
          - O padrão é: Dia sim (Trabalho/Null), Dia não (Descanso/${dsrId}).
          - Verifique 'lastDayOff' para saber a sequência correta. Se lastDayOff foi o último dia do mês anterior, dia 1 é Trabalho. Se foi o penúltimo, dia 1 é DSR.
          - ALÉM do padrão 1x1, aplique a "Folga Extra Quinzenal": O colaborador precisa de 1 folga extra ("${folgaId}") a cada quinzena.
          - A folga extra ("${folgaId}") SUBSTITUI um dia que seria de trabalho na sequência.
          - Resultado visual esperado no JSON para a sequência: ... DSR | ${folgaId} | DSR ... (Onde ${folgaId} tomou o lugar de um dia de trabalho).
          - NUNCA retorne null (trabalho) para os dias que devem ser DSR. Eles precisam ser preenchidos explicitamente com "${dsrId}".
          
          [ESCALA 6x1]
          - Trabalha 6, Folga 1.
          - Quantidade de Folgas no Mês = Número de Domingos + Número de Feriados no mês.
          - Use "${folgaId}" para todas as folgas.
          - Priorize domingos para mulheres.
          - Respeite o limite de ${rules.maxConsecutiveDays} dias de trabalho seguidos.

          [ESCALA 5x2]
          - Trabalha 5, Folga 2.
          - Quantidade de Folgas no Mês = Sábados + Domingos + Feriados.
          - Use "${folgaId}" para todas as folgas.
          - Normalmente folgam Sáb e Dom, mas se necessário, distribua.

          COLABORADORES (Lote ${Math.floor(i / BATCH_SIZE) + 1}):
          ${JSON.stringify(batch.map(e => ({ 
              id: e.id, 
              pattern: e.shiftPattern,
              gender: e.gender,
              lastDayOff: e.lastDayOff,
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
                  type: Type.OBJECT,
                  properties: {
                     schedules: {
                        type: Type.ARRAY,
                        items: {
                           type: Type.OBJECT,
                           properties: {
                              employeeId: { type: Type.STRING },
                              days: {
                                 type: Type.ARRAY,
                                 items: {
                                    type: Type.OBJECT,
                                    properties: {
                                       date: { type: Type.STRING, description: "YYYY-MM-DD" },
                                       shiftId: { type: Type.STRING }
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
                json.schedules.forEach((sch: any) => {
                    const empMap: Record<string, string> = {};
                    if (sch.days && Array.isArray(sch.days)) {
                        sch.days.forEach((d: any) => {
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
