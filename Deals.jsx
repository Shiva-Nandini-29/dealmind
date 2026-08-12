import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight,
  RefreshCw,
  X
} from "lucide-react";

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("Lead");
  const [probability, setProbability] = useState("10");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const dealList = await api.getDeals();
      const customerList = await api.getCustomers();
      setDeals(dealList);
      setCustomers(customerList);
    } catch (err) {
      setError("Failed to fetch deals: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    if (customers.length === 0) {
      alert("Please create a customer profile first before creating a deal.");
      return;
    }
    setCustomerId(customers[0].id.toString());
    setName("");
    setValue("");
    setStage("Lead");
    setProbability("10");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      customer_id: parseInt(customerId),
      name,
      value: parseFloat(value),
      stage,
      probability: parseFloat(probability),
      risk_level: "LOW" // Backend AI will reassess this
    };

    try {
      const newDeal = await api.createDeal(payload);
      // Run initial AI analysis
      await api.analyzeDeal(newDeal.id);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error saving deal: " + err.message);
    }
  };

  const filteredDeals = deals.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.customer?.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.stage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskBadge = (level) => {
    switch (level) {
      case "HIGH":
        return "bg-rose-950/30 border-rose-500/40 text-rose-400";
      case "MEDIUM":
        return "bg-amber-950/30 border-amber-500/40 text-amber-400";
      default:
        return "bg-green-950/30 border-green-500/40 text-green-400";
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#0F172A] min-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Sales Deals Board</h1>
          <p className="text-slate-400 mt-1">Track pipeline opportunities, estimated values, closing probabilities, and risks.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          Add New Deal
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder="Search deals, customers, or stages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>
        <button onClick={loadData} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition shrink-0">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p>Syncing sales pipeline data...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl max-w-md mx-auto p-6">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-500 mb-4" />
          <p className="text-rose-400 font-medium">{error}</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl">
          <AlertTriangle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <p className="text-slate-400 font-semibold text-lg">No active deals found</p>
          <p className="text-slate-500 text-sm mt-1">Get started by creating your first sales opportunity.</p>
          <button onClick={openAddModal} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500">
            Create Deal
          </button>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-700 bg-slate-800 rounded-xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Deal Name</th>
                  <th className="px-6 py-4">Customer Company</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Probability</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-sm">
                {filteredDeals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-6 py-4 font-bold text-white max-w-xs truncate">
                      {d.name}
                    </td>
                    <td className="px-6 py-4 text-indigo-400 font-medium">
                      {d.customer?.company || "N/A"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(d.value)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
                        {d.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-slate-300">{d.probability}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${getRiskBadge(d.risk_level)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                        {d.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/deals/${d.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/10 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                      >
                        Details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
              <h2 className="text-xl font-bold text-white">Create Deal Opportunity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300">Select Customer Profile</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Deal Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ABC AI Support Platform Integration"
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Deal Value (INR / USD)</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="800000"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    placeholder="10"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Deal Stage</label>
                <select
                  required
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Demo">Demo</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
