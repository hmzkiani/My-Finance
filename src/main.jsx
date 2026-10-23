import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { AppErrorBoundary } from './AppErrorBoundary.jsx';
import { AuthProvider } from './AuthGate.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary><AuthProvider><App /></AuthProvider></AppErrorBoundary>
  </React.StrictMode>
);
