
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, Shift, MonthlySchedule, AIRulesConfig } from "../types";

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
    
    // Days worked = Total Days - 1 (the day off itself)
    // Example: Off on 28th. Month starts 1st (30 day prev month). 29(1), 30(2). Start with 2.
    // diffDays includes the 1st. So if 28th off, diff is 29, 30, 1st = 3 days apart.
    // Consecutive worked before 1st = 29, 30. = 2 days.
    return Math.max(0, diffDays - 1);
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
    
    // If it's a generated 'F', reset counter.
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

    // Find the shift ID for "Folga"
    const folgaShift = shifts.find(s => s.code === 'F');
    const folgaId = folgaShift ? folgaShift.id : 'folga';

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
          Atue como especialista em escalas de trabalho CLT e Compliance Trabalhista.
          Gere APENAS os dias de FOLGA ("${folgaId}") para o período ${startDate} a ${endDate}.
          Preencha APENAS quando o colaborador DEVE folgar. Deixe dias de trabalho vazios.

          REGRAS RÍGIDAS (NÃO VIOLE):
          1. Máximo de dias de trabalho consecutivos: ${rules.maxConsecutiveDays}.
          2. Frequência de Folga aos Domingos: Pelo menos 1 domingo a cada ${rules.sundayOffFrequency} semanas.
          3. DOBRADINHAS (Folgas Consecutivas): ${rules.preferConsecutiveDaysOff ? 'MUITO IMPORTANTE: Priorize agrupar folgas (ex: Sábado+Domingo, Domingo+Segunda) sempre que a escala permitir.' : 'NÃO é prioridade.'}
          4. Preferência por Domingo: ${rules.preferSundayOff ? 'SIM, priorize domingos.' : 'NÃO priorize domingos.'}.
          5. FOLGAS EXTRAS (Banco de Horas): ${rules.allowExtraDaysOff ? `SIM. Você PODE gerar até ${rules.extraDaysOffCount} dias de folga a mais do que o padrão da escala exige para abater banco de horas.` : 'NÃO gere folgas além da regra da escala.'}

          CONTEXTO INICIAL (MUITO IMPORTANTE):
          O campo 'initialConsecutiveDays' indica quantos dias o funcionário já trabalhou consecutivos vindos do mês anterior.
          Se initialConsecutiveDays for >= 5, você DEVE dar uma folga logo no dia 01 ou 02.

          PADRÕES DE ESCALA E SIGLAS NOVAS:
          - 12x36: Trabalha 1 dia, folga o seguinte.
          - 12x60: Trabalha 1 dia, folga os próximos 2,5 dias (essencialmente folga 2 ou 3 dias alternados, ajustando média).
          - RADIO: Escala específica de radiologia (24 horas semanais, geralmente 2 plantões de 12h ou 4 de 6h). Priorize espaçamento.
          - 5x2: Trabalha 5, folga 2 (Geralmente Sáb/Dom, mas ajustável).
          - 6x1: Trabalha 6, folga 1.
          
          *** ATENÇÃO ÀS ESCALAS "REV" (REVERSO) ***
          - 6X1 REV e 5X2 REV: Significa que as folgas NÃO devem ser fixas em Sábado/Domingo. 
            Para essas escalas, distribua as folgas ALEATORIAMENTE durante a semana (Seg-Sex) ou Fim de Semana, 
            garantindo apenas que a regra de 1 Domingo a cada ${rules.sundayOffFrequency} semanas seja cumprida.

          PADRÕES DOS COLABORADORES (Lote ${Math.floor(i / BATCH_SIZE) + 1}):
          ${JSON.stringify(batch.map(e => ({ 
              id: e.id, 
              pattern: e.shiftPattern,
              initialConsecutiveDays: getInitialConsecutiveDays(e.lastDayOff, month, year)
          })))}

          Retorne JSON estrito.
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
