import './theme/tokens.css';
import './theme/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './observatory.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
