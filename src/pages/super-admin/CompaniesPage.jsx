import { useState, useEffect, useCallback } from "react";
import { useApi } from "../../hooks/useApi";
import Icon from "../../components/Icon";
import AppModal from "../../components/common/AppModal";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import { formatDate } from "../../utils/format";

const PLANS = ["Basic", "Standard", "Professional", "Enterprise"];
const STATUSES = ["Active", "Trial", "Expired", "Suspended"];

const PLAN_COLORS = {
  Basic: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Standard: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  Professional: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Enterprise: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};
const STATUS_COLORS = {
  Active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Trial: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Expired: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Suspended: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const EMPTY_FORM = {
  username: "", userEmail: "", password: "",
  planName: "Basic", planPrice: "",
  planValidity: "", subscriptionStatus: "Active",
  integrationsAccess: false,
};



function toInputDate(d) {
  if (!d) return "";
  try { return new Date(d).toISOString().split("T")[0]; }
  catch { return ""; }
}

const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
const inputCls = "w-full px-3.5 py-2.5 text-sm border border-white/10 rounded-xl bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200";
const selectCls = "w-full px-3.5 py-2.5 text-sm border border-white/10 rounded-xl bg-slate-950/50 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200";

export default function CompaniesPage() {
  const api = useApi();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastRef = { current: null };

  function showToast(type, msg) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ type, msg });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/superadmin/companies");
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || (c.username || "").toLowerCase().includes(q) || (c.userEmail || "").toLowerCase().includes(q);
    const matchPlan = !planFilter || c.planName === planFilter;
    const matchStatus = !statusFilter || c.subscriptionStatus === statusFilter;
    return matchQ && matchPlan && matchStatus;
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(c) {
    setEditingId(c.userid);
    setForm({
      username: c.username || "",
      userEmail: c.userEmail || "",
      password: "",
      planName: c.planName || "Basic",
      planPrice: c.planPrice || "",
      planValidity: toInputDate(c.planValidity),
      subscriptionStatus: c.subscriptionStatus || "Active",
      integrationsAccess: !!c.integrationsAccess,
    });
    setShowModal(true);
  }

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.username.trim() || !form.userEmail.trim()) {
      showToast("error", "Name and email are required.");
      return;
    }
    if (!editingId && !form.password.trim()) {
      showToast("error", "Password is required for new companies.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editingId) {
        await api.put(`/superadmin/companies/${editingId}`, payload);
        showToast("success", "Company updated.");
      } else {
        await api.post("/superadmin/companies", payload);
        showToast("success", "Company created.");
      }
      setShowModal(false);
      await load();
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.del(`/superadmin/companies/${deleteId}`);
      showToast("success", "Company removed.");
      setDeleteId(null);
      await load();
    } catch {
      showToast("error", "Failed to delete.");
      setDeleteId(null);
    }
  }

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.subscriptionStatus === "Active").length,
    expired: companies.filter(c => c.subscriptionStatus === "Expired").length,
    revenue: companies.filter(c => c.subscriptionStatus === "Active" && c.planPrice)
      .reduce((sum, c) => sum + (parseFloat(c.planPrice.replace(/[^0-9.]/g, "")) || 0), 0),
  };

  return (
    <div className="space-y-5 animate-fade-in relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Company Registry</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage registered corporate workspaces, subscription plans, and credential settings.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:scale-105 transition-all bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/30"
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Accounts", value: stats.total, icon: "mdi:office-building-outline", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
          { label: "Active Subscriptions", value: stats.active, icon: "mdi:check-decagram-outline", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Expired Plans", value: stats.expired, icon: "mdi:alert-circle-outline", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
          { label: "Active Revenue (MRR)", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: "mdi:currency-inr", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${s.color}`}>
              <Icon name={s.icon} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
              <p className="text-base font-extrabold text-white leading-tight mt-1">{loading ? "…" : s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-white/10 rounded-xl bg-slate-950/40 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-200"
            />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="text-xs border border-white/10 rounded-xl px-3.5 py-2.5 bg-slate-950/50 text-slate-300 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10">
            <option value="">All Plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs border border-white/10 rounded-xl px-3.5 py-2.5 bg-slate-950/50 text-slate-300 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(search || planFilter || statusFilter) && (
            <button onClick={() => { setSearch(""); setPlanFilter(""); setStatusFilter(""); }} className="text-xs text-indigo-400 hover:text-indigo-300 font-bold px-2 whitespace-nowrap">Clear Filters</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Icon name="mdi:office-building-plus-outline" className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-slate-200 mb-1">No companies found</p>
            <p className="text-xs text-slate-500 mb-5">Try adjusting your filters or provision a new company account.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/30">
              <Icon name="mdi:plus" className="w-4 h-4" /> Add Company
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-normal" style={{ minWidth: "760px" }}>
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 border-b border-white/5">
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide">Company / Admin</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide">Integrations</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide hidden md:table-cell">Valid Until</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c, i) => (
                  <tr key={c.userid} className="transition-colors hover:bg-white/5">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0 border border-white/10 shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600">
                          {(c.username || c.userEmail || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-100 text-xs truncate leading-tight">{c.username || "—"}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{c.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.planName ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_COLORS[c.planName] || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                          {c.planName}
                        </span>
                      ) : <span className="text-[10px] text-slate-500 font-bold">No Plan</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-200 font-semibold">{c.planPrice || <span className="text-slate-500">—</span>}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[c.subscriptionStatus] || "bg-slate-800 text-slate-300"}`}>
                        {c.subscriptionStatus || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.integrationsAccess ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"} border`}>
                        {c.integrationsAccess ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-slate-300 font-medium">{formatDate(c.planValidity)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-slate-400">{formatDate(c.createdDate)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-amber-400 transition-colors border border-transparent hover:border-white/5" title="Edit">
                          <Icon name="mdi:pencil-outline" className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(c.userid)} className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/10" title="Delete">
                          <Icon name="mdi:trash-can-outline" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 bg-slate-950/20">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Showing {filtered.length} of {companies.length} corporate workspaces</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AppModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Company Registry" : "Register New Company"}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all hover:scale-105 bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
            >
              {saving ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:check-circle-outline" className="w-4 h-4" />}
              {saving ? "Saving…" : editingId ? "Update Account" : "Register Company"}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Icon name="mdi:office-building-outline" className="w-3.5 h-3.5 text-indigo-400" /></div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Company / Workspace Admin Info</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Admin Name <span className="text-red-400">*</span></label>
                <input value={form.username} onChange={e => setF("username", e.target.value)} placeholder="Workspace admin name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email Address <span className="text-red-400">*</span></label>
                <input type="email" value={form.userEmail} onChange={e => setF("userEmail", e.target.value)} placeholder="admin@company.com" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{editingId ? "Reset Password" : "Account Password"} {!editingId && <span className="text-red-400">*</span>}</label>
                <input type="password" value={form.password} onChange={e => setF("password", e.target.value)} placeholder={editingId ? "Leave blank to keep existing password" : "Define password (min 8 characters)"} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Subscription */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Icon name="mdi:credit-card-outline" className="w-3.5 h-3.5 text-purple-400" /></div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Subscription Plan & Billing</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Plan Type</label>
                <select value={form.planName} onChange={e => setF("planName", e.target.value)} className={selectCls}>
                  {PLANS.map(p => <option key={p} className="bg-slate-900" value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Plan Price / Cycle</label>
                <input value={form.planPrice} onChange={e => setF("planPrice", e.target.value)} placeholder="e.g. ₹2,999/mo" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Validity Expiration</label>
                <input type="date" value={form.planValidity} onChange={e => setF("planValidity", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Subscription Status</label>
                <select value={form.subscriptionStatus} onChange={e => setF("subscriptionStatus", e.target.value)} className={selectCls}>
                  {STATUSES.map(s => <option key={s} className="bg-slate-900" value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between py-3 px-4 rounded-xl border border-white/5 bg-slate-950/20">
                <div>
                  <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">API Integration Access</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Enabling allows workspace admin to link live WhatsApp, IndiaMART & TradeIndia keys.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setF("integrationsAccess", !form.integrationsAccess)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.integrationsAccess ? "bg-indigo-600" : "bg-slate-800"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${form.integrationsAccess ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppModal>

      {/* Delete Confirm */}
      <AppConfirmDialog
        open={deleteId !== null}
        title="Remove Company Workspace"
        message="Are you sure you want to permanently delete this corporate workspace and revoke all employee/admin access? This database action is irreversible."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-red-600 text-white shadow-red-500/20"}`}>
          <Icon name={toast.type === "success" ? "mdi:check-circle" : "mdi:alert-circle"} className="w-5 h-5 shrink-0" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
