import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { 
  Send, 
  Sparkles, 
  Clock, 
  HelpCircle,
  Database,
  BrainCircuit,
  Cpu,
  RefreshCw
} from "lucide-react";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "ai",
      text: "Welcome back! I am DealMind AI, your persistent sales assistant. I have compiled all account records and customer memories from Hindsight. What would you like to investigate today?",
      sources: ["Local Accounts DB", "Hindsight Long-term Memory Bank"]
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [activeSources, setActiveSources] = useState(["Initial System greeting loaded."]);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    // Load deals so user can see what's available
    api.getDeals().then(setDeals).catch(console.error);
  }, []);

  const promptChips = [
    "What is ABC Technologies' biggest concern?",
    "What happened in the last meeting?",
    "What should I do next?",
    "Which deals are currently at risk?",
    "Why is the Apex Health deal at risk?"
  ];

  const handleSend = async (e, text = null) => {
    if (e) e.preventDefault();
    const query = text || message;
    if (!query.trim() || loading) return;

    setMessage("");
    setChatHistory((prev) => [...prev, { sender: "user", text: query }]);
    setLoading(true);

    try {
      // General agent query
      const response = await api.sendChatMessage(query, null, null);
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: response.response, sources: response.sources }
      ]);
      if (response.sources && response.sources.length > 0) {
        setActiveSources(response.sources);
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: "Error calling AI assistant: " + err.message, sources: ["System Fail-safe"] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chipText) => {
    handleSend(null, chipText);
  };

  return (
    <div className="flex h-screen bg-[#0F172A] text-slate-100 overflow-hidden">
      {/* Left Chat Window */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-700">
        {/* Chat Header */}
        <div className="flex h-16 items-center px-8 border-b border-slate-700 bg-slate-900/50 justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-indigo-400" />
            <h1 className="text-lg font-bold text-white">DealMind AI Sales Assistant</h1>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
            Agent Online
          </span>
        </div>

        {/* Suggestion Chips */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/20 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip)}
              className="rounded-full border border-slate-700 bg-slate-800 hover:border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-2xl ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 border border-slate-700 text-xs font-bold ${
                  msg.sender === "user" ? "bg-indigo-600 text-white" : "bg-slate-900 text-indigo-400"
                }`}>
                  {msg.sender === "user" ? "US" : "AI"}
                </div>
                <div>
                  <div className={`p-4 rounded-xl leading-relaxed text-sm ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pl-1 flex flex-wrap gap-1.5">
                      {msg.sources.map((src, srcIdx) => (
                        <span key={srcIdx} className="inline-flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          <Database className="h-2.5 w-2.5" />
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 text-slate-500 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-indigo-400 shrink-0">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
              </div>
              <div className="py-1">
                <span>Reading deal summaries and recalling long-term memories from Hindsight...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-6 border-t border-slate-700 bg-slate-900/30 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about budgets, pain points, pricing objections, or timelines..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2.5 top-2.5 rounded-lg bg-indigo-600 p-2 hover:bg-indigo-500 transition text-white"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Right Information & Sources Sidebar */}
      <div className="w-80 bg-slate-900/30 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <div className="flex items-center gap-2 mb-3 text-indigo-400">
            <BrainCircuit className="h-5 w-5" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hindsight Grounding</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The AI assistant uses **retrieval-augmented generation (RAG)**. Grounding sources extracted for your current session are shown below.
          </p>
        </div>

        <div className="flex-1 space-y-4">
          <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Retrieved Context Sources</h4>
          <div className="space-y-3">
            {activeSources.map((source, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 leading-relaxed font-semibold">
                {source}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-white flex items-center gap-1">
            <Clock className="h-4 w-4 text-indigo-400" />
            Deal Database Scope
          </h4>
          <p className="text-[10px] text-slate-500 leading-normal">
            Currently tracking {deals.length} active opportunities. The model is constrained to never hallucinate.
          </p>
        </div>
      </div>
    </div>
  );
}
