import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Глобальный обработчик необработанных Promise
window.addEventListener('unhandledrejection', (event) => {
  // Предотвращаем вывод ошибки в консоль для необработанных Promise
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <App />
)
