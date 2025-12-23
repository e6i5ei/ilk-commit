import { GoogleGenAI, Type } from "@google/genai";
import { UserSettings } from "../types";

// Fix: Always use named parameter and process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHydrationAdvice = async (settings: UserSettings, currentIntake: number) => {
  try {
    const remaining = Math.max(0, settings.dailyGoal - currentIntake);
    const progress = (currentIntake / settings.dailyGoal) * 100;

    const prompt = `
      Kullanıcı Bilgileri:
      İsim: ${settings.name}
      Kilo: ${settings.weight}kg
      Günlük Hedef: ${settings.dailyGoal}ml
      Şu anki tüketim: ${currentIntake}ml
      Kalan: ${remaining}ml
      İlerleme: %${progress.toFixed(0)}

      Bu bilgilere dayanarak, kullanıcıyı su içmeye teşvik edecek çok kısa, samimi ve motive edici bir Türkçe mesaj oluştur. 
      Eğer hedef çok gerisindeyse biraz daha uyarıcı, hedefe yakınsa tebrik edici olsun.
      Cevap sadece JSON formatında olsun.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            category: { 
              type: Type.STRING, 
              enum: ['motivation', 'health', 'alert'] 
            }
          },
          required: ["message", "category"]
        }
      }
    });

    // Fix: Access response.text property directly and trim whitespace before parsing
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      message: "Su içmeyi unutma, vücudun sana teşekkür edecek!",
      category: "motivation"
    };
  }
};