/**
 * Main App Component
 * Root component with providers and layout
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar, Footer } from './components/layout';
import AppRoutes from './routes/AppRoutes';
import './assets/styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell d-flex flex-column">
          <Navbar />
          <main className="main-content flex-grow-1">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
