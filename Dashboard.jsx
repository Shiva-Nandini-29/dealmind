import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { 
  Users, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError("Failed to load dashboard metrics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0F172A]">
        <div className="text-center text-slate-400">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p>Analyzing deal pipelines and loading memory models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-[#0F172A] h-full">
        <div className="max-w-md mx-auto rounded-xl border border-red-700 bg-red-950/20 p-6">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-red-300 font-medium mb-4">{error}</p>
          <button onClick={fetchStats} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    { name: "Total Customers", value: stats.total_customers, icon: Users, color: "text-blue-400 bg-blue-500/10" },
    { name: "Active Deals", value: stats.active_deals, icon: TrendingUp, color: "text-indigo-400 bg-indigo-500/10" },
    { name: "Won Deals", value: stats.won_deals, icon: Award, color: "text-green-400 bg-green-500/10" },
    { name: "At-Risk Deals", value: stats.at_risk_deals, icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10" },
  ];

  return (
    <div className="p-8 space-y-8 bg-[#0F172A] min-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Deal Intelligence Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time pipeline analytics, risk models, and persistent memories.</p>
        </div>
        <button 
          onClick={fetchStats}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Sync Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.name} className="glow-card rounded-xl p-6 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-400">{kpi.name}</span>
                <div className={`rounded-lg p-2 ${kpi.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-white">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Pipeline Value & Funnel Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glow-card rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-2">Deal Pipeline Valuation</h2>
          <p className="text-slate-400 text-sm mb-6">Total active pipeline value is summarized below (excluding Won/Lost deals).</p>
          
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-4xl font-extrabold text-indigo-400">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(stats.total_pipeline_value)}
            </span>
            <span className="text-slate-500 text-sm font-semibold">Active Value</span>
          </div>

          {/* Simple Visual pipeline bar */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Negotiation Stage</span>
                <span>60% Average Probability</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "60%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Qualification Stage</span>
                <span>30% Average Probability</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "30%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Sales Insights panel */}
        <div className="glow-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Urgent AI Risk Alerts</h2>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {stats.recent_insights.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  No critical risks or blockers detected in current active deals.
                </div>
              ) : (
                stats.recent_insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <p className="text-slate-300 leading-relaxed font-medium">{insight}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link to="/insights" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-xs font-bold text-indigo-400 hover:bg-slate-700 transition">
            View All Insights
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Recent Activities Timeline & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity logs */}
        <div className="lg:col-span-2 glow-card rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Recent Sales Activities</h2>
          <div className="flow-root">
            {stats.recent_activities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No recent activity logged. Create deals or conversations to get started.
              </div>
            ) : (
              <ul className="-mb-8">
                {stats.recent_activities.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== stats.recent_activities.length - 1 ? (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-700" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-indigo-400 ring-8 ring-slate-800">
                            <Clock className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {activity.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {activity.description}
                          </p>
                          <span className="text-xs text-slate-500 mt-1 block">
                            {new Date(activity.activity_date).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quick Tools */}
        <div className="glow-card rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white mb-2">Pipeline Quick Actions</h2>
          
          <Link to="/deals" className="flex items-center justify-between p-4 rounded-xl bg-indigo-950/20 border border-indigo-700/30 hover:bg-indigo-950/40 transition group">
            <div>
              <p className="text-sm font-bold text-indigo-400">Manage Active Deals</p>
              <p className="text-xs text-slate-400 mt-1">Review stages and deal values.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-indigo-500 group-hover:translate-x-1 transition" />
          </Link>

          <Link to="/ai-assistant" className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 transition group">
            <div>
              <p className="text-sm font-bold text-white">Query AI Assistant</p>
              <p className="text-xs text-slate-400 mt-1">Search historical context & deal concerns.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition" />
          </Link>

          <Link to="/customers" className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 transition group">
            <div>
              <p className="text-sm font-bold text-white">Customers Database</p>
              <p className="text-xs text-slate-400 mt-1">Add new contacts or edit pain points.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}
