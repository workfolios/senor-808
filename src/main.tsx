import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './responsive-polish.css';
import './footer-alignment.css';
import './final-visual-refinement.css';
import './footer-responsive-qa.css';
import './footer-responsive-final.css';
import './subheading-refinement.css';
import './process-consolidation.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
