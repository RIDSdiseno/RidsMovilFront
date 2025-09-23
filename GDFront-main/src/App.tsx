// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginRids from "./host/login";
import Dashboard from "./host/Dashboard";
import Layout from "./host/Layout";
import Usuarios from "../src/host/Usuarios";
import Registro from "./components/dashboard/Registro";


export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginRids />} />
      
      
      {/* Con layout */}
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="registro" element={<Registro />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
