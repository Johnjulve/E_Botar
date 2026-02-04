/**
 * Main Entry Point
 * Application initialization
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

/* ==================== Foundation Layer (Loaded Once) ==================== */
// CSS Variables (must be first)
import './assets/styles/variables.css';

// Foundation: Resets & Typography
import './assets/styles/foundation/resets.css';
import './assets/styles/foundation/typography.css';

// External Libraries (loaded once at app level)
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

// Bootstrap Overrides
import './assets/styles/vendors/bootstrap-overrides.css';

/* ==================== Global Components (Loaded Once) ==================== */
import './assets/styles/global/components.css';
import './assets/styles/global/layout.css';
import './assets/styles/global/utilities.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
