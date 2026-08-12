import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Briefcase, 
  DollarSign, 
  UserCheck, 
  AlertCircle,
  RefreshCw,
  X
} from "lucide-react";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [requirements, setRequirements] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [budget, setBudget] = useState("");
  const [decisionMaker, setDecisionMaker] = useState("");

  const loadCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError("Failed to fetch customers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setName("");
    setCompany("");
    setRole("");
    setEmail("");
    setPhone("");
    setIndustry("");
    setRequirements("");
    setPainPoints("");
    setBudget("");
    setDecisionMaker("");
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setIsEditing(true);
    setCurrentId(c.id);
    setName(c.name);
    setCompany(c.company);
    setRole(c.role || "");
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setIndustry(c.industry || "");
    setRequirements(c.requirements || "");
    setPainPoints(c.pain_points || "");
    setBudget(c.budget || "");
    setDecisionMaker(c.decision_maker || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      company,
      role,
      email,
      phone,
      industry,
      requirements,
      pain_points: painPoints,
      budget,
      decision_maker: decisionMaker,
    };

    try {
      if (isEditing) {
        await api.updateCustomer(currentId, payload);
      } else {
        await api.createCustomer(payload);
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      alert("Error saving customer: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer? This will delete all linked deals and conversations.")) {
      try {
        await api.deleteCustomer(id);
        loadCustomers();
      } catch (err) {
        alert("Error deleting customer: " + err.message);
      }
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 bg-[#0F172A] min-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Customers Directory</h1>
          <p className="text-slate-400 mt-1">Manage accounts, record requirements, pain points, and decision makers.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" />
          Add Customer
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
            placeholder="Search by name, company, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>
        <button onClick={loadCustomers} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition shrink-0">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p>Fetching active clients list...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl max-w-md mx-auto p-6">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-4" />
          <p className="text-rose-400 font-medium">{error}</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
          <p className="text-slate-400 font-semibold text-lg">No customers found</p>
          <p className="text-slate-500 text-sm mt-1">Get started by creating your first customer profile.</p>
          <button onClick={openAddModal} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500">
            Create Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredCustomers.map((c) => (
            <div key={c.id} className="glow-card rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{c.name}</h2>
                    <p className="text-sm font-medium text-indigo-400 mt-0.5">
                      {c.role} @ {c.company}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-950/30 hover:text-red-400 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sub details */}
                <div className="grid grid-cols-2 gap-4 my-4 border-t border-b border-slate-700/60 py-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400 truncate">{c.industry || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400 truncate">Budget: {c.budget || "N/A"}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400 truncate">Decision Maker: {c.decision_maker || "Unknown"}</span>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {c.requirements && (
                    <div>
                      <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">Key Requirements</h4>
                      <p className="text-sm text-slate-300 mt-1 line-clamp-2">{c.requirements}</p>
                    </div>
                  )}
                  {c.pain_points && (
                    <div>
                      <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wide">Pain Points</h4>
                      <p className="text-sm text-slate-300 mt-1 line-clamp-2">{c.pain_points}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? "Edit Customer Details" : "Create Customer Profile"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Company</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="ABC Technologies"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Role / Job Title</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="CTO"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Technology"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@abctech.com"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Budget Details</label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="₹8,00,000"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300">Decision Maker Name</label>
                  <input
                    type="text"
                    value={decisionMaker}
                    onChange={(e) => setDecisionMaker(e.target.value)}
                    placeholder="Rahul Sharma (CTO)"
                    className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Customer Requirements</label>
                <textarea
                  rows="3"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="What core features are they looking for? e.g., AI customer support integration with custom NLP models."
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300">Customer Pain Points</label>
                <textarea
                  rows="3"
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  placeholder="What details explain their frustrations? e.g., High operational costs, manual scaling blockers."
                  className="w-full mt-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
