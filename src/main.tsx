import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializePreloadStrategies } from './utils/preloadStrategies'

// Initialize performance optimizations
initializePreloadStrategies();

createRoot(document.getElementById("root")!).render(<App />);
