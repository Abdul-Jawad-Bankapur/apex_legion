import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const analyzeImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        parts: [
          { text: "Analyze this image of an academic item or lost property. Provide a title, description, and tags for a marketplace listing or lost and found report. Return as JSON." },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "description", "tags"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const calculateMeritScore = async (academicData: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        parts: [
          { text: `Analyze this academic performance data (CSV format) and calculate a 'Student Merit Score' (0-100). 
          Consider GPA, skill assessments, and consistency. 
          Return the score and a brief skill analysis.
          Data: ${academicData}` }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          analysis: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "analysis", "skills"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const chatWithGemini = async (messages: { role: string; text: string }[]) => {
  const chat = ai.chats.create({
    model: "gemini-1.5-flash",
    config: {
      systemInstruction: "You are EcoCampus Support Bot. Help students with marketplace issues, lost and found, and campus-specific guidance. Be helpful, professional, and localized to a college campus environment."
    }
  });
  
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage({ message: lastMessage.text });
  return result.text;
};
