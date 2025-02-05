import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Login from './Login';
import Dashboard from './Dashboard';
import AuditLogs from './AuditLogs';
import reportWebVitals from './reportWebVitals';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} /> 
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/audit" element={<AuditLogs />} /> 
      </Routes>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
