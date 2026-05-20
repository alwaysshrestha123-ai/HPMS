import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import EHR from './pages/EHR';
import StaffManagement from './pages/StaffManagement';
import Billing from './pages/Billing';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;

  const hideNav = ['/login', '/register'].includes(location.pathname) || !user;

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNav && <Navbar />}
      <Routes>
        <Route path="/login"    element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/appointments" element={
          <ProtectedRoute roles={['PATIENT','DOCTOR','ADMIN','NURSE']}>
            <Appointments />
          </ProtectedRoute>} />
        <Route path="/ehr" element={
          <ProtectedRoute roles={['PATIENT','DOCTOR','NURSE','ADMIN']}>
            <EHR />
          </ProtectedRoute>} />
        <Route path="/billing" element={
          <ProtectedRoute roles={['PATIENT','ADMIN','NURSE']}>
            <Billing />
          </ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
