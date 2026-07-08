export interface DetectedIssue {
  title: string;
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
}

export interface SystemCommand {
  title: string;
  description: string;
  os: "windows" | "macos" | "all";
  scriptCode: string;
  explanation: string;
}

export interface AnalysisResult {
  detectedIssues: DetectedIssue[];
  bufferSize: number | null;
  sampleRateHz: number | null;
  driverDetected: string | null;
  estimatedCpuSavingPct: number;
  latencyMs: number | null;
  commands: SystemCommand[];
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SimulatorParams {
  bufferSize: number; // in samples
  sampleRate: number; // in Hz
  driver: string;
  smartDisable: boolean;
  multithreaded: boolean;
  tripleBuffer: boolean;
  vstCount: number;
}
