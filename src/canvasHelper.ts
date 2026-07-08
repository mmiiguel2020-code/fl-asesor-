import { SimulatorParams } from "./types";

/**
 * Draws a mock FL Studio settings panel on a canvas and returns the Base64 image data URL.
 */
export function generateFlStudioScreenshot(params: SimulatorParams): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Background - FL Studio Anthracite style
  ctx.fillStyle = "#1e1f22";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Header bar
  ctx.fillStyle = "#2c2d32";
  ctx.fillRect(0, 0, canvas.width, 40);

  // FL Studio Logo symbol (orange fruit shape)
  ctx.beginPath();
  ctx.arc(25, 20, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ff6a00";
  ctx.fill();
  
  // Stem
  ctx.beginPath();
  ctx.moveTo(25, 12);
  ctx.quadraticCurveTo(30, 8, 32, 10);
  ctx.strokeStyle = "#8ebd3d";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title text
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("FL Studio Advisor - Settings Analyzer v20.9", 45, 24);

  // Windows buttons mock
  ctx.fillStyle = "#4a4c52";
  ctx.fillRect(canvas.width - 90, 12, 16, 16);
  ctx.fillRect(canvas.width - 65, 12, 16, 16);
  ctx.fillStyle = "#e05050";
  ctx.fillRect(canvas.width - 40, 12, 16, 16);

  // 3. Side Panel - Menu/Presets list
  ctx.fillStyle = "#161719";
  ctx.fillRect(0, 40, 200, canvas.height - 40);

  ctx.fillStyle = "#8e9196";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("CATEGORÍAS DE AUDIO", 20, 70);

  const menus = ["Audio Devices", "CPU & DSP Performance", "Plugins & Smart Disable", "Buffer Settings", "Project Info", "System Latency"];
  menus.forEach((menu, idx) => {
    ctx.fillStyle = idx === 0 ? "#ff6a00" : "#a2a5ab";
    ctx.font = idx === 0 ? "bold 12px sans-serif" : "12px sans-serif";
    ctx.fillText(menu, 30, 105 + idx * 30);

    // Bullet indicator
    ctx.beginPath();
    ctx.arc(18, 101 + idx * 30, 3, 0, Math.PI * 2);
    ctx.fillStyle = idx === 0 ? "#ff6a00" : "#4a4c52";
    ctx.fill();
  });

  // 4. Main Settings Content Panel
  ctx.fillStyle = "#26282e";
  ctx.fillRect(215, 55, 565, canvas.height - 70);

  // Panel Header
  ctx.fillStyle = "#1e2025";
  ctx.fillRect(215, 55, 565, 35);
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#e2e4e9";
  ctx.fillText("Audio Settings (Configuración de Entrada / Salida)", 230, 77);

  // Grid background
  ctx.strokeStyle = "#2d3037";
  ctx.lineWidth = 1;
  for (let i = 215; i < 780; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 90);
    ctx.lineTo(i, canvas.height - 15);
    ctx.stroke();
  }
  for (let j = 90; j < canvas.height - 15; j += 30) {
    ctx.beginPath();
    ctx.moveTo(215, j);
    ctx.lineTo(780, j);
    ctx.stroke();
  }

  // Draw Audio Device selection
  ctx.fillStyle = "#e2e4e9";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("Device / Driver de Audio:", 240, 125);

  // Dropdown background
  ctx.fillStyle = "#111215";
  ctx.fillRect(240, 135, 350, 30);
  ctx.strokeStyle = "#434750";
  ctx.strokeRect(240, 135, 350, 30);

  // Driver text
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = params.driver.includes("ASIO") ? "#8ebd3d" : "#e05050";
  ctx.fillText(params.driver, 255, 154);

  // Dropdown arrow
  ctx.beginPath();
  ctx.moveTo(570, 146);
  ctx.lineTo(575, 152);
  ctx.lineTo(580, 146);
  ctx.closePath();
  ctx.fillStyle = "#a2a5ab";
  ctx.fill();

  // Status Badge
  const isDriverAsio = params.driver.includes("ASIO");
  ctx.fillStyle = isDriverAsio ? "rgba(142, 189, 61, 0.15)" : "rgba(224, 80, 80, 0.15)";
  ctx.fillRect(600, 135, 140, 30);
  ctx.strokeStyle = isDriverAsio ? "#8ebd3d" : "#e05050";
  ctx.strokeRect(600, 135, 140, 30);
  
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = isDriverAsio ? "#8ebd3d" : "#e05050";
  ctx.fillText(isDriverAsio ? "DRV: RECOMENDADO" : "DRV: LENTO (CRÍTICO)", 610, 153);

  // Buffer Settings Section
  ctx.fillStyle = "#e2e4e9";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(`Buffer Length (Tamaño del Búfer): ${params.bufferSize} samples`, 240, 200);

  // Buffer Slider Mock
  ctx.fillStyle = "#111215";
  ctx.fillRect(240, 210, 500, 12);
  // Fill amount depending on buffer size (32 is very low, 2048 is very high)
  const percent = Math.min(100, Math.max(5, (Math.log2(params.bufferSize) - 5) * 16.6));
  ctx.fillStyle = params.bufferSize < 128 ? "#ff9a00" : (params.bufferSize > 1024 ? "#00cdff" : "#8ebd3d");
  ctx.fillRect(240, 210, percent * 5, 12);

  // Handle
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(240 + percent * 5 - 6, 205, 12, 22);

  // Under-run danger text
  ctx.font = "10px sans-serif";
  if (params.bufferSize < 128) {
    ctx.fillStyle = "#ff6a00";
    ctx.fillText("¡Peligro de cortes de audio (Underruns) con proyectos pesados!", 240, 238);
  } else if (params.bufferSize > 1024) {
    ctx.fillStyle = "#00cdff";
    ctx.fillText("Demasiada latencia para grabación en vivo.", 240, 238);
  } else {
    ctx.fillStyle = "#8ebd3d";
    ctx.fillText("Rango óptimo para mezcla y estabilidad.", 240, 238);
  }

  // Sample Rate
  ctx.fillStyle = "#e2e4e9";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("Sample Rate (Frecuencia de muestreo):", 240, 280);

  // Dropdown
  ctx.fillStyle = "#111215";
  ctx.fillRect(240, 290, 180, 28);
  ctx.strokeStyle = "#434750";
  ctx.strokeRect(240, 290, 180, 28);
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = params.sampleRate > 48000 ? "#ff6a00" : "#ffffff";
  ctx.fillText(`${params.sampleRate / 1000} kHz`, 255, 308);

  if (params.sampleRate > 48000) {
    ctx.font = "9px sans-serif";
    ctx.fillStyle = "#ff6a00";
    ctx.fillText("¡Carga el doble de CPU innecesariamente!", 240, 332);
  }

  // Active VST counts
  ctx.fillStyle = "#e2e4e9";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(`VSTs activos en Playlist: ${params.vstCount}`, 450, 280);
  ctx.fillStyle = "#111215";
  ctx.fillRect(450, 290, 290, 28);
  ctx.strokeStyle = "#434750";
  ctx.strokeRect(450, 290, 290, 28);

  const countPct = Math.min(100, (params.vstCount / 100) * 100);
  ctx.fillStyle = params.vstCount > 40 ? "#e05050" : "#8ebd3d";
  ctx.fillRect(452, 292, (countPct / 100) * 286, 24);
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${params.vstCount} Instrumentos/Efectos`, 465, 308);

  // Options toggles (drawn as green/gray circles for FL-style switches)
  ctx.fillStyle = "#e2e4e9";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("CPU Options:", 240, 365);

  const drawSwitch = (x: number, y: number, label: string, active: boolean) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#8ebd3d" : "#555861";
    ctx.fill();
    ctx.strokeStyle = "#111215";
    ctx.stroke();

    if (active) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    ctx.font = "11px sans-serif";
    ctx.fillStyle = active ? "#ffffff" : "#a2a5ab";
    ctx.fillText(label, x + 15, y + 4);
  };

  drawSwitch(245, 395, "Smart Disable (plugins inactivos)", params.smartDisable);
  drawSwitch(245, 425, "Multithreaded Generator Processing", params.multithreaded);
  drawSwitch(245, 455, "Multithreaded Mixer Processing", params.multithreaded); // Bind to same
  drawSwitch(520, 395, "Triple Buffer", params.tripleBuffer);
  drawSwitch(520, 425, "Align Tick Length", true);
  drawSwitch(520, 455, "Safe Overloads Mode", true);

  // 5. Dynamic FL Studio-style Performance / CPU Indicator in Top-Right
  // Dark overlay box
  ctx.fillStyle = "#111215";
  ctx.fillRect(520, 5, 180, 30);
  ctx.strokeStyle = "#434750";
  ctx.strokeRect(520, 5, 180, 30);

  // Calculate dynamic CPU based on simulator logic
  let baseCpu = 10;
  // Vst weight
  baseCpu += (params.vstCount * 1.2);
  // Buffer size weight (lower buffer = higher CPU)
  if (params.bufferSize <= 32) baseCpu *= 2.8;
  else if (params.bufferSize <= 64) baseCpu *= 2.2;
  else if (params.bufferSize <= 128) baseCpu *= 1.7;
  else if (params.bufferSize <= 256) baseCpu *= 1.2;
  else if (params.bufferSize >= 1024) baseCpu *= 0.7;

  // Sample rate weight (higher rate = higher CPU)
  if (params.sampleRate > 96000) baseCpu *= 2.2;
  else if (params.sampleRate > 48000) baseCpu *= 1.5;

  // Driver weight (DirectSound adds CPU overhead)
  if (params.driver.includes("DirectSound") || params.driver.includes("Primary")) {
    baseCpu *= 1.4;
  }

  // Toggles weight (Smart disable saves 30% if vst count is high)
  if (params.smartDisable) {
    baseCpu *= 0.65;
  }
  if (!params.multithreaded) {
    baseCpu *= 1.6;
  }
  if (params.tripleBuffer) {
    baseCpu *= 0.9;
  }

  const finalCpu = Math.min(99, Math.max(2, Math.round(baseCpu)));
  
  // Draw glowing text and bar
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#8ebd3d";
  ctx.fillText("DSP", 530, 23);
  
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = finalCpu > 80 ? "#ff3333" : (finalCpu > 50 ? "#ffb700" : "#00ff66");
  ctx.fillText(`${finalCpu}%`, 560, 24);

  // Bar
  ctx.fillStyle = "#22252a";
  ctx.fillRect(600, 14, 80, 10);
  ctx.fillStyle = finalCpu > 80 ? "#ff3333" : (finalCpu > 50 ? "#ffb700" : "#00ff66");
  ctx.fillRect(600, 14, (finalCpu / 100) * 80, 10);

  return canvas.toDataURL("image/png");
}
