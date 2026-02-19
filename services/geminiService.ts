import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; // In a real app, ensure this is set securely
const ai = new GoogleGenAI({ apiKey });

export const generateJobDescription = async (title: string, role: string) => {
  if (!apiKey) return "API Key missing. Please configure your environment.";
  
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Write a professional, concise job description for a ${title} in the ${role} field for a field service company. Keep it under 150 words. Format with bullet points for responsibilities.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are an HR expert for construction and field service businesses."
      }
    });

    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating content. Please try again.";
  }
};

export const analyzeScheduleConflicts = async (scheduleData: string) => {
    if (!apiKey) return "API Key missing.";
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `Here is a JSON representation of a weekly schedule: ${scheduleData}. Identify potential fatigue risks (over 8 hour shifts) or optimization opportunities.`;
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text || "No analysis available.";
    } catch (e) {
        return "Could not analyze schedule.";
    }
}