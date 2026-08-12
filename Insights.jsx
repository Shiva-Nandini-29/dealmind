import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ArrowRight,
  RefreshCw,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInsights = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getInsights();
      setInsights(data);
    } catch (err) {
      setError("Failed to fetch deal insights: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const getInsightIcon = (insight) => {
    if (insight.startsWith("WARNING:")) {
      return <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />;
    } else if (insight.startsWith("ALERT:")) {
      return <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />;
    } else if (insight.startsWith("REMINDER:")) {
      return <Calendar className="h-5 w-5 text-indigo-400 shrink-0" />;
    } else {
      return <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />;
    }
  };

  const getInsightStyles = (insight) => {
    if (insight.startsWith("WARNING:")) {
      return "border-l-rose-500 bg-rose-950/10 border-rose-800/30";
    } else if (insight.startsWith("ALERT:")) {
      return "border-l-amber-500 bg-amber-950/10 border-amber-800/30";
    } else if (insight.startsWith("REMINDER:")) {
      return "border-l-indigo-500 bg-indigo-950/10 border-indigo-800/30";
    } else {
      return "border-l-green-500 bg-green-950/10 border-green-800/30";
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#0F172A] min-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-indigo-400" />
            AI Deal Intelligence & Risks
          </h1>
          <p className="text-slate-400 mt-1">
            Risk alerts, recommended actions, and timeline reminders generated from conversations and Hindsight memory.
          </p>
        </div>
        <button
          onClick={loadInsights}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Insights
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p>Analyzing pipelines for risk triggers...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl max-w-md mx-auto p-6">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-500 mb-4" />
          <p className="text-rose-400 font-medium">{error}</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-8 max-w-lg mx-auto">
          <Info className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <p className="text-slate-400 font-semibold text-lg">No critical risk alerts</p>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            Congratulations! All deals are running smoothly. Make sure to log conversations regularly for continuous risk assessments.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`glow-card rounded-xl p-5 border-l-4 flex gap-4 items-start ${getInsightStyles(insight)}`}
            >
              {getInsightIcon(insight)}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                  {insight.replace(/^(WARNING:|ALERT:|REMINDER:)\s*/, "")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
