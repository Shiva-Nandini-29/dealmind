import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Cpu, 
  User, 
  Building, 
  Sparkles, 
  Send,
  RefreshCw,
  Plus,
  X,
  PlusCircle,
  FileText
} from "lucide-react";

export default function DealDetails() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // New Conversation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isSubmittingConv, setIsSubmittingConv] = useState(false);

  const fetchDealData = async () => {
    try {
      const dealData = await api.getDeal(id);
      const timelineData = await api.getTimeline(id);
      const conversationsData = await api.getConversations(id);

      setDeal(dealData);
      setTimeline(timelineData);
      setConversations(conversationsData);
      
      // Initialize chat history with a helpful AI greeting
      setChatHistory([
        {
          sender: "ai",
          text: `Hi! I am your DealMind AI Assistant. I have loaded all persistent memories and historical conversation details for the deal "${dealData.name}". Ask me anything!`,
          sources: ["Database Model", "Hindsight Context Memory"]
        }
      ]);
    } catch (err) {
      setError("Failed to load deal metrics: " + err.message);
    }
  };

  const initData = async () => {
    setLoading(true);
    setError("");
    await fetchDealData();
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, [id]);

  const handleRefreshAI = async () => {
    setRefreshing(true);
    try {
      await api.analyzeDeal(id);
      await fetchDealData();
    } catch (err) {
      alert("Error refreshing AI analysis: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userMessage }]);
    setChatLoading(true);

    try {
      const response = await api.sendChatMessage(userMessage, id, null);
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: response.response, sources: response.sources }
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: "Error: " + err.message }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleLogConversation = async (e) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !transcript.trim()) {
      alert("Please fill out both the title and transcript.");
      return;
    }

    setIsSubmittingConv(true);
    try {
      await api.createConversation(id, {
        title: meetingTitle,
        meeting_date: meetingDate ? new Date(meetingDate).toISOString() : new Date().toISOString(),
        transcript: transcript,
        messages: []
      });
      setIsModalOpen(false);
      setMeetingTitle("");
      setMeetingDate("");
      setTranscript("");
      // Refresh deal data & AI analysis
      await fetchDealData();
      alert("Conversation logged successfully. AI has extracted new memories and recalculated risk parameters.");
    } catch (err) {
      alert("Error logging meeting: " + err.message);
    } finally {
      setIsSubmittingConv(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "HIGH": return "text-rose-400 border-rose-500/30 bg-rose-500/10";
      case "MEDIUM": return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      default: return "text-green-400 border-green-500/30 bg-green-500/10";
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0F172A]">
        <div className="text-center text-slate-400">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p>Assembling opportunity timeline and memories...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-8 text-center bg-[#0F172A] h-full">
        <div className="max-w-md mx-auto rounded-xl border border-red-700 bg-red-950/20 p-6">
          <AlertTriangle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
          <p className="text-rose-400 font-medium mb-4">{error || "Deal not found."}</p>
          <Link to="/deals" className="inline-flex items-center gap-2 text-indigo-400 font-semibold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-slate-100 overflow-hidden">
      {/* Top Cockpit Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-8 py-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/deals" className="rounded-lg p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{deal.name}</h1>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${getRiskColor(deal.risk_level)}`}>
                {deal.risk_level} RISK
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Customer: {deal.customer.name} ({deal.customer.company})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-700 transition"
          >
            <Plus className="h-4 w-4 text-indigo-400" />
            Log Conversation
          </button>
          <button
            onClick={handleRefreshAI}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
          >
            <Cpu className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "AI Thinking..." : "Re-Analyze Deal"}
          </button>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Account Details & Hindsight Memories */}
        <div className="w-1/4 border-r border-slate-700 bg-slate-900/20 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Deal details Card */}
          <div className="glow-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Deal Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-500 block">Deal Value</span>
                <span className="text-sm font-extrabold text-white">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(deal.value)}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-500 block">Probability</span>
                <span className="text-sm font-extrabold text-white">{deal.probability}%</span>
              </div>
              <div className="col-span-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span className="text-slate-500 block">Current Stage</span>
                <span className="text-sm font-extrabold text-indigo-400">{deal.stage}</span>
              </div>
            </div>
          </div>

          {/* Customer profile Card */}
          <div className="glow-card rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Contact Details</h3>
            <div className="space-y-2 text-xs">
              <p className="flex items-center gap-2 text-slate-300">
                <User className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="font-semibold">{deal.customer.name}</span> ({deal.customer.role || "N/A"})
              </p>
              <p className="flex items-center gap-2 text-slate-300">
                <Building className="h-4 w-4 text-slate-500 shrink-0" />
                <span>{deal.customer.company}</span>
              </p>
              {deal.customer.email && <p className="text-slate-400 truncate pl-6">Email: {deal.customer.email}</p>}
              {deal.customer.phone && <p className="text-slate-400 truncate pl-6">Phone: {deal.customer.phone}</p>}
            </div>
          </div>

          {/* AI Memories from Hindsight */}
          <div className="glow-card rounded-xl p-5 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">Persistent AI Memory</h3>
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">Client Budget</span>
                <p className="text-xs text-slate-300 mt-1">{deal.customer.budget || "Pending confirmation."}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">Core Requirements</span>
                <p className="text-xs text-slate-300 mt-1">{deal.customer.requirements || "Awaiting detailed discovery."}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest block">Active Objections</span>
                <p className="text-xs text-slate-300 mt-1 bg-rose-950/20 border border-rose-900/30 p-2 rounded-lg leading-relaxed">
                  {deal.risk_reasons?.includes("Pricing") || deal.risk_reasons?.includes("pricing")
                    ? "Objection: pricing discount or budget limit raised." 
                    : "No active blockers identified yet."}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">Key Decision Makers</span>
                <p className="text-xs text-slate-300 mt-1">{deal.customer.decision_maker || "Unknown."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Conversations & Timeline */}
        <div className="w-1/2 border-r border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Logged Conversations list */}
          <div className="glow-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6 border-b border-slate-700/60 pb-3">
              <h2 className="text-lg font-bold text-white">Logged Meeting Conversations</h2>
              <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                {conversations.length} Meetings
              </span>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No meetings or conversation logs uploaded. Click "Log Conversation" to analyze transcripts.
              </div>
            ) : (
              <div className="space-y-6">
                {conversations.map((conv) => {
                  let takeaways = [];
                  try {
                    takeaways = JSON.parse(conv.key_takeaways || "[]");
                  } catch (e) {
                    takeaways = [];
                  }

                  return (
                    <div key={conv.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-base leading-snug">{conv.title}</h4>
                          <span className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(conv.meeting_date).toLocaleDateString("en-IN", {
                              month: "short", day: "numeric", year: "numeric"
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-indigo-500 pl-3">
                        {conv.summary}
                      </p>
                      {takeaways.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Takeaways</h5>
                          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 pl-1">
                            {takeaways.map((point, idx) => (
                              <li key={idx} className="leading-relaxed">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline chart */}
          <div className="glow-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-700/60 pb-3">Opportunity History Timeline</h2>
            <div className="flow-root pl-2">
              {timeline.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-4">No events logged.</div>
              ) : (
                <ul className="-mb-8">
                  {timeline.map((act, idx) => (
                    <li key={act.id}>
                      <div className="relative pb-8">
                        {idx !== timeline.length - 1 && (
                          <span className="absolute left-3 top-3 -ml-px h-full w-0.5 bg-slate-700" />
                        )}
                        <div className="relative flex space-x-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-indigo-400 ring-4 ring-slate-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight">
                              {act.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                              {act.description}
                            </p>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              {new Date(act.activity_date).toLocaleDateString("en-IN", {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
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
        </div>

        {/* Right Column: AI Risk Diagnostics, Next Best Action, & Deal Chat */}
        <div className="w-1/4 p-6 flex flex-col gap-6 overflow-y-auto bg-slate-900/10">
          {/* Risk Alerts & Diagnostics */}
          <div className="glow-card rounded-xl p-5 border-l-4 border-l-rose-500/50">
            <div className="flex items-center gap-2 mb-3 text-rose-400 font-bold">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Risk Diagnostics</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              {deal.risk_reasons || "No risk reasons logged. Run analyze deal to assess."}
            </p>
          </div>

          {/* Next Best Actions */}
          <div className="glow-card rounded-xl p-5 border-l-4 border-l-indigo-500/50">
            <div className="flex items-center gap-2 mb-3 text-indigo-400 font-bold">
              <Sparkles className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Next Best Action</h3>
            </div>
            <p className="text-xs text-indigo-300 leading-relaxed font-semibold bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
              {deal.next_action || "Awaiting AI recommendation analysis."}
            </p>
          </div>

          {/* Integrated Deal AI Chat */}
          <div className="glow-card rounded-xl flex-1 flex flex-col overflow-hidden max-h-[450px]">
            <div className="bg-slate-900/50 border-b border-slate-700 px-4 py-3 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-white">Deal Agent Workspace</span>
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-3 rounded-lg max-w-[85%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-slate-900/80 border border-slate-700 text-slate-300 rounded-tl-none"
                  }`}>
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <span className="text-[9px] text-slate-500 mt-1 pl-1">
                      Sources: {msg.sources.join(", ")}
                    </span>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>Searching Hindsight memory...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-700 bg-slate-900/30 shrink-0 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about ABC's biggest concern..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
              <button type="submit" disabled={chatLoading} className="rounded-lg bg-indigo-600 px-3 py-1.5 hover:bg-indigo-500 transition text-white">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Log Conversation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
              <h2 className="text-xl font-bold text-white">Log Call / Meeting Conversation</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleLogConversation} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300">Meeting / Interaction Title</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Discovery Call with CFO, Pricing review"
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Meeting Date</label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="block text-sm font-semibold text-slate-300">Meeting Transcript / Conversation Log</label>
                  <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Intelligence enabled
                  </span>
                </div>
                <textarea
                  rows="6"
                  required
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Salesperson: What are your key concerns?&#10;Rahul: Budget is limited. We need a 15% discount before the CFO signs off..."
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-700 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConv}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  {isSubmittingConv ? "Analyzing conversation..." : "Analyze & Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
