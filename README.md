# FL Studio Advisor - Desktop Application

🎵 **Asesor de Optimización de FL Studio en Tiempo Real**

Aplicación de escritorio independiente que analiza tu configuración de FL Studio y sistema de audio usando IA (Gemini), proporcionando recomendaciones personalizadas para optimizar el rendimiento.

## ✨ Características

### 🖼️ Captura y Análisis
- **Captura nativa de pantalla** - Atajo: `Ctrl+Shift+S` (Windows/Linux) o `Cmd+Shift+S` (Mac)
- **Análisis con IA Gemini** - Detecta problemas de rendimiento automáticamente
- **Soporte multi-display** - Selecciona qué pantalla analizar
- **Notas personalizadas** - Agrega contexto a tus análisis

### 🔍 Resultados Detallados
- **Problemas detectados** - Clasificados por severidad (baja, media, alta)
- **Métricas del sistema** - Buffer size, sample rate, latencia, driver de audio
- **Ahorro de CPU estimado** - Predicción de mejora de rendimiento
- **Comandos de optimización** - Scripts listos para ejecutar (Windows/Mac/Linux)
- **Diagnóstico detallado** - Explicación completa en Markdown

### 💬 Chat Asesor
- **Conversación continua** - Pregunta sobre FL Studio y optimización de audio
- **Historial de mensajes** - Mantiene contexto de la conversación
- **Respuestas en español** - Asesor especializado en FL Studio
- **Atajo de teclado** - `Ctrl+Shift+C` para limpiar chat

### 📚 Historial Persistente
- **Base de datos SQLite** - Todos tus análisis guardados localmente
- **Búsqueda rápida** - Accede a análisis anteriores al instante
- **Gestión de datos** - Elimina análisis individuales o limpia todo
- **Atajo de teclado** - `Ctrl+H` para mostrar historial

### 🌓 Tema Claro/Oscuro
- **Interfaz adaptativa** - Cambia entre tema claro, oscuro o automático
- **Preferencia del sistema** - Detecta tu preferencia de SO
- **Persistencia** - Guarda tu preferencia

### ⌨️ Atajos de Teclado
| Atajo | Función |
|-------|----------|
| `Ctrl+Shift+S` | Capturar pantalla |
| `Ctrl+H` | Mostrar historial |
| `Ctrl+Shift+C` | Limpiar chat |
| `Ctrl+Q` | Salir de la aplicación |

## 🚀 Instalación y Uso

### Requisitos
- Node.js 16+ 
- npm o yarn
- Clave API de Gemini (gratuita en https://ai.google.dev)

### Pasos de Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/mmiiguel2020-code/fl-asesor-.git
cd fl-asesor-
git checkout desktop
```

2. **Instala dependencias**
```bash
npm install
```

3. **Configura variables de entorno**
```bash
cp .env.example .env.local
```

Edita `.env.local` y agrega tu clave API:
```env
GEMINI_API_KEY=tu_clave_aqui
```

4. **Ejecuta en desarrollo**
```bash
npm run dev
```

La aplicación se abrirá automáticamente con hot reload habilitado.

## 📦 Build y Distribución

### Compilar para producción
```bash
npm run build
```

### Crear ejecutables distribuibles

**Windows:**
```bash
npm run dist:win
```
Genera: `dist/FL Studio Advisor Setup 1.0.0.exe` y versión portable

**macOS:**
```bash
npm run dist:mac
```
Genera: `dist/FL Studio Advisor-1.0.0.dmg`

**Linux:**
```bash
npm run dist:linux
```
Genera: `dist/FL Studio Advisor-1.0.0.AppImage` y `.deb`

### Crear todos los formatos
```bash
npm run dist
```

## 📁 Estructura del Proyecto

```
fl-asesor-/
├── src/
│   ├── electron/
│   │   ├── main.ts              # Proceso principal de Electron
│   │   ├── preload.ts           # Puente IPC seguro
│   │   ├── ipc-handlers.ts      # Manejadores de API
│   │   ├── database.ts          # Gestión de SQLite
│   │   ├── screenshot.ts        # Captura de pantalla nativa
│   │   └── shortcuts.ts         # Atajos de teclado
│   ├── components/
│   │   ├── App.tsx              # Componente principal
│   │   ├── ScreenshotCapturer.tsx
│   │   ├── Chat.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── Issue.tsx
│   │   ├── Command.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useElectronAPI.ts    # Hook para API de Electron
│   │   └── useTheme.ts          # Hook para tema
│   ├── main.tsx                 # Punto de entrada React
│   └── index.css                # Estilos Tailwind
├── dist/                        # Archivos compilados
├── package.json
├── vite.config.ts               # Config Vite
├── vite.electron.config.ts      # Config Electron build
├── tsconfig.json
└── README.md
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno

Crea `.env.local`:
```env
# API de Gemini (requerido)
GEMINI_API_KEY=your_api_key_here

# Opcional
NODE_ENV=development
```

### TypeScript
La aplicación está completamente tipada. Usa:
```bash
npm run lint  # Verificar errores TypeScript
```

## 🏗️ Arquitectura

### Main Process (Electron)
- Gestiona ventana principal
- Maneja IPC (comunicación renderer ↔ main)
- Acceso a APIs nativas (screenshot, notificaciones, etc.)
- Gestión de base de datos SQLite
- Llamadas a API Gemini

### Renderer Process (React)
- Interfaz de usuario
- Captura de entrada del usuario
- Visualización de resultados
- Gestión de estado local

### IPC Bridge (preload.ts)
- Expone APIs seguras al renderer
- Previene acceso directo a Node.js
- Aislamiento de contexto habilitado

## 🔐 Seguridad

✅ **Context Isolation habilitado** - Renderer no tiene acceso directo a Node.js
✅ **Preload Script** - APIs expuestas controladamente
✅ **Sandbox habilitado** - Procesos renderer corrren en sandbox
✅ **HTTPS forzado** - En producción (si aplica)

## 📊 Base de Datos

### Esquema SQLite
```sql
CREATE TABLE analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imageBase64 TEXT NOT NULL,
  mimeType TEXT,
  customNotes TEXT,
  analysisResults TEXT,      -- JSON stringified
  timestamp DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Ubicación:**
- Windows: `%APPDATA%/FL Studio Advisor/fl-advisor.db`
- macOS: `~/Library/Application Support/FL Studio Advisor/fl-advisor.db`
- Linux: `~/.config/FL Studio Advisor/fl-advisor.db`

## 🤖 API Gemini

La aplicación usa:
- **Modelo**: `gemini-3.5-flash` (rápido y económico)
- **Análisis**: Vision + JSON schema para resultados estructurados
- **Chat**: Conversación multi-turn con historial

### Ejemplo de respuesta de análisis:
```json
{
  "detectedIssues": [
    {
      "title": "Buffer size muy pequeño",
      "severity": "high",
      "description": "Un buffer de 64 muestras causa latencia baja pero alto CPU.",
      "recommendation": "Aumenta a 256 muestras en Opciones > Audio"
    }
  ],
  "bufferSize": 64,
  "sampleRateHz": 44100,
  "driverDetected": "ASIO4ALL",
  "estimatedCpuSavingPct": 35,
  "latencyMs": 3.5,
  "commands": [...],
  "explanation": "..."
}
```

## 🐛 Troubleshooting

### "No se carga la API de Electron"
- Verifica que estés usando el puerto 5173 en desarrollo
- Reinicia `npm run dev`

### "Error al capturar pantalla"
- En Linux: Necesitas permisos de escritorio
- En Mac: Permite acceso a la pantalla en Preferencias > Seguridad

### "No se conecta a Gemini"
- Verifica tu `GEMINI_API_KEY` en `.env.local`
- Comprueba conexión a internet
- Revisa límites de cuota en https://ai.google.dev

### "Base de datos corrupta"
```bash
# Elimina la BD y crea una nueva
rm ~/Library/Application\ Support/FL\ Studio\ Advisor/fl-advisor.db  # macOS
rm %APPDATA%/FL Studio Advisor/fl-advisor.db                        # Windows
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [Electron](https://www.electronjs.org/) - Framework de aplicaciones de escritorio
- [React](https://react.dev/) - Librería de UI
- [Vite](https://vitejs.dev/) - Build tool moderno
- [Tailwind CSS](https://tailwindcss.com/) - Utilidad CSS
- [Google Gemini AI](https://ai.google.dev/) - IA y análisis
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Base de datos SQL

## 📧 Contacto

Tienes preguntas o sugerencias? Abre un issue en el repositorio.

---

**Hecho con ❤️ para productores de FL Studio**

*v1.0.0 - 2026*
