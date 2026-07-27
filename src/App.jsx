import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './pages/Admin';
import Registration from './pages/Registration';
import './App.css';
import './index.css'; // Just in case it's needed
import AnimatedLanding from './pages/AnimatedLanding';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnimatedLanding />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/event/:eventId" element={<Registration />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
