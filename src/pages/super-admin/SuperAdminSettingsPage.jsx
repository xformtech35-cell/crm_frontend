import { useState } from "react";
import Icon from "../../components/Icon";

const SETTINGS_SECTIONS = [
  {
    key: "branding",
    label: "Platform Branding",
    icon: "mdi:palette-outline",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    fields: [
      { key: "appName", label: "Application Name", type: "text", placeholder: "Xform CRM", value: "Xform CRM" },
      { key: "supportEmail", label: "Support Email", type: "email", placeholder: "support@xformcrm.com", value: "" },
      { key: "helpUrl", label: "Help / Docs URL", type: "text", placeholder: "https://docs.xformcrm.com", value: "" },
    ],
  },
  {
    key: "security",
    label: "Security & Access Control",
    icon: "mdi:shield-lock-outline",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    fields: [
      { key: "sessionTimeout", label: "Session Timeout (minutes)", type: "number", placeholder: "60", value: "60" },
      { key: "maxLoginAttempts", label: "Max Failed Login Attempts", type: "number", placeholder: "5", value: "5" },
      { key: "passwordMinLength", label: "Minimum Password Length", type: "number", placeholder: "8", value: "8" },
    ],
  },
  {
    key: "notifications",
    label: "System Notifications",
    icon: "mdi:bell-cog-outline",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    toggles: [
      { key: "emailOnCompanyCreated", label: "Email when company registered", default: true },
      { key: "emailOnExpiry", label: "Email on subscription expiry", default: true },
      { key: "emailOnSuspension", label: "Email on account suspension", default: false },
    ],
  },
];

const inputCls = "w-full px-3.5 py-2.5 text-sm border border-white/10 rounded-xl bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200";

export default function SuperAdminSettingsPage() {
  const [toggles, setToggles] = useState({
    emailOnCompanyCreated: true,
    emailOnExpiry: true,
    emailOnSuspension: false,
  });
  const [toast, setToast] = useState(null);

  function showToast() {
    setToast({ msg: "Settings saved (feature coming soon)." });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-5 animate-fade-in relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Platform Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Configure global branding configurations, security parameters, and notification defaults.</p>
        </div>
        <button
          onClick={showToast}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:scale-105 transition-all bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/30"
        >
          <Icon name="mdi:content-save-outline" className="w-4 h-4" />
          Save Settings
        </button>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Icon name="mdi:information-outline" className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-300 leading-relaxed font-medium">Platform settings configurations are currently running in development staging. Changes will persist directly to the database in the upcoming release cycle.</p>
      </div>

      <div className="space-y-4">
        {SETTINGS_SECTIONS.map(section => (
          <div key={section.key} className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3 bg-slate-950/20">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${section.color}`}>
                <Icon name={section.icon} className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{section.label}</h2>
            </div>
            <div className="px-5 py-5">
              {section.fields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input type={f.type} defaultValue={f.value} placeholder={f.placeholder} className={inputCls} />
                    </div>
                  ))}
                </div>
              )}
              {section.toggles && (
                <div className="space-y-3">
                  {section.toggles.map(t => (
                    <div key={t.key} className="flex items-center justify-between py-2 px-3 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t.label}</p>
                      <button
                        onClick={() => setToggles(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${toggles[t.key] ? "bg-indigo-600" : "bg-slate-800"}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${toggles[t.key] ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-red-500/20 shadow-[0_0_25px_rgba(239,68,68,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-red-500/10 flex items-center gap-3 bg-red-950/10">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
            <Icon name="mdi:alert-outline" className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone Actions</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          {[
            { label: "Clear All Integration Keys", desc: "Instantly purge all saved WhatsApp, IndiaMART, and TradeIndia credentials across all company registries.", icon: "mdi:key-remove", action: "Clear Keys" },
            { label: "Purge Expired Accounts", desc: "Permanently delete company database schemas that have been expired for longer than 90 days.", icon: "mdi:delete-sweep-outline", action: "Purge" },
          ].map(item => (
            <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-red-500/10 bg-red-950/5">
              <div>
                <p className="text-sm font-bold text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              </div>
              <button className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-600/10 text-xs font-bold text-red-400 hover:bg-red-600/20 transition-all flex items-center gap-1.5 shrink-0 sm:ml-4 mt-3 sm:mt-0 shadow-sm shadow-red-500/5">
                <Icon name={item.icon} className="w-4 h-4" />
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-emerald-600 text-white shadow-emerald-500/20">
          <Icon name="mdi:check-circle" className="w-5 h-5 shrink-0" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
