import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Login from './Login';
import Dashboard from './Dashboard';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />  {/* Default route */}
        <Route path="/dashboard" element={<Dashboard />} /> {/* Route for Abc */}
      </Routes>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
