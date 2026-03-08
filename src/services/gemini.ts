import { GoogleGenAI, GenerateContentResponse, Modality, Type, ThinkingLevel } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

export const transcribeAudio = async (base64Audio: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav",
              data: base64Audio,
            },
          },
          { text: "Transcribe this audio accurately." },
        ],
      },
    ],
  });
  return response.text;
};

export const analyzeVideo = async (videoUrl: string, prompt: string) => {
  const ai = getAI();
  // For video analysis, we usually need to fetch the video and send it as parts
  // Or use a URL if supported. In this environment, we'll assume base64 or similar for parts.
  // For now, let's provide a structure for it.
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ parts: [{ text: `Analyze this video: ${prompt}` }] }],
  });
  return response.text;
};

export const chatWithGemini = async (message: string, history: any[] = []) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: "You are the BILAL-V Studio Assistant. You are professional, creative, and helpful. You specialize in video editing, AI art, and studio workflows.",
    },
  });
  
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const generateImage = async (prompt: string, config: { aspectRatio?: string; imageSize?: string }) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: config.aspectRatio as any || "1:1",
        imageSize: config.imageSize as any || "1K",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const searchGrounding = async (query: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
  };
};

export const mapsGrounding = async (query: string, location?: { lat: number; lng: number }) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: location ? { latitude: location.lat, longitude: location.lng } : undefined,
        },
      },
    },
  });
  return {
    text: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
  };
};
