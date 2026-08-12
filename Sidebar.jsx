import React from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../services/api";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Lightbulb, 
  LogOut,
  ShieldAlert
} from "lucide-react";

export default function Sidebar({ user }) {
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Deals", href: "/deals", icon: DollarSign },
    { name: "AI Assistant", href: "/ai-assistant", icon: MessageSquare },
    { name: "Insights & Risks", href: "/insights", icon: Lightbulb },
  ];

  const handleLogout = () => {
    api.logout();
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-700 bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <Link to="/" className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-400" />
          <span className="text-xl font-bold text-white">DealMind AI</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-slate-700 p-4">
        {user && (
          <div className="mb-4 px-2">
            <p className="text-sm font-semibold text-white truncate">{user.full_name || "Sales Agent"}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
