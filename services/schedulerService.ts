
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

export const validateSchedule = (
  employeeId: string,
  schedule: MonthlySchedule,
  shifts: Shift[],
  rules?: AIRulesConfig
): { valid: boolean, messages: string[] } => {
  const messages: string[] = [];
  const assignments = schedule.assignments[employeeId] || {};
  const daysInMonth = getDaysInMonth(schedule.month, schedule.year);
  
  const maxConsecutive = rules?.maxConsecutiveDays || 6;

  let consecutiveWorkDays = 0;

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

export const generateAISchedule = async (
  employees: Employee[],
  shifts: Shift[],
  month: number,
  year: number,
  rules: AIRulesConfig
): Promise<Record<string, Record<string, string>> | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const daysInMonth = getDaysInMonth(month, year);
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

    // Find the shift ID for "Folga"
    const folgaShift = shifts.find(s => s.code === 'F');
    const folgaId = folgaShift ? folgaShift.id : 'folga';

    const prompt = `
      Atue como especialista em escalas de trabalho CLT e Compliance Trabalhista.
      Gere APENAS os dias de FOLGA ("${folgaId}") para o período ${startDate} a ${endDate}.
      Preencha APENAS quando o colaborador DEVE folgar. Deixe dias de trabalho vazios.

      REGRAS RÍGIDAS (NÃO VIOLE):
      1. Máximo de dias de trabalho consecutivos: ${rules.maxConsecutiveDays}.
      2. Frequência de Folga aos Domingos: Pelo menos 1 domingo a cada ${rules.sundayOffFrequency} semanas.
      3. DOBRADINHAS (Folgas Consecutivas): ${rules.preferConsecutiveDaysOff ? 'MUITO IMPORTANTE: Priorize agrupar folgas (ex: Sábado+Domingo, Domingo+Segunda) sempre que a escala permitir.' : 'NÃO é prioridade.'}
      4. Preferência por Domingo: ${rules.preferSundayOff ? 'SIM, priorize domingos.' : 'NÃO priorize domingos.'}.

      PADRÕES DOS COLABORADORES:
      ${JSON.stringify(employees.map(e => ({ id: e.id, pattern: e.shiftPattern })))}
      
      LÓGICA DOS PADRÕES:
      - 12x36: Trabalha 1 dia, folga o seguinte.
      - 5x2: Trabalha 5, folga 2 (Priorize Sáb/Dom).
      - 6x1: Trabalha 6, folga 1 (Cumpra a regra do Domingo!).

      Retorne JSON estrito.
    `;

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
    
    const resultAssignments: Record<string, Record<string, string>> = {};
    
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
            resultAssignments[sch.employeeId] = empMap;
        });
    }

    return resultAssignments;

  } catch (error) {
    console.error("Erro ao gerar escala com IA:", error);
    return null;
  }
};
