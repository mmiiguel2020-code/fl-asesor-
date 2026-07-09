# FL Studio Advisor - Development Guide

## 🛠️ Setup para Desarrolladores

### Prerequisitos
- Node.js 16+ (recomendado 18+)
- npm o yarn
- Git
- Clave API de Gemini (https://ai.google.dev/)

### Instalación Inicial

```bash
# Clona el repositorio
git clone https://github.com/mmiiguel2020-code/fl-asesor-.git
cd fl-asesor-

# Checkout rama desktop
git checkout desktop

# Instala dependencias
npm install

# Configura archivo .env.local
cp .env.example .env.local
# Edita .env.local y agrega tu GEMINI_API_KEY
```

## 🚀 Ejecutar en Desarrollo

```bash
npm run dev
```

Esto:
1. Inicia servidor Vite en `http://localhost:5173`
2. Compila código de Electron en watch mode
3. Abre aplicación Electron automáticamente
4. Habilita hot reload para cambios rápidos

## 📦 Build para Producción

```bash
# Build solo (sin empaquetar)
npm run build

# Empaquetar como ejecutable
npm run dist

# Plataforma específica
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 🧪 Testing

```bash
# Verificar tipos TypeScript
npm run lint

# En desarrollo, abre DevTools: Ctrl+Shift+I
```

## 📂 Estructura de Archivos

```
src/
├── electron/          # Código del main process
├── components/        # Componentes React
├── hooks/             # Custom hooks
├── App.tsx            # Componente principal
├── main.tsx           # Entrada React
└── index.css          # Estilos globales
```

## 🔄 Flujo de Desarrollo

1. **Cambios en React** → Auto reload en el navegador
2. **Cambios en Electron** → Reinicia la app automáticamente (en watch mode)
3. **Cambios en estilos** → Hot module reload
4. **Cambios en tipos** → TypeScript compila automáticamente

## 🐛 Debugging

### DevTools
```
Ctrl+Shift+I (Windows/Linux)
Cmd+Option+I (macOS)
```

### Logs del Main Process
```bash
# Abre consola en la terminal donde ejecutas npm run dev
```

### Logs del Renderer
```typescript
// En componentes React
console.log('Mi mensaje'); // Aparece en DevTools
```

## 📝 Convenciones de Código

### Nombres de Archivos
- Componentes: PascalCase (`ScreenshotCapturer.tsx`)
- Hooks: camelCase con prefijo `use` (`useElectronAPI.ts`)
- Utils: camelCase (`ipc-handlers.ts`)

### Estructura de Componentes
```typescript
import React from 'react';
import { Icon } from 'lucide-react';

interface Props {
  // Props tipadas
}

export function MyComponent({ prop }: Props) {
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

## 🔐 Seguridad

- ✅ No expongas credenciales en el código
- ✅ Usa `.env.local` para secretos
- ✅ Valida input del usuario
- ✅ Mantén Context Isolation habilitado

## 🚀 Deployment

### GitHub Releases
1. Crea un tag: `git tag v1.0.0`
2. Push: `git push origin v1.0.0`
3. GitHub Actions compilará automáticamente (configurable)
4. Sube ejecutables a Releases

## 📚 Recursos Útiles

- [Documentación de Electron](https://www.electronjs.org/docs)
- [Documentación de Vite](https://vitejs.dev/)
- [API de Gemini](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## ❓ Preguntas Frecuentes

**P: ¿Cómo agrego una nueva dependencia?**
```bash
npm install nombre-paquete
```

**P: ¿Cómo elimino node_modules?**
```bash
rm -rf node_modules && npm install
```

**P: ¿Cómo cambio el puerto de desarrollo?**
Edita `vite.config.ts` y cambia `server.port`

**P: ¿Cómo agrego un nuevo atajo de teclado?**
Edita `src/electron/shortcuts.ts` y usa `globalShortcut.register()`

## 🤝 Contribuciones

Sigue estos pasos:
1. Crea una rama desde `desktop`
2. Haz commits descriptivos
3. Abre un PR con explicación clara
4. Pasa linting y builds

---

**¡Happy coding! 🎉**
