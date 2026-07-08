import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parsing with high limit for Base64 images
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes

// Route 1: Analyze Screenshot for FL Studio Optimization
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { imageBase64, mimeType, customNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Falta la imagen base64 para el análisis." });
    }

    // Build parts for Gemini API
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: imageBase64,
      },
    };

    const textPart = {
      text: `Analiza esta captura de pantalla de FL Studio o la configuración de audio del sistema de un productor musical. 
Identifica problemas de recursos, cuellos de botella de CPU/RAM, búfer (Buffer length), tasa de muestreo (Sample rate), driver de audio (Primary vs ASIO), y opciones clave como Smart Disable, Multithreaded Processing, Triple Buffer, etc.

Notas adicionales del usuario: "${customNotes || "Ninguna proporcionada"}"

Proporciona tu análisis estrictamente en formato JSON válido.
Responde en ESPAÑOL en todos los textos de explicación.

La respuesta debe tener la siguiente estructura exacta:
{
  "detectedIssues": [
    {
      "title": "Título corto del problema",
      "severity": "low" o "medium" o "high",
      "description": "Explicación detallada de cómo afecta al rendimiento de FL Studio",
      "recommendation": "Instrucciones de cómo solucionarlo paso a paso dentro de FL Studio"
    }
  ],
  "bufferSize": 256, // número de muestras (samples) detectado o null
  "sampleRateHz": 44100, // número en Hz o null
  "driverDetected": "Nombre del driver o null si no se detecta",
  "estimatedCpuSavingPct": 25, // porcentaje de ahorro de CPU estimado (ej. 35 para 35% de mejora)
  "latencyMs": 12.5, // latencia estimada en milisegundos o null
  "commands": [
    {
      "title": "Nombre de la optimización del sistema",
      "description": "Qué hace este comando en el sistema operativo",
      "os": "windows" o "macos" o "all",
      "scriptCode": "Comando de PowerShell o terminal ejecutable real que optimiza el audio o procesador",
      "explanation": "Breve explicación de cómo ejecutarlo"
    }
  ],
  "explanation": "Resumen detallado del diagnóstico en Markdown. Elogia lo que esté bien configurado y da consejos expertos avanzados sobre FL Studio."
}`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["detectedIssues", "estimatedCpuSavingPct", "explanation", "commands"],
          properties: {
            detectedIssues: {
              type: Type.ARRAY,
              description: "Lista de problemas de rendimiento detectados",
              items: {
                type: Type.OBJECT,
                required: ["title", "severity", "description", "recommendation"],
                properties: {
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
              },
            },
            bufferSize: { type: Type.INTEGER, nullable: true },
            sampleRateHz: { type: Type.INTEGER, nullable: true },
            driverDetected: { type: Type.STRING, nullable: true },
            estimatedCpuSavingPct: { type: Type.INTEGER },
            latencyMs: { type: Type.NUMBER, nullable: true },
            commands: {
              type: Type.ARRAY,
              description: "Comandos del sistema generados para optimizar el audio o CPU de la PC",
              items: {
                type: Type.OBJECT,
                required: ["title", "description", "os", "scriptCode", "explanation"],
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  os: { type: Type.STRING },
                  scriptCode: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
              },
            },
            explanation: { type: Type.STRING, description: "Explicación Markdown general en español" },
          },
        },
      },
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: "Error al analizar la captura con Gemini: " + error.message });
  }
});

// Route 2: Chat Assistant for FL Studio Resource Optimization
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta el mensaje." });
    }

    // Standard conversational chat using gemini-3.5-flash
    const chatConfig = {
      systemInstruction: `Eres un Asesor de Rendimiento de FL Studio y de Optimización de Audio para PC/Mac.
Tu objetivo es guiar al productor musical para que su DAW funcione sin cortes (underruns), clicks, popping o lags.
Responde de manera profesional, amigable y muy práctica.
Explica conceptos como buffer size, drivers ASIO (ASIO4ALL, FL Studio ASIO, drivers propietarios), DPC Latency, Smart Disable, y planes de energía en Windows (Ultimate Performance) o macOS de manera comprensible.
Ofrece instrucciones exactas paso a paso.
Siempre habla en Español.`,
    };

    // Reconstruct history if present
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: chatConfig,
    });

    res.json({ text: response.text || "No se pudo generar respuesta." });
  } catch (error: any) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Error en el chat de asesoramiento: " + error.message });
  }
});

// Integrate Vite / Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FL Advisor Server] Corriendo en http://localhost:${PORT}`);
  });
}

startServer();
