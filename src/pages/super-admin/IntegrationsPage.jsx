import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useTeamMember } from "../../hooks/useTeamMember";
import Icon from "../../components/Icon";
import AppDrawer from "../../components/common/AppDrawer";
import { useAuthStore } from "../../stores/auth";

const INTEGRATIONS_CONFIG = [
  {
    key: "INDIAMART",
    name: "IndiaMART API",
    description: "Import incoming leads directly from IndiaMART enquiries via Pull API. Synchronizes lead records on a 5-minute interval.",
    icon: "mdi:store-outline",
    color: "from-orange-500/20 to-red-500/20 border-orange-500/30 text-orange-400",
    bg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    fields: [
      { key: "apiKey", label: "CRM API Key", placeholder: "Your IndiaMART glusr_crm_key", type: "text" },
      { key: "apiUrl", label: "API Endpoint URL", placeholder: "https://mapi.indiamart.com/wservce/crm/crmListing/v2/", type: "text" },
    ],
    docs: "https://seller.indiamart.com/",
  },
  {
    key: "TRADEINDIA",
    name: "TradeIndia Portal",
    description: "Sync directory enquiries automatically from TradeIndia into your CRM inbox.",
    icon: "mdi:briefcase-check-outline",
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400",
    bg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    fields: [
      { key: "apiKey", label: "TradeIndia API Key / User ID", placeholder: "Your API Key", type: "text" },
      { key: "apiUrl", label: "API Endpoint URL", placeholder: "https://www.tradeindia.com/utils/my_inquiry.html", type: "text" },
    ],
    docs: "https://www.tradeindia.com/",
  },
  {
    key: "WHATSAPP",
    name: "WhatsApp Business API",
    description: "Send instant notification dispatches and auto-replies to leads using the Meta API service.",
    icon: "mdi:whatsapp",
    color: "from-green-500/20 to-emerald-600/20 border-green-500/30 text-green-400",
    bg: "bg-green-500/10",
    iconColor: "text-green-400",
    fields: [
      { key: "apiKey", label: "Access Token", placeholder: "Your WhatsApp Business API token", type: "password" },
      { key: "apiUrl", label: "Phone Number ID / API URL", placeholder: "Phone number ID or API base URL", type: "text" },
      { key: "additionalConfig", label: "Additional Config (JSON)", placeholder: '{"businessAccountId": "..."}', type: "textarea" },
    ],
    docs: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    key: "SMTP_EMAIL",
    name: "SMTP Email Server",
    description: "Connect system transactional mail servers for sending notifications, reports, and auto-assign alerts.",
    icon: "mdi:email-fast-outline",
    color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-400",
    bg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    fields: [
      { key: "apiUrl", label: "SMTP Host", placeholder: "smtp.gmail.com", type: "text" },
      { key: "apiKey", label: "SMTP Password / App Password", placeholder: "Your SMTP password", type: "password" },
      { key: "additionalConfig", label: "Port & Username (JSON)", placeholder: '{"port": 587, "username": "you@gmail.com"}', type: "textarea" },
    ],
    docs: "https://support.google.com/mail/answer/7126229",
  }
];

const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
const inputCls = "w-full px-3.5 py-2.5 text-sm border border-white/10 rounded-xl bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200";
const selectCls = "w-full px-3.5 py-2.5 text-sm border border-white/10 rounded-xl bg-slate-950/50 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200";

export default function IntegrationsPage() {
  const api = useApi();
  const { getAll } = useTeamMember();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  
  const [configs, setConfigs] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});
  const [syncing, setSyncing] = useState({});
  const [toast, setToast] = useState(null);
  const [modalKey, setModalKey] = useState(null);
  const [formData, setFormData] = useState({});

  const toastRef = { current: null };

  if (!isSuperAdmin && !user?.integrationsAccess) {
    return <Navigate to="/home" replace />;
  }

  function showToast(type, msg) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ type, msg });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [integrationsData, membersData] = await Promise.all([
        api.get("/integrations"),
        getAll()
      ]);
      
      const map = {};
      (Array.isArray(integrationsData) ? integrationsData : []).forEach(item => { map[item.name] = item; });
      setConfigs(map);
      
      setTeamMembers(Array.isArray(membersData) ? membersData : []);
    } catch {
      setConfigs({});
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  function openConfig(key) {
    const existing = configs[key] || {};
    setFormData({
      enabled: existing.enabled ?? false,
      apiKey: existing.apiKey || "",
      apiUrl: existing.apiUrl || "",
      additionalConfig: existing.additionalConfig || "",
      autoAssignUserId: existing.autoAssignUserId || "",
    });
    setModalKey(key);
  }

  function setFD(k, v) { setFormData(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!modalKey) return;
    setSaving(s => ({ ...s, [modalKey]: true }));
    try {
      await api.put(`/integrations/${modalKey}`, { ...formData, name: modalKey });
      showToast("success", `${modalKey} integration saved.`);
      await load();
      setModalKey(null);
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to save integration.");
    } finally {
      setSaving(s => ({ ...s, [modalKey]: false }));
    }
  }

  async function toggleEnable(key, currentEnabled) {
    const existing = configs[key] || {};
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await api.put(`/integrations/${key}`, { ...existing, name: key, enabled: !currentEnabled });
      showToast("success", `${key} ${!currentEnabled ? "enabled" : "disabled"}.`);
      await load();
    } catch {
      showToast("error", "Failed to update.");
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  }

  async function testConnection(key) {
    setTesting(t => ({ ...t, [key]: true }));
    try {
      await api.post(`/integrations/${key}/test`);
      showToast("success", "Connection successful! Service is reachable.");
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Connection failed. Please check your API key and URL.");
    } finally {
      setTesting(t => ({ ...t, [key]: false }));
    }
  }

  async function triggerSync(key) {
    setSyncing(s => ({ ...s, [key]: true }));
    try {
      await api.post(`/integrations/${key}/sync`);
      showToast("success", "Sync completed successfully! New leads pulled.");
      await load();
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Sync failed. Please check your connection and credentials.");
    } finally {
      setSyncing(s => ({ ...s, [key]: false }));
    }
  }

  const activeConfig = INTEGRATIONS_CONFIG.find(c => c.key === modalKey);

  return (
    <div className="space-y-5 animate-fade-in relative z-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">API Integration Services</h1>
        <p className="text-xs text-slate-400 mt-0.5">Securely manage third-party APIs for IndiaMART, WhatsApp, and SMTP servers. Assign imported leads to your team members automatically.</p>
      </div>

      {/* Stats Bar */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 px-5 py-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span className="text-white font-extrabold">{Object.values(configs).filter(c => c.enabled).length}</span> of {INTEGRATIONS_CONFIG.length} modules active
            </span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-xs text-slate-400 font-medium">Automatic system synchronization routines occur periodically in the background.</p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {INTEGRATIONS_CONFIG.map(intg => {
          const cfg = configs[intg.key] || {};
          const isEnabled = cfg.enabled || false;
          const isConfigured = !!(cfg.apiKey || cfg.apiUrl);
          const isSaving = saving[intg.key];
          const isTesting = testing[intg.key];

          const isHealthy = cfg.syncStatus === "SUCCESS";
          const isFailing = cfg.syncStatus === "FAILURE";
          const lastSync = cfg.lastSyncTime ? new Date(cfg.lastSyncTime).toLocaleString("en-IN") : "Never run";

          return (
            <div
              key={intg.key}
              className={`bg-slate-900/40 backdrop-blur-md flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
                isEnabled 
                  ? "border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.08)]" 
                  : "border-white/5 shadow-md"
              }`}
            >
              {/* Card Header */}
              <div className="px-5 py-5 border-b border-white/5 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-xl ${intg.bg} border border-white/5 flex items-center justify-center shrink-0`}>
                      <Icon name={intg.icon} className={`w-6 h-6 ${intg.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-200 text-sm tracking-tight">{intg.name}</h3>
                        {isEnabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse" />
                            Active
                          </span>
                        )}
                        {isConfigured && !isEnabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Configured</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[280px]">{intg.description}</p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleEnable(intg.key, isEnabled)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none cursor-pointer ${isEnabled ? "bg-indigo-600" : "bg-slate-800"}`}
                    title={isEnabled ? "Disable Integration" : "Enable Integration"}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              {/* Status Bar */}
              {isEnabled && (
                <div className="px-5 py-3.5 border-b border-white/5 bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                      <span className={`text-xs font-bold mt-0.5 ${isHealthy ? 'text-emerald-400' : isFailing ? 'text-red-400' : 'text-amber-400'}`}>
                        {isHealthy ? 'Healthy' : isFailing ? 'Failing' : 'Pending Sync'}
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-4">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Leads Synced</span>
                      <span className="text-xs font-bold text-slate-200 mt-0.5">{cfg.leadsPulled || 0} Records</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-4">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Last Poll</span>
                      <span className="text-xs font-semibold text-slate-300 mt-0.5">{lastSync}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => testConnection(intg.key)}
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
                    >
                      <Icon name={isTesting ? "mdi:loading" : "mdi:wifi-check"} className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      Test Link
                    </button>
                    {(intg.key === 'INDIAMART' || intg.key === 'TRADEINDIA') && (
                      <button
                        onClick={() => triggerSync(intg.key)}
                        disabled={syncing[intg.key]}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-600/20 hover:bg-indigo-600/35 text-xs font-bold text-indigo-300 transition-colors shadow-sm"
                      >
                        <Icon name={syncing[intg.key] ? "mdi:loading" : "mdi:sync"} className={`w-3.5 h-3.5 ${syncing[intg.key] ? 'animate-spin' : ''}`} />
                        Sync Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Card Body */}
              <div className="px-5 py-4 bg-slate-950/20 mt-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openConfig(intg.key)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 hover:border-indigo-500/30 hover:text-white transition-all"
                  >
                    <Icon name="mdi:cog-outline" className="w-4 h-4" />
                    Configure API Credentials
                  </button>
                  <a
                    href={intg.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-indigo-400 transition-all"
                    title="Documentation"
                  >
                    <Icon name="mdi:open-in-new" className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Drawer */}
      <AppDrawer
        open={!!modalKey}
        onClose={() => setModalKey(null)}
        title={`Configure ${activeConfig?.name || ""}`}
        subtitle="Set up API credentials and integration options"
        icon="mdi:connection"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button onClick={() => setModalKey(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving[modalKey]}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {saving[modalKey] ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:content-save-outline" className="w-4 h-4" />}
              {saving[modalKey] ? "Saving Secrets…" : "Save Configuration"}
            </button>
          </div>
        }
      >
        {activeConfig && (
          <div className="space-y-5 pb-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-slate-50">
              <div className={`w-10 h-10 rounded-xl ${activeConfig.bg} flex items-center justify-center shrink-0`}>
                <Icon name={activeConfig.icon} className={`w-5 h-5 ${activeConfig.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">{activeConfig.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{activeConfig.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-gray-100 bg-slate-50">
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Enable Integration Service</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Toggle to activate or suspend automatic sync processing</p>
              </div>
              <button
                onClick={() => setFD("enabled", !formData.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${formData.enabled ? "bg-indigo-600" : "bg-slate-300"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${formData.enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="space-y-4">
              {activeConfig.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={formData[field.key] || ""}
                      onChange={e => setFD(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200 resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={e => setFD(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200"
                    />
                  )}
                </div>
              ))}
              
              {/* Auto Assignment for Lead Generating APIs */}
              {(activeConfig.key === 'INDIAMART' || activeConfig.key === 'TRADEINDIA') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Auto-Assign Incoming Leads To:</label>
                  <select
                    value={formData.autoAssignUserId || ""}
                    onChange={e => setFD("autoAssignUserId", e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200"
                  >
                    <option value="">-- No Auto Assignment (Unassigned) --</option>
                    {teamMembers.map(tm => (
                      <option key={tm.userid || tm.teamMemberId} value={tm.userid || ""}>
                        {tm.teamMemberName} ({tm.teamMemberEmail})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <Icon name="mdi:information-outline" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Platform integration secrets are encrypted and stored securely. They are sandboxed explicitly to your active company instance.
                <a href={activeConfig.docs} target="_blank" rel="noopener noreferrer" className="ml-1 font-bold underline text-amber-600 hover:text-amber-700">View configuration docs →</a>
              </p>
            </div>
          </div>
        )}
      </AppDrawer>

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
