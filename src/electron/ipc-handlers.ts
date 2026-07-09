import { ipcMain, BrowserWindow, nativeImage, screen, Notification } from 'electron';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { captureScreen } from './screenshot';
import {
  saveAnalysis,
  getAnalyses,
  deleteAnalysis,
  clearAnalyses,
  analyzeScreenshotDB,
} from './database';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'fl-studio-advisor-desktop',
    },
  },
});

let mainWindow: BrowserWindow | null = null;

export function registerIpcHandlers(window: BrowserWindow | null) {
  mainWindow = window;

  // Screenshot capture
  ipcMain.handle('capture-screenshot', async (event, { displayId }) => {
    try {
      const screenshot = await captureScreen(displayId);
      return { success: true, data: screenshot };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Analyze screenshot
  ipcMain.handle('analyze-screenshot', async (event, { imageBase64, mimeType, customNotes }) => {
    try {
      if (!imageBase64) {
        throw new Error('Image base64 is required');
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: imageBase64,
        },
      };

      const textPart = {
        text: `Analiza esta captura de pantalla de FL Studio o la configuración de audio del sistema de un productor musical. 
Identifica problemas de recursos, cuellos de botella de CPU/RAM, búfer (Buffer length), tasa de muestreo (Sample rate), driver de audio (Primary vs ASIO), y opciones clave como Smart Disable, Multithreading, y planes de energía.

Notas adicionales del usuario: "${customNotes || 'Ninguna proporcionada'}"

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
  "bufferSize": 256,
  "sampleRateHz": 44100,
  "driverDetected": "Nombre del driver o null",
  "estimatedCpuSavingPct": 25,
  "latencyMs": 12.5,
  "commands": [
    {
      "title": "Nombre de la optimización",
      "description": "Qué hace este comando",
      "os": "windows" o "macos" o "all",
      "scriptCode": "Comando ejecutable real",
      "explanation": "Breve explicación de cómo ejecutarlo"
    }
  ],
  "explanation": "Resumen detallado del diagnóstico en Markdown"
}`,
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['detectedIssues', 'estimatedCpuSavingPct', 'explanation', 'commands'],
            properties: {
              detectedIssues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['title', 'severity', 'description', 'recommendation'],
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
                items: {
                  type: Type.OBJECT,
                  required: ['title', 'description', 'os', 'scriptCode', 'explanation'],
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    os: { type: Type.STRING },
                    scriptCode: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
              explanation: { type: Type.STRING },
            },
          },
        },
      });

      const analysisResult = JSON.parse(response.text || '{}');
      
      // Save to database
      const savedAnalysis = saveAnalysis({
        imageBase64,
        mimeType,
        customNotes,
        analysisResults: JSON.stringify(analysisResult),
        timestamp: new Date().toISOString(),
      });

      // Show notification
      new Notification({
        title: '✅ Análisis completado',
        body: `Se encontraron ${analysisResult.detectedIssues?.length || 0} problemas de optimización`,
      }).show();

      return { success: true, data: analysisResult, savedId: savedAnalysis };
    } catch (error: any) {
      new Notification({
        title: '❌ Error en el análisis',
        body: error.message,
      }).show();
      return { success: false, error: error.message };
    }
  });

  // Chat
  ipcMain.handle('chat', async (event, { message, history }) => {
    try {
      if (!message) {
        throw new Error('Message is required');
      }

      const chatConfig = {
        systemInstruction: `Eres un Asesor de Rendimiento de FL Studio y de Optimización de Audio para PC/Mac.
Tu objetivo es guiar al productor musical para que su DAW funcione sin cortes (underruns), clicks, popping o lags.
Responde de manera profesional, amigable y muy práctica.
Explica conceptos como buffer size, drivers ASIO, DPC Latency, Smart Disable, y planes de energía.
Ofrece instrucciones exactas paso a paso.
Siempre habla en Español.`,
      };

      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: chatConfig,
      });

      return { success: true, text: response.text || 'No se pudo generar respuesta' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Database handlers
  ipcMain.handle('save-analysis', (event, data) => {
    try {
      const id = saveAnalysis(data);
      return { success: true, id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-analyses', (event, { limit }) => {
    try {
      const analyses = getAnalyses(limit);
      return { success: true, data: analyses };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-analysis', (event, { id }) => {
    try {
      deleteAnalysis(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clear-analyses', () => {
    try {
      clearAnalyses();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Theme handlers
  ipcMain.handle('get-theme', () => {
    try {
      const theme = localStorage?.getItem('theme') || 'system';
      return { success: true, theme };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('set-theme', (event, { theme }) => {
    try {
      if (mainWindow) {
        mainWindow.webContents.send('theme-changed', { theme });
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // System info
  ipcMain.handle('get-system-info', () => {
    try {
      const displays = screen.getAllDisplays();
      return {
        success: true,
        data: {
          displays: displays.map((d) => ({
            id: d.id,
            bounds: d.bounds,
            workArea: d.workArea,
            scaleFactor: d.scaleFactor,
            isPrimary: d.bounds.x === 0 && d.bounds.y === 0,
          })),
          platform: process.platform,
          arch: process.arch,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Notifications
  ipcMain.handle('show-notification', (event, { title, options }) => {
    try {
      const notification = new Notification({ title, ...options });
      notification.show();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
