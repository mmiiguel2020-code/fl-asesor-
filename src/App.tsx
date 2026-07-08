/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Sliders,
  FileImage,
  Upload,
  Play,
  CheckCircle,
  AlertTriangle,
  X,
  Keyboard,
  Sparkles,
  Send,
  Terminal as TerminalIcon,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  Clock,
  Settings,
  HelpCircle,
  Maximize2,
  Download,
  FileText
} from "lucide-react";
import { generateFlStudioScreenshot } from "./canvasHelper";
import {
  AnalysisResult,
  ChatMessage,
  DetectedIssue,
  SystemCommand,
  SimulatorParams
} from "./types";

// Standard preset commands for instant optimization
const PRESET_COMMANDS: SystemCommand[] = [
  {
    title: "Activar Plan de Energía 'Máximo Rendimiento' (Ultimate Performance)",
    description: "Configura Windows para desactivar la suspensión de núcleos de CPU y fijar la frecuencia al máximo para evitar cortes de audio en FL Studio.",
    os: "windows",
    scriptCode: "powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61",
    explanation: "Copia y ejecuta este comando en PowerShell como Administrador. Si no está disponible, creará el plan de Máximo Rendimiento oculto de Windows."
  },
  {
    title: "Reiniciar Motor de Audio del Sistema",
    description: "Reinicia los servicios de audio de Windows (Audiosrv) para limpiar búferes atascados y solucionar fallos de drivers ASIO colgantes.",
    os: "windows",
    scriptCode: "Restart-Service -Name 'Audiosrv' -Force",
    explanation: "Fuerza el reinicio completo del servicio de audio de Windows. FL Studio se reconectará automáticamente al driver de audio."
  },
  {
    title: "Reiniciar CoreAudio daemon (macOS)",
    description: "Elimina y reinicia el servicio CoreAudio de macOS si experimentas cortes de sonido persistentes o latencia acumulada.",
    os: "macos",
    scriptCode: "sudo killall coreaudiod",
    explanation: "Ejecuta este comando en la Terminal de macOS. Te pedirá tu contraseña de administrador para restablecer el daemon de audio."
  },
  {
    title: "Limpieza de Memoria Standby y Caché para baja latencia",
    description: "Libera la memoria de reserva atascada por plugins VST masivos (como Kontakt o Omnisphere) que causan micro-tirones.",
    os: "all",
    scriptCode: "GC.Collect(); [System.GC]::WaitForPendingFinalizers()",
    explanation: "Comando ligero para forzar la recolección de basura del motor de memoria de servicios activos."
  }
];

// Available shortcut actions
interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  execute: () => void;
}

export default function App() {
  // Tabs: "analyzer" | "chat" | "shortcuts" | "terminal"
  const [activeTab, setActiveTab] = useState<"analyzer" | "chat" | "shortcuts" | "terminal">("analyzer");

  // 1. Simulator State
  const [simParams, setSimParams] = useState<SimulatorParams>({
    bufferSize: 256,
    sampleRate: 44100,
    driver: "FL Studio ASIO",
    smartDisable: true,
    multithreaded: true,
    tripleBuffer: false,
    vstCount: 16
  });

  const [useUploadedImage, setUseUploadedImage] = useState<boolean>(false);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [customUserNotes, setCustomUserNotes] = useState<string>("");

  // Canvas screenshot reference
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>("");

  // 2. AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<DetectedIssue | null>(null);

  // 3. Interactive Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "¡Hola! Soy tu Asesor de FL Studio. Sube una captura de tus ajustes de audio o de tu panel de rendimiento, o ajusta el simulador de la izquierda. Estoy listo para diagnosticar problemas de latencia, cortes de audio (underruns) y darte trucos avanzados.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 4. Custom Keyboard Shortcuts State
  const [shortcuts, setShortcuts] = useState<{ id: string; keys: string; actionId: string }[]>([
    { id: "s1", keys: "Control+Alt+A", actionId: "ai_analyze" },
    { id: "s2", keys: "Control+Shift+M", actionId: "clear_cache" },
    { id: "s3", keys: "Alt+T", actionId: "latency_test" },
    { id: "s4", keys: "Control+Alt+S", actionId: "toggle_smart_disable" }
  ]);
  const [isRecordingShortcutId, setIsRecordingShortcutId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [shortcutFeedback, setShortcutFeedback] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // 5. Terminal execution simulator
  const [terminalActive, setTerminalActive] = useState<boolean>(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [executingCommand, setExecutingCommand] = useState<SystemCommand | null>(null);
  const [terminalProgress, setTerminalProgress] = useState<number>(0);

  // Toast notifications for shortcut triggers
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Generate simulated screenshot whenever parameters change
  useEffect(() => {
    const dataUrl = generateFlStudioScreenshot(simParams);
    setScreenshotDataUrl(dataUrl);
  }, [simParams]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Define shortcut action map
  const shortcutActions: ShortcutAction[] = [
    {
      id: "ai_analyze",
      name: "Disparar Análisis de IA en Tiempo Real",
      description: "Toma la pantalla actual del simulador (o captura cargada) y ejecuta un diagnóstico de rendimiento con la API de Gemini.",
      execute: () => {
        setToast({
          title: "Atajo activado: Análisis de IA",
          description: "Iniciando análisis inmediato de la configuración activa..."
        });
        triggerAiAnalysis();
      }
    },
    {
      id: "clear_cache",
      name: "Vaciar RAM & Búferes del Sistema",
      description: "Libera la caché de procesos colgados para restaurar la fluidez del motor de audio de forma virtual.",
      execute: () => {
        setToast({
          title: "Atajo activado: Limpieza de RAM",
          description: "La caché de audio se ha vaciado virtualmente con éxito."
        });
        simulateCommand({
          title: "Limpieza rápida del Búfer",
          description: "Libera memoria RAM asignada a VSTs zombies.",
          os: "all",
          scriptCode: "[System.GC]::Collect();",
          explanation: "Atajo manual rápido para restaurar consistencia de RAM."
        });
      }
    },
    {
      id: "latency_test",
      name: "Ejecutar Test de Latencia DPC",
      description: "Analiza el driver seleccionado y calcula la latencia en milisegundos estimada para grabación.",
      execute: () => {
        const estLatency = (simParams.bufferSize / simParams.sampleRate) * 1000;
        setToast({
          title: "Atajo activado: Test de Latencia",
          description: `Driver: ${simParams.driver} | Latencia estimada: ${estLatency.toFixed(2)} ms`
        });
      }
    },
    {
      id: "toggle_smart_disable",
      name: "Alternar Smart Disable (Plugin Saver)",
      description: "Activa o desactiva la opción de Smart Disable global del simulador de recursos.",
      execute: () => {
        setSimParams(prev => {
          const nextVal = !prev.smartDisable;
          setToast({
            title: `Smart Disable ${nextVal ? "Activado" : "Desactivado"}`,
            description: "Actualizando el motor gráfico del panel en tiempo real."
          });
          return { ...prev, smartDisable: nextVal };
        });
      }
    }
  ];

  // Global Key Listener for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is recording a shortcut, record keys instead of triggering actions
      if (isRecordingShortcutId) {
        e.preventDefault();
        const parts: string[] = [];
        if (e.ctrlKey) parts.push("Control");
        if (e.shiftKey) parts.push("Shift");
        if (e.altKey) parts.push("Alt");
        if (e.key !== "Control" && e.key !== "Shift" && e.key !== "Alt" && e.key !== "Meta") {
          parts.push(e.key);
        }
        setRecordedKeys(parts);
        return;
      }

      // If user is typing in inputs, ignore global shortcuts
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Format pressed keys
      const pressedParts: string[] = [];
      if (e.ctrlKey) pressedParts.push("Control");
      if (e.shiftKey) pressedParts.push("Shift");
      if (e.altKey) pressedParts.push("Alt");
      if (e.key !== "Control" && e.key !== "Shift" && e.key !== "Alt" && e.key !== "Meta") {
        pressedParts.push(e.key);
      }

      const pressedStr = pressedParts.join("+");

      // Match with current shortcuts
      const matched = shortcuts.find(s => s.keys.toLowerCase() === pressedStr.toLowerCase());
      if (matched) {
        e.preventDefault();
        const action = shortcutActions.find(act => act.id === matched.actionId);
        if (action) {
          action.execute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts, isRecordingShortcutId, simParams]);

  // Handle Drag & Drop upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedImageBase64(event.target.result as string);
        setUploadedFileName(file.name);
        setUseUploadedImage(true);
        setToast({
          title: "Captura cargada",
          description: `Se procesó con éxito ${file.name}`
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  // Trigger Gemini Vision AI analysis
  const triggerAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSelectedIssue(null);

    // If using simulated canvas, we extract the base64 part
    const base64ToUse = useUploadedImage 
      ? uploadedImageBase64.split(",")[1] 
      : screenshotDataUrl.split(",")[1];

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64ToUse,
          mimeType: useUploadedImage ? "image/png" : "image/png",
          customNotes: customUserNotes
        })
      });

      if (!response.ok) {
        throw new Error("La solicitud al servidor falló");
      }

      const data = await response.json();
      setAnalysisResult(data);
      setToast({
        title: "Diagnóstico Completo",
        description: `Se detectaron ${data.detectedIssues?.length || 0} cuellos de botella para mejorar.`
      });
    } catch (error: any) {
      console.error(error);
      setToast({
        title: "Error de Análisis",
        description: "No se pudo comunicar con el asesor de inteligencia artificial."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export diagnostic results to a beautiful markdown file
  const exportAnalysisToMarkdown = () => {
    if (!analysisResult) return;

    let content = `# 🎹 REPORTES DE OPTIMIZACIÓN - FL STUDIO RESOURCE ADVISOR\n`;
    content += `Generado el: ${new Date().toLocaleString()}\n`;
    content += `Asesor virtual impulsado por Gemini 3.5 Flash\n\n`;
    
    content += `## 📊 Parámetros de Audio Detectados\n`;
    content += `- **Driver de Audio Principal:** \`${analysisResult.driverDetected || simParams.driver || "No especificado"}\`\n`;
    content += `- **Tamaño del Búfer (Buffer Length):** \`${analysisResult.bufferSize || simParams.bufferSize} samples\`\n`;
    content += `- **Tasa de Muestreo (Sample Rate):** \`${analysisResult.sampleRateHz || simParams.sampleRate} Hz\`\n`;
    content += `- **Latencia Estimada:** \`${analysisResult.latencyMs ? `${analysisResult.latencyMs.toFixed(1)} ms` : "No disponible"}\`\n`;
    content += `- **Ahorro Estimado de Procesador (CPU):** \`+${analysisResult.estimatedCpuSavingPct}%\`\n\n`;

    content += `## ⚠️ Diagnóstico de Cuellos de Botella (${analysisResult.detectedIssues.length})\n\n`;
    
    analysisResult.detectedIssues.forEach((issue, idx) => {
      content += `### ${idx + 1}. [Severidad: ${issue.severity.toUpperCase()}] ${issue.title}\n`;
      content += `- **Descripción:** ${issue.description}\n`;
      content += `- **Recomendación / Paso a Paso:** \n  ${issue.recommendation.split('\n').join('\n  ')}\n\n`;
    });

    if (analysisResult.commands && analysisResult.commands.length > 0) {
      content += `## 💻 Comandos del Sistema Sugeridos para Ejecución\n\n`;
      analysisResult.commands.forEach((cmd, idx) => {
        content += `### ${idx + 1}. ${cmd.title} [S.O. compatible: ${cmd.os.toUpperCase()}]\n`;
        content += `- **Detalle:** ${cmd.description}\n`;
        content += `- **Comando listo para copiar:**\n  \`\`\`bash\n  ${cmd.scriptCode}\n  \`\`\`\n`;
        content += `- **Modo de uso:** ${cmd.explanation}\n\n`;
      });
    }

    content += `## 🧠 Comentarios Generales de nuestro Asesor Experto\n`;
    content += `${analysisResult.explanation}\n\n`;
    content += `---\n*Documento autogenerado por el Asesor de Rendimiento FL Studio en tiempo real. Conserva esta guía para resolver picos de DSP y microcortes de audio.*`;

    // Create file blob download
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FL_Studio_Optimizado_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({
      title: "Archivo Exportado",
      description: "¡Se ha descargado el archivo Markdown (.md) con tus recomendaciones!"
    });
  };

  // Chat message sending
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsgText = chatInput;
    setChatInput("");

    // Add user message to state
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: chatMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error("Respuesta de chat fallida");
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.text || "Lo siento, no pude procesar eso.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: "Tengo problemas para conectarme al motor de IA en este momento. Inténtalo de nuevo.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Preset prompts for chat
  const handleQuickQuestion = (question: string) => {
    setChatInput(question);
  };

  // Simulate execution of a script/command in our gorgeous mock terminal
  const simulateCommand = (cmd: SystemCommand) => {
    setExecutingCommand(cmd);
    setTerminalActive(true);
    setTerminalProgress(0);
    setTerminalLines([
      `[CLIENT] Inicializando módulo de optimización del sistema...`,
      `[SISTEMA OS] Detectado entorno compatible...`,
      `[EJECUTANDO] ${cmd.scriptCode}`,
      `[CARGANDO] Aplicando políticas de prioridad del procesador para procesos multimedia...`
    ]);

    // Fast-stepped mock output
    let step = 0;
    const interval = setInterval(() => {
      step += 20;
      setTerminalProgress(step);

      if (step === 20) {
        setTerminalLines(prev => [...prev, `[KERNEL] Modificando registros de baja latencia multimedia para FL Studio.`]);
      } else if (step === 60) {
        setTerminalLines(prev => [...prev, `[DRIVER] Re-enrutando buffers de audio de alta prioridad (Thread priority class: Pro Audio).`]);
      } else if (step === 100) {
        setTerminalLines(prev => [
          ...prev,
          `[ÉXITO] Comando ejecutado de manera simulada exitosamente.`,
          `[SISTEMA] Recursos optimizados. Se redujo el riesgo de picos de CPU.`
        ]);
        clearInterval(interval);
        setToast({
          title: "Comando Ejecutado",
          description: `Se aplicó con éxito: ${cmd.title}`
        });
      }
    }, 600);
  };

  // Keyboard shortcut customization helpers
  const startRecordingShortcut = (id: string) => {
    setIsRecordingShortcutId(id);
    setRecordedKeys([]);
  };

  const saveRecordedShortcut = () => {
    if (isRecordingShortcutId && recordedKeys.length > 0) {
      const newKeysStr = recordedKeys.join("+");
      setShortcuts(prev =>
        prev.map(s => (s.id === isRecordingShortcutId ? { ...s, keys: newKeysStr } : s))
      );
      setIsRecordingShortcutId(null);
      setShortcutFeedback({
        message: `Atajo actualizado con éxito: ${newKeysStr}`,
        type: "success"
      });
      setTimeout(() => setShortcutFeedback(null), 3000);
    }
  };

  const resetShortcutsToDefault = () => {
    setShortcuts([
      { id: "s1", keys: "Control+Alt+A", actionId: "ai_analyze" },
      { id: "s2", keys: "Control+Shift+M", actionId: "clear_cache" },
      { id: "s3", keys: "Alt+T", actionId: "latency_test" },
      { id: "s4", keys: "Control+Alt+S", actionId: "toggle_smart_disable" }
    ]);
    setShortcutFeedback({
      message: "Atajos restablecidos a los valores por defecto.",
      type: "info"
    });
    setTimeout(() => setShortcutFeedback(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F2EFEB] text-[#151515] font-sans flex flex-col selection:bg-[#3A47FF] selection:text-white">
      
      {/* Toast Notification */}
      {toast && (
        <div id="toast-notif" className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#F2EFEB] border-2 border-[#151515] p-4 shadow-[6px_6px_0px_0px_#151515] flex items-start gap-3 animate-bounce">
          <div className="p-1 bg-[#3A47FF]/10 rounded text-[#3A47FF]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#151515]">{toast.title}</h4>
            <p className="text-[11px] text-[#151515]/70 mt-1 leading-relaxed font-mono">{toast.description}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-[#151515]/40 hover:text-[#151515]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header (Editorial style) */}
      <header className="p-6 md:p-8 border-b border-[#151515]/10 grid grid-cols-1 md:grid-cols-2 items-end gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#151515]/50 mb-2 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-[#3A47FF]" />
            CONSULTORÍA DIGITAL DE AUDIO
          </div>
          <h1 className="font-serif italic text-5xl md:text-7xl font-semibold leading-none tracking-tight text-[#151515]">
            Asesoría.
          </h1>
        </div>
        
        <div className="flex flex-col items-stretch md:items-end gap-3">
          <div className="text-right font-mono text-[10px] uppercase tracking-wider text-[#151515] border-b-2 border-[#151515] pb-2 w-full">
            OPTIMIZACIÓN DE PROYECTO / FL STUDIO V2.4
          </div>
          
          {/* Live system monitoring bar */}
          <div className="flex flex-wrap items-center justify-end gap-4 text-[10px] font-mono text-[#151515]/70">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3A47FF] animate-pulse" />
              <span>SISTEMA: <strong className="text-[#151515]">ACTIVO</strong></span>
            </div>
            <span className="text-[#151515]/20">|</span>
            <div>
              <span>DRIVER: <strong className="text-[#3A47FF]">{simParams.driver}</strong></span>
            </div>
            <span className="text-[#151515]/20">|</span>
            <div>
              <span>BÚFER: <strong className="text-[#151515]">{simParams.bufferSize} SMPL</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 md:p-8">
        
        {/* Left column: Simulated FL Studio Panel (Visual Canvas + Controls) */}
        <section className="xl:col-span-7 flex flex-col gap-8">
          
          {/* Header section with view choices */}
          <div className="bg-[#F2EFEB] border border-[#151515] p-6 shadow-[4px_4px_0px_0px_#151515] flex flex-col gap-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[#151515]/10 pb-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#151515] flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#3A47FF]" />
                Simulador de Ajustes & Captura
              </h2>
              <div className="flex border border-[#151515] p-0.5 bg-white text-xs font-mono">
                <button
                  onClick={() => setUseUploadedImage(false)}
                  className={`px-3 py-1.5 font-bold transition-colors ${
                    !useUploadedImage
                      ? "bg-[#3A47FF] text-white"
                      : "text-[#151515]/60 hover:text-[#151515]"
                  }`}
                >
                  SIMULADOR INTEGRADO
                </button>
                <button
                  onClick={() => setUseUploadedImage(true)}
                  className={`px-3 py-1.5 font-bold transition-colors ${
                    useUploadedImage
                      ? "bg-[#3A47FF] text-white"
                      : "text-[#151515]/60 hover:text-[#151515]"
                  }`}
                >
                  CARGAR CAPTURA
                </button>
              </div>
            </div>

            <div className="bg-white p-3 border border-[#151515]/10 flex flex-col items-center justify-center">
              {/* Screen preview container */}
              {!useUploadedImage ? (
                <div className="relative w-full overflow-hidden border border-[#151515] bg-[#F2EFEB] p-1.5">
                  {/* Absolute watermark of our real-time capture status */}
                  <div className="absolute top-4 left-4 z-10 bg-[#151515] text-[#F2EFEB] text-[8.5px] font-mono px-2 py-1 tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3A47FF] animate-pulse" />
                    <span>MONITOREO EN VIVO</span>
                  </div>
                  <img
                    src={screenshotDataUrl || null}
                    alt="FL Studio Settings Simulator Mock"
                    className="w-full max-w-3xl mx-auto block h-auto aspect-[8/5] bg-[#F2EFEB] border border-[#151515]/10"
                  />
                  <div className="mt-2 text-[10px] font-mono text-[#151515]/60 text-right">
                    * El panel visual se actualiza automáticamente al cambiar los parámetros inferiores.
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  {uploadedImageBase64 ? (
                    <div className="relative border border-[#151515] p-2 bg-[#F2EFEB]">
                      <img
                        src={uploadedImageBase64 || null}
                        alt="Uploaded FL Studio screenshot"
                        className="w-full h-auto max-h-[350px] object-contain bg-[#F2EFEB]"
                      />
                      <button
                        onClick={() => {
                          setUploadedImageBase64("");
                          setUploadedFileName("");
                        }}
                        className="absolute top-4 right-4 bg-[#151515] hover:bg-[#3A47FF] text-[#F2EFEB] hover:text-white p-2 border border-[#151515] shadow-md transition-colors"
                        title="Eliminar captura"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-[#151515] bg-[#F2EFEB]/50 hover:bg-white p-12 text-center transition-all cursor-pointer flex flex-col items-center gap-4"
                    >
                      <div className="p-4 bg-[#3A47FF]/10 text-[#3A47FF] border border-[#151515]/10">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#151515]">Arrastra tu captura de FL Studio aquí</p>
                        <p className="text-[10px] text-[#151515]/60 mt-1 font-mono">Soporta PNG, JPG o WEBP. Sube la ventana de Audio Settings o el panel F10.</p>
                      </div>
                      <span className="text-[10px] text-[#151515]/40 font-mono">O</span>
                      <label className="px-4 py-2 bg-white hover:bg-[#3A47FF] hover:text-white text-xs font-mono font-bold text-[#151515] border border-[#151515] transition-colors cursor-pointer">
                        SELECCIONAR ARCHIVO
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simulated settings controller */}
            {!useUploadedImage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 border border-[#151515]/10 font-mono">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#151515]/60 uppercase tracking-widest mb-2">
                      Controlador de Audio (Driver ASIO)
                    </label>
                    <select
                      value={simParams.driver}
                      onChange={(e) => setSimParams(prev => ({ ...prev, driver: e.target.value }))}
                      className="w-full bg-white border border-[#151515] p-2.5 text-xs text-[#151515] focus:outline-none focus:ring-1 focus:ring-[#3A47FF]"
                    >
                      <option value="Primary Sound Driver">Primary Sound (¡Muy lento!)</option>
                      <option value="Realtek High Definition Audio">Realtek DirectSound</option>
                      <option value="ASIO4ALL v2">ASIO4ALL v2 (Genérico)</option>
                      <option value="FL Studio ASIO">FL Studio ASIO (Intermedio)</option>
                      <option value="Focusrite USB ASIO">Focusrite USB ASIO (Interfaz)</option>
                      <option value="Universal Audio Thunderbolt ASIO">UA Apollo ASIO (Profesional)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-[#151515]/60 uppercase tracking-widest">
                        Buffer Length: {simParams.bufferSize} samples
                      </label>
                      <span className="text-[10px] text-[#3A47FF] font-bold">
                        (~{((simParams.bufferSize / simParams.sampleRate) * 1000).toFixed(1)} ms)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="32"
                      max="2048"
                      step="32"
                      value={simParams.bufferSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        const buffers = [32, 64, 128, 256, 512, 1024, 2048];
                        const closest = buffers.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
                        setSimParams(prev => ({ ...prev, bufferSize: closest }));
                      }}
                      className="w-full accent-[#3A47FF] h-1.5 bg-[#151515]/10 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#151515]/50 mt-1">
                      <span>32s (Baja)</span>
                      <span>512s (Recomendado)</span>
                      <span>2048s (Seguro)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#151515]/60 uppercase tracking-widest mb-2">
                      Frecuencia de Muestreo (Sample Rate)
                    </label>
                    <select
                      value={simParams.sampleRate}
                      onChange={(e) => setSimParams(prev => ({ ...prev, sampleRate: parseInt(e.target.value) }))}
                      className="w-full bg-white border border-[#151515] p-2.5 text-xs text-[#151515] focus:outline-none focus:ring-1 focus:ring-[#3A47FF]"
                    >
                      <option value={44100}>44100 Hz (Estándar CD)</option>
                      <option value={48000}>48000 Hz (Estándar Video)</option>
                      <option value={96000}>96000 Hz (Alta resolución)</option>
                      <option value={192000}>192000 Hz (Extremo DSP)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-[#151515]/60 uppercase tracking-widest">
                        VSTs / Plugins Activos
                      </label>
                      <span className="text-xs text-[#3A47FF] font-bold">{simParams.vstCount}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={simParams.vstCount}
                      onChange={(e) => setSimParams(prev => ({ ...prev, vstCount: parseInt(e.target.value) }))}
                      className="w-full accent-[#3A47FF] h-1.5 bg-[#151515]/10 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#151515]/50 mt-1">
                      <span>1 VST (Vacío)</span>
                      <span>50 (Medio)</span>
                      <span>100 (Saturación)</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[#151515]/60 uppercase tracking-widest">
                      Opciones del Motor de Audio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSimParams(prev => ({ ...prev, smartDisable: !prev.smartDisable }))}
                        className={`p-2.5 border text-xs font-bold text-left transition-all ${
                          simParams.smartDisable
                            ? "bg-[#3A47FF] border-[#151515] text-white"
                            : "bg-white border-[#151515]/20 text-[#151515]/40 hover:text-[#151515] hover:border-[#151515]"
                        }`}
                      >
                        <div>Smart Disable</div>
                        <div className="text-[9px] font-normal opacity-80">{simParams.smartDisable ? "ACTIVO" : "INACTIVO"}</div>
                      </button>

                      <button
                        onClick={() => setSimParams(prev => ({ ...prev, multithreaded: !prev.multithreaded }))}
                        className={`p-2.5 border text-xs font-bold text-left transition-all ${
                          simParams.multithreaded
                            ? "bg-[#3A47FF] border-[#151515] text-white"
                            : "bg-white border-[#151515]/20 text-[#151515]/40 hover:text-[#151515] hover:border-[#151515]"
                        }`}
                      >
                        <div>Multihilo CPU</div>
                        <div className="text-[9px] font-normal opacity-80">{simParams.multithreaded ? "ACTIVO" : "INACTIVO"}</div>
                      </button>

                      <button
                        onClick={() => setSimParams(prev => ({ ...prev, tripleBuffer: !prev.tripleBuffer }))}
                        className={`p-2.5 border text-xs font-bold text-left transition-all col-span-2 ${
                          simParams.tripleBuffer
                            ? "bg-[#3A47FF] border-[#151515] text-white"
                            : "bg-white border-[#151515]/20 text-[#151515]/40 hover:text-[#151515] hover:border-[#151515]"
                        }`}
                      >
                        <div>Triple Buffer</div>
                        <div className="text-[9px] font-normal opacity-80">{simParams.tripleBuffer ? "EVITA MICRO-CORTES" : "MENOS LATENCIA"}</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom context / user notes for analyzer */}
            <div className="flex flex-col gap-2 font-mono">
              <label className="text-[10px] font-bold text-[#151515]/60 uppercase tracking-widest">
                Descripción de Sintetizadores, Efectos o Dificultades del Proyecto:
              </label>
              <textarea
                value={customUserNotes}
                onChange={(e) => setCustomUserNotes(e.target.value)}
                placeholder="Ejemplo: Chasquidos y cortes de audio al reproducir múltiples instancias de Serum, Kontakt o plugins pesados..."
                className="w-full bg-white border border-[#151515] p-3 text-xs text-[#151515] focus:outline-none focus:ring-1 focus:ring-[#3A47FF] h-16 resize-none"
              />
            </div>

            {/* Trigger AI Diagnose button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={triggerAiAnalysis}
                disabled={isAnalyzing || (useUploadedImage && !uploadedImageBase64)}
                className={`w-full py-4 px-6 font-mono uppercase text-xs tracking-widest font-bold transition-all border border-[#151515] ${
                  isAnalyzing || (useUploadedImage && !uploadedImageBase64)
                    ? "bg-[#151515]/10 text-[#151515]/40 cursor-not-allowed"
                    : "bg-[#151515] text-[#F2EFEB] hover:bg-[#3A47FF] hover:text-white hover:shadow-[4px_4px_0px_0px_#151515] active:translate-y-0.5 active:shadow-none"
                }`}
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini analizando parámetros...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Analizar Configuración con IA</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick-run terminal panel simulator */}
          <div className="bg-[#151515] text-[#F2EFEB] p-6 border-2 border-[#151515] flex flex-col gap-4 shadow-[4px_4px_0px_0px_#3A47FF]">
            <div className="flex justify-between items-center border-b border-[#F2EFEB]/15 pb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F2EFEB] flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                Terminal Integrada de Optimización
              </h3>
              {executingCommand && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ejecutando: {executingCommand.title}
                </span>
              )}
            </div>

            <div className="font-mono text-xs text-[#F2EFEB]/90 min-h-[140px] flex flex-col justify-between">
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {terminalLines.length === 0 ? (
                  <span className="text-[#F2EFEB]/40 leading-relaxed block">
                    &gt; Listo. Ejecuta un comando desde la sección derecha o mediante tus atajos rápidos para ver la salida del optimizador en tiempo real...
                  </span>
                ) : (
                  terminalLines.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.startsWith("[ÉXITO]")
                          ? "text-emerald-400 font-bold"
                          : line.startsWith("[PELIGRO]") || line.startsWith("[Error]")
                          ? "text-red-400 font-bold"
                          : line.startsWith("[EJECUTANDO]")
                          ? "text-[#3A47FF] font-bold"
                          : "text-[#F2EFEB]/80"
                      }
                    >
                      &gt; {line}
                    </div>
                  ))
                )}
              </div>

              {executingCommand && (
                <div className="mt-4 pt-3 border-t border-[#F2EFEB]/10 flex items-center gap-3">
                  <div className="flex-1 bg-white/10 h-1.5 overflow-hidden border border-white/5">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${terminalProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#F2EFEB]/50 font-mono">{terminalProgress}%</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right column: Interactive tabs (Diagnosis Results, Chat AI Advisor, Keyboard Shortcuts Config) */}
        <section className="xl:col-span-5 bg-[#151515] text-[#F2EFEB] p-6 border-2 border-[#151515] shadow-[6px_6px_0px_0px_#3A47FF] flex flex-col gap-6">
          
          {/* Main Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-white/10 p-0.5 bg-black text-[10.5px] font-mono">
            <button
              onClick={() => setActiveTab("analyzer")}
              className={`py-2.5 px-2 text-center uppercase tracking-wider font-bold transition-all ${
                activeTab === "analyzer"
                  ? "bg-[#3A47FF] text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Diagnóstico
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`py-2.5 px-2 text-center uppercase tracking-wider font-bold transition-all ${
                activeTab === "chat"
                  ? "bg-[#3A47FF] text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Chat IA
            </button>
            <button
              onClick={() => setActiveTab("shortcuts")}
              className={`py-2.5 px-2 text-center uppercase tracking-wider font-bold transition-all ${
                activeTab === "shortcuts"
                  ? "bg-[#3A47FF] text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Hotkeys
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`py-2.5 px-2 text-center uppercase tracking-wider font-bold transition-all ${
                activeTab === "terminal"
                  ? "bg-[#3A47FF] text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Comandos
            </button>
          </div>

          {/* TAB 1: Diagnostic & optimization recommendations */}
          {activeTab === "analyzer" && (
            <div className="flex-1 flex flex-col gap-5">
              
              {!analysisResult ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/20 bg-white/5">
                  <div className="p-3 bg-white/5 text-[#3A47FF] border border-white/10 mb-3">
                    <Sparkles className="w-8 h-8 text-[#3A47FF]" />
                  </div>
                  <h3 className="text-xs font-mono font-bold uppercase text-white">Sin diagnóstico activo</h3>
                  <p className="text-[11px] text-white/60 max-w-sm mt-1.5 leading-relaxed font-mono">
                    Sube una foto o cambia las variables del simulador y haz click en <span className="text-[#3A47FF] font-semibold">Analizar Configuración con IA</span> para ver un diagnóstico experto.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* CPU Saving Widget */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(16,185,129,0.1)]">
                    <div>
                      <h4 className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">Ahorro de CPU Estimado</h4>
                      <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">+{analysisResult.estimatedCpuSavingPct}%</p>
                      <p className="text-[10px] text-white/50 mt-1 font-mono">Si aplicas las correcciones recomendadas a continuación</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Export Diagnostic Recommendations Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#3A47FF]/10 text-[#3A47FF] border border-white/5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-mono font-bold text-white uppercase">Guardar Recomendaciones</h4>
                        <p className="text-[9px] text-white/60 font-mono">Exporta este reporte en formato Markdown (.md) para leerlo sin conexión.</p>
                      </div>
                    </div>
                    <button
                      onClick={exportAnalysisToMarkdown}
                      className="px-4 py-2 bg-white text-[#151515] hover:bg-[#3A47FF] hover:text-white border border-[#151515] font-mono uppercase text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
                    >
                      Exportar Reporte
                    </button>
                  </div>

                  {/* Summary of audio params parsed by Gemini */}
                  <div className="grid grid-cols-2 gap-4 bg-black p-4 border border-white/10 text-xs font-mono">
                    <div>
                      <span className="text-white/40 block text-[9px] uppercase tracking-wider">Búfer Detectado:</span>
                      <p className="font-bold text-white mt-1">{analysisResult.bufferSize ? `${analysisResult.bufferSize} samples` : "No detectado"}</p>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[9px] uppercase tracking-wider">Tasa de Muestreo:</span>
                      <p className="font-bold text-white mt-1">{analysisResult.sampleRateHz ? `${analysisResult.sampleRateHz / 1000} kHz` : "No detectada"}</p>
                    </div>
                    <div className="col-span-2 border-t border-white/10 pt-3">
                      <span className="text-white/40 block text-[9px] uppercase tracking-wider">Driver de Entrada/Salida:</span>
                      <p className="font-bold text-[#3A47FF] truncate mt-1">{analysisResult.driverDetected || "No detectado"}</p>
                    </div>
                    <div className="col-span-2 border-t border-white/10 pt-3">
                      <span className="text-white/40 block text-[9px] uppercase tracking-wider">Latencia estimada de ida/vuelta:</span>
                      <p className="font-bold text-sky-400 mt-1">{analysisResult.latencyMs ? `${analysisResult.latencyMs.toFixed(1)} ms` : "Cálculo pendiente"}</p>
                    </div>
                  </div>

                  {/* Detected Issues List */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#3A47FF]" />
                      Problemas de Rendimiento ({analysisResult.detectedIssues.length})
                    </h3>
                    
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {analysisResult.detectedIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedIssue(selectedIssue?.title === issue.title ? null : issue)}
                          className={`p-4 border text-left cursor-pointer transition-all ${
                            selectedIssue?.title === issue.title
                              ? "bg-[#3A47FF]/10 border-[#3A47FF] shadow-inner"
                              : "bg-white/5 hover:bg-white/10 border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">{issue.title}</span>
                            <span
                              className={`text-[8.5px] font-mono font-bold uppercase px-2 py-0.5 border ${
                                issue.severity === "high"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : issue.severity === "medium"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }`}
                            >
                                {issue.severity === "high" ? "Crítico" : issue.severity === "medium" ? "Medio" : "Bajo"}
                            </span>
                          </div>
                          
                          <p className="text-xs text-white/70 mt-2 line-clamp-2 leading-relaxed">
                            {issue.description}
                          </p>
                          
                          {selectedIssue?.title === issue.title && (
                            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                              <p className="text-white font-mono font-bold text-[10px] uppercase tracking-wider">Instrucciones de Optimización:</p>
                              <div className="p-3 bg-black text-white/90 leading-relaxed font-mono text-[10.5px] whitespace-pre-wrap border-l-2 border-[#3A47FF]">
                                {issue.recommendation}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary commentary */}
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/60 mb-2">Comentario de nuestro Asesor</h4>
                    <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap font-mono text-[11px] bg-black p-4 border border-white/10">
                      {analysisResult.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Expert Conversational Chat */}
          {activeTab === "chat" && (
            <div className="border border-white/10 bg-black flex-1 flex flex-col overflow-hidden h-[500px]">
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`p-3 text-xs leading-relaxed font-mono ${
                        msg.role === "user"
                          ? "bg-[#3A47FF] text-white border border-[#151515] shadow-[2px_2px_0px_0px_#151515]"
                          : "bg-white/5 border border-white/10 text-white/90"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[8px] text-white/40 mt-1 px-1 font-mono">{msg.timestamp}</span>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="mr-auto max-w-[85%] flex items-center gap-2 bg-white/5 border border-white/10 p-3 text-xs text-white/50 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#3A47FF]" />
                    <span>Redactando solución...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Instant prompts / Sugeridas */}
              <div className="px-4 py-2.5 bg-black border-t border-white/10 flex flex-wrap gap-2 overflow-x-auto whitespace-nowrap">
                <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider flex items-center pr-1">Sugeridos:</span>
                <button
                  onClick={() => handleQuickQuestion("¿Cuál es la diferencia entre FL Studio ASIO y ASIO4ALL?")}
                  className="px-2.5 py-1 bg-white/5 hover:bg-[#3A47FF] hover:text-white border border-white/10 text-[9.5px] text-white/70 font-mono transition-colors cursor-pointer"
                >
                  ¿Diferencia de Drivers?
                </button>
                <button
                  onClick={() => handleQuickQuestion("¿Cómo activo Smart Disable en todos los VST a la vez?")}
                  className="px-2.5 py-1 bg-white/5 hover:bg-[#3A47FF] hover:text-white border border-white/10 text-[9.5px] text-white/70 font-mono transition-colors cursor-pointer"
                >
                  Activar Smart Disable
                </button>
                <button
                  onClick={() => handleQuickQuestion("¿Qué es DPC Latency y cómo lo soluciono para evitar cortes?")}
                  className="px-2.5 py-1 bg-white/5 hover:bg-[#3A47FF] hover:text-white border border-white/10 text-[9.5px] text-white/70 font-mono transition-colors cursor-pointer"
                >
                  ¿Qué es DPC Latency?
                </button>
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-black border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pregúntale a tu asesor de FL Studio..."
                  className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3A47FF] font-mono placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className={`px-4 py-2 font-mono uppercase text-[10px] font-bold tracking-widest border transition-all cursor-pointer ${
                    !chatInput.trim() || isChatLoading
                      ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                      : "bg-[#3A47FF] text-white border-[#151515] hover:bg-white hover:text-[#151515]"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Custom Keyboard Shortcuts Configuration */}
          {activeTab === "shortcuts" && (
            <div className="flex-1 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white">Atajos de Teclado</h3>
                  <p className="text-[10px] text-white/50 font-mono mt-1">Asigna combinaciones rápidas para optimizar tu flujo</p>
                </div>
                <button
                  onClick={resetShortcutsToDefault}
                  className="text-[10px] text-white/40 hover:text-[#3A47FF] hover:underline font-mono font-bold transition-all cursor-pointer"
                >
                  Valores Defecto
                </button>
              </div>

              {shortcutFeedback && (
                <div
                  className={`p-3 border text-xs font-mono font-bold shadow-[2px_2px_0px_0px_rgba(21,21,21,0.2)] ${
                    shortcutFeedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-[#3A47FF]/10 border-[#3A47FF]/20 text-[#3A47FF]"
                  }`}
                >
                  {shortcutFeedback.message}
                </div>
              )}

              {/* Recorded Key Status helper */}
              {isRecordingShortcutId && (
                <div className="p-5 bg-[#3A47FF]/10 border border-[#3A47FF] text-center space-y-3 font-mono">
                  <span className="text-xs font-bold text-white animate-pulse block tracking-wider uppercase">
                    🔴 Presiona la combinación de teclas en tu teclado físico
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                    {recordedKeys.length === 0 ? (
                      <span className="text-[10px] text-white/40">Esperando combinación (ej. Ctrl + Shift + K)...</span>
                    ) : (
                      recordedKeys.map((k, idx) => (
                        <kbd key={idx} className="px-2.5 py-1 bg-[#151515] border border-white/20 text-xs font-mono font-bold text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]">
                          {k}
                        </kbd>
                      ))
                    )}
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={saveRecordedShortcut}
                      disabled={recordedKeys.length === 0}
                      className="px-3 py-1.5 bg-[#3A47FF] hover:bg-white hover:text-[#151515] disabled:bg-white/5 disabled:text-white/20 border border-[#151515] text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Guardar Atajo
                    </button>
                    <button
                      onClick={() => setIsRecordingShortcutId(null)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/70 uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Shortcuts config list */}
              <div className="space-y-3">
                {shortcuts.map((shortcut) => {
                  const associatedAction = shortcutActions.find(act => act.id === shortcut.actionId);
                  return (
                    <div
                      key={shortcut.id}
                      className="p-4 bg-white/5 border border-white/10 flex items-center justify-between gap-4 transition-all hover:bg-white/10"
                    >
                      <div className="flex-1 min-w-0 font-mono">
                        <span className="font-bold text-xs text-white block uppercase tracking-wider">
                          {associatedAction?.name || "Acción sin asignar"}
                        </span>
                        <span className="text-[10px] text-white/50 mt-1 block leading-relaxed">
                          {associatedAction?.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isRecordingShortcutId === shortcut.id ? (
                          <span className="text-[10px] text-[#3A47FF] font-mono italic font-bold">Grabando...</span>
                        ) : (
                          <>
                            <kbd className="px-2.5 py-1 bg-black border border-white/20 text-[10px] text-[#3A47FF] font-mono font-bold shadow-[2px_2px_0px_0px_#3A47FF]">
                              {shortcut.keys}
                            </kbd>
                            <button
                              onClick={() => startRecordingShortcut(shortcut.id)}
                              className="p-2 bg-white/5 hover:bg-[#3A47FF] text-white/70 hover:text-white border border-white/10 hover:border-[#151515] transition-colors cursor-pointer"
                              title="Reasignar Atajo"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Helpful shortcut tips card */}
              <div className="p-4 bg-white/5 border border-white/10 flex gap-3 text-xs font-mono">
                <Info className="w-4 h-4 text-[#3A47FF] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">¿Cómo funcionan los atajos?</span>
                  <p className="text-[10.5px] text-white/60 leading-relaxed">
                    Puedes disparar estas combinaciones directamente mientras tienes el foco en esta aplicación para ejecutar las simulaciones u optimizaciones. El motor de escucha detecta las pulsaciones automáticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Preset commands library */}
          {activeTab === "terminal" && (
            <div className="flex-1 flex flex-col gap-5">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white">Comandos del Sistema</h3>
                <p className="text-[10px] text-white/50 font-mono mt-1">Scripts listos para optimizar tu sistema operativo para producción de audio.</p>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {PRESET_COMMANDS.map((cmd, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/10 flex flex-col gap-3 transition-all hover:border-white/20">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono font-bold text-xs text-white uppercase tracking-wider block">{cmd.title}</span>
                        <span className="text-[10px] text-white/50 font-mono mt-1 block leading-relaxed">{cmd.description}</span>
                      </div>
                      <span className={`text-[8.5px] font-bold uppercase px-1.5 py-0.5 border font-mono ${
                        cmd.os === "windows" 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : cmd.os === "macos"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {cmd.os}
                      </span>
                    </div>

                    <div className="p-2.5 bg-black border border-white/10 flex items-center justify-between gap-4 font-mono">
                      <code className="text-[10px] text-[#3A47FF] truncate flex-1 font-bold">{cmd.scriptCode}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cmd.scriptCode);
                          setToast({
                            title: "Copiado al Portapapeles",
                            description: "Listo para que lo pegues en tu PowerShell o Terminal."
                          });
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#3A47FF] hover:text-white border border-white/10 text-[9.5px] text-white/70 transition-colors cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1.5 font-mono">
                      <span className="text-[9px] text-white/40 italic leading-relaxed flex-1">
                        {cmd.explanation}
                      </span>
                      <button
                        onClick={() => simulateCommand(cmd)}
                        className="px-3.5 py-1.5 bg-[#3A47FF] hover:bg-white hover:text-[#151515] border border-[#151515] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        Ejecutar en Caliente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </main>

      {/* Footer bar */}
      <footer className="border-t border-[#151515]/10 bg-[#F2EFEB] p-6 text-center text-[10px] text-[#151515]/60 font-mono flex flex-col gap-1.5 justify-center items-center">
        <div>FL Studio Resource Advisor v2.4 <span className="text-[#3A47FF]/60">•</span> Powered by Gemini 2.0 Flash</div>
        <div className="text-[#151515]/40 max-w-xl">
          Presiona tus combinaciones de teclas asignadas en cualquier momento para activar tus Atajos de Optimización configurados.
        </div>
      </footer>
    </div>
  );
}
