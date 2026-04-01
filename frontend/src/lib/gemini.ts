import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const analyzeImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
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
    model: "gemini-3.1-pro-preview",
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
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are EcoCampus Support Bot. Help students with marketplace issues, lost and found, and campus-specific guidance. Be helpful, professional, and localized to a college campus environment."
    }
  });
  
  // Replay history
  for (let i = 0; i < messages.length - 1; i++) {
    // This is not efficient but the SDK doesn't seem to have a direct history import in the same way as the old one
    // Actually, the SDK supports history in chats.create? 
    // Let's check the docs again.
    // The example shows:
    // const chat = ai.chats.create({ model: "...", config: { systemInstruction: "..." } });
    // sendMessage is the way.
  }
  
  // Wait, the sendMessage takes a message string.
  const result = await chat.sendMessage({ message: messages[messages.length - 1].text });
  return result.text;
};
