import React, { useState, useEffect } from 'react';
import { useElectronAPI } from './hooks/useElectronAPI';
import { useTheme } from './hooks/useTheme';
import { ScreenshotCapturer } from './components/ScreenshotCapturer';
import { Chat } from './components/Chat';
import { HistoryPanel } from './components/HistoryPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { Issue } from './components/Issue';
import { Command } from './components/Command';
import { Loader } from 'lucide-react';

interface AnalysisResult {
  detectedIssues: Array<{
    title: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  bufferSize?: number;
  sampleRateHz?: number;
  driverDetected?: string;
  estimatedCpuSavingPct: number;
  latencyMs?: number;
  commands: Array<{
    title: string;
    description: string;
    os: string;
    scriptCode: string;
    explanation: string;
  }>;
  explanation: string;
}

interface HistoryItem {
  id: number;
  timestamp: string;
  customNotes?: string;
  analysisResults: string;
}

function App() {
  const { api, isElectron } = useElectronAPI();
  const { theme, setTheme } = useTheme();

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'capture' | 'chat' | 'history'>('capture');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  // Load history on mount
  useEffect(() => {
    if (api) {
      loadHistory();
    }
  }, [api]);

  // Listen for screenshot captures via keyboard shortcut
  useEffect(() => {
    if (!isElectron) return;

    const handleScreenshotCaptured = (event: any, data: any) => {
      handleFileUpload(data.imageBase64);
    };

    const handleShowHistory = () => {
      setActiveTab('history');
    };

    const handleClearChat = () => {
      setChatHistory([]);
    };

    // Listen for events from main process
    if ((window as any).electronAPI) {
      // We'll use IPC listeners here
    }
  }, [isElectron]);

  const loadHistory = async () => {
    if (!api) return;
    try {
      const result = await api.getAnalyses(50);
      if (result.success) {
        setHistory(result.data || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleCaptureScreenshot = async () => {
    if (!api) {
      alert('API de Electron no disponible');
      return;
    }

    setLoading(true);
    try {
      const imageBase64 = await api.captureScreen();
      await handleAnalyze(imageBase64, 'image/png');
    } catch (error) {
      alert(`Error capturando pantalla: ${(error as any).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (imageBase64: string) => {
    await handleAnalyze(imageBase64, 'image/png');
  };

  const handleAnalyze = async (imageBase64: string, mimeType: string) => {
    if (!api) return;

    setLoading(true);
    try {
      const result = await api.analyzeScreenshot(imageBase64, mimeType, customNotes);
      if (result.success) {
        setAnalysisResult(result.data);
        setCustomNotes('');
        await loadHistory();
        setActiveTab('capture');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error analizando imagen: ${(error as any).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChatMessage = async (message: string): Promise<string> => {
    if (!api) throw new Error('API no disponible');

    try {
      const result = await api.chat(message, chatHistory);
      if (result.success) {
        return result.text;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteAnalysis = async (id: number) => {
    if (!api) return;
    try {
      await api.deleteAnalysis(id);
      await loadHistory();
    } catch (error) {
      console.error('Error deleting analysis:', error);
    }
  };

  const handleClearAnalyses = async () => {
    if (!api) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar todo el historial?')) {
      try {
        await api.clearAnalyses();
        setHistory([]);
        setAnalysisResult(null);
      } catch (error) {
        console.error('Error clearing analyses:', error);
      }
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    try {
      const analysisData = JSON.parse(item.analysisResults);
      setAnalysisResult(analysisData);
      setActiveTab('capture');
    } catch (error) {
      console.error('Error parsing analysis:', error);
    }
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FL Studio Advisor</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Asesor de Optimización en Tiempo Real</p>
          </div>
          <div className="flex items-center gap-4">
            {!isElectron && (
              <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-semibold">
                Modo Web
              </div>
            )}
            <ThemeToggle currentTheme={theme} onThemeChange={setTheme} />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex">
            <button
              onClick={() => setActiveTab('capture')}
              className={`flex-1 px-4 py-3 font-semibold transition ${
                activeTab === 'capture'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Captura & Análisis
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-3 font-semibold transition ${
                activeTab === 'chat'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Chat Asesor
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 font-semibold transition ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Historial ({history.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Capture Tab */}
            {activeTab === 'capture' && (
              <div className="p-6 max-w-4xl mx-auto">
                <ScreenshotCapturer
                  onCapture={handleCaptureScreenshot}
                  onFileUpload={handleFileUpload}
                  isLoading={loading}
                />

                {/* Custom Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Ej: He estado experimentando con clicks y pops. Mi buffer está en 256 muestras."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* Analysis Results */}
                {analysisResult && (
                  <div className="mt-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Resultados del Análisis</h2>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {analysisResult.estimatedCpuSavingPct > 0 && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Ahorro CPU Estimado</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {analysisResult.estimatedCpuSavingPct}%
                            </p>
                          </div>
                        )}
                        {analysisResult.bufferSize && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Buffer Size</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {analysisResult.bufferSize}
                            </p>
                          </div>
                        )}
                        {analysisResult.sampleRateHz && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Sample Rate</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {(analysisResult.sampleRateHz / 1000).toFixed(1)}k
                            </p>
                          </div>
                        )}
                        {analysisResult.latencyMs && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Latencia</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {analysisResult.latencyMs.toFixed(1)}ms
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Issues */}
                      {analysisResult.detectedIssues && analysisResult.detectedIssues.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                            Problemas Detectados ({analysisResult.detectedIssues.length})
                          </h3>
                          {analysisResult.detectedIssues.map((issue, idx) => (
                            <Issue key={idx} {...issue} />
                          ))}
                        </div>
                      )}

                      {/* Commands */}
                      {analysisResult.commands && analysisResult.commands.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                            Comandos de Optimización ({analysisResult.commands.length})
                          </h3>
                          {analysisResult.commands.map((cmd, idx) => (
                            <Command key={idx} {...cmd} />
                          ))}
                        </div>
                      )}

                      {/* Explanation */}
                      {analysisResult.explanation && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">Diagnóstico Detallado</h3>
                          <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300">
                            {/* Simple markdown rendering */}
                            {analysisResult.explanation.split('\n').map((line, idx) => (
                              <p key={idx}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="h-full">
                <Chat
                  onSendMessage={handleChatMessage}
                  initialMessages={chatHistory}
                  isLoading={loading}
                />
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <HistoryPanel
                items={history}
                onSelect={handleSelectHistory}
                onDelete={handleDeleteAnalysis}
                onClearAll={handleClearAnalyses}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>FL Studio Advisor v1.0.0 • Asesor de Optimización para Productores Musicales</p>
        {isElectron && (
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">
            Atajo: Ctrl+Shift+S para capturar | Ctrl+H para historial | Ctrl+Shift+C para limpiar chat
          </p>
        )}
      </footer>
    </div>
  );
}

export default App;
