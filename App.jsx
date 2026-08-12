import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { api } from "./services/api";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Deals from "./pages/Deals";
import DealDetails from "./pages/DealDetails";
import AIAssistant from "./pages/AIAssistant";
import Insights from "./pages/Insights";
import Sidebar from "./components/Sidebar";

function PrivateLayout({ children, user, setUser }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token && !user) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        });
    }
  }, [token, user]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F172A]">
      <Sidebar user={user} />
      <main className="flex-1 overflow-hidden h-full">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        {/* Authentication */}
        <Route path="/login" element={<Login />} />

        {/* Private Routes */}
        <Route
          path="/"
          element={
            <PrivateLayout user={user} setUser={setUser}>
              <Dashboard />
            </PrivateLayout>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateLayout user={user} setUser={setUser}>
              <Customers />
            </PrivateLayout>
          }
        />
        <Route
          path="/deals"
          element={
            <PrivateLayout user={user} setUser={setUser}>
              <Deals />
            </PrivateLayout>
          }
        />
        <Route
          path="/deals/:id"
          element={
            <PrivateLayout user={user} setUser={setUser}>
              <DealDetails />
            </PrivateLayout>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <PrivateLayout user={user} setUser={setUser}>
              <AIAssistant />
            </PrivateLayout>
          }
        />
        <Route
          path="/insights"
          element={
            <PrivateLayout user={user} setUser={setUser}>
              <Insights />
            </PrivateLayout>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
