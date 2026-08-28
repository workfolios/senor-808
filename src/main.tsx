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
import './final-copy-layout-tuning.css';
import './catalog-refinement-v21.css';
import './catalog-refinement-v21.ts';
import './selected-work-refinement.css';
import './selected-work-refinement.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
