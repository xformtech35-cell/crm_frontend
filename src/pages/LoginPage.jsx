import { useState, useMemo, useEffect } from "react";
// import { Navigate } from "react-router-dom";
import { Navigate, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import AppAlert from "../components/common/AppAlert";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../stores/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const token = useAuthStore((s) => s.token);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  const [form, setForm] = useState({ userEmail: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // useEffect(() => {
  //   loadFromStorage();
  // }, [loadFromStorage]);

  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  if (token) {
    return <Navigate to={isSuperAdmin ? "/super-admin" : "/home"} replace />;
  }

  const passwordScore = useMemo(() => {
    const v = form.password;
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return Math.min(score, 4);
  }, [form.password]);

  const scoreLabel =
    passwordScore <= 1
      ? "Weak"
      : passwordScore === 2
        ? "Fair"
        : passwordScore === 3
          ? "Strong"
          : "Excellent";
  const scoreClass =
    passwordScore <= 1
      ? "text-rose-500"
      : passwordScore === 2
        ? "text-amber-500"
        : passwordScore === 3
          ? "text-sky-600"
          : "text-emerald-600";
  const completion = Math.round(
    ((Number(Boolean(form.userEmail)) + Number(Boolean(form.password))) / 2) *
      100,
  );

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

const navigate = useNavigate();
async function handleLogin(e) {
  e.preventDefault();

  if (!form.userEmail || !form.password) {
    setError("Email and password are required.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const data = await login(form.userEmail, form.password);

    console.log("Login Data:", data);

    const role = (data?.role || "").toLowerCase();

    localStorage.setItem("role", role);
    localStorage.setItem("userData", JSON.stringify(data));

    if (role === "super_admin" || role === "super admin") {
      navigate("/super-admin");
    } else if (role === "admin") {
      navigate("/admin-dashboard");
    } else if (role === "user") {
      navigate("/dashboard");
    } else {
      setError("Invalid user role.");
    }

  } catch (e) {
    const message =
      e?.response?.data?.message ||
      (e?.request
        ? "Cannot reach the CRM server. Please make sure the backend is running."
        : "Login failed. Please try again.");

    setError(message);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_12%_18%,_rgba(14,165,233,0.2),_transparent_26%),radial-gradient(circle_at_84%_82%,_rgba(79,70,229,0.15),_transparent_28%),linear-gradient(135deg,_#eef2ff_0%,_#f8fafc_45%,_#eff6ff_100%)]">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Left panel */}
        <section className="relative hidden overflow-hidden lg:flex lg:w-[55%]">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#0f172a_0%,#1e3a8a_46%,#2563eb_100%)]" />
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute right-8 top-16 h-52 w-52 rounded-full bg-indigo-300/25 blur-3xl" />
          <div className="absolute bottom-12 left-12 h-72 w-72 rounded-full bg-blue-200/15 blur-3xl" />
          <div className="relative z-10 flex w-full flex-col justify-center p-12 text-white xl:p-16">
            <div className="mx-auto w-full max-w-xl">
              <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Connected Workspace
              </div>
              <div className="mb-7 inline-flex h-20 w-20 items-center justify-center rounded-[22px] border border-white/20 bg-white/15 shadow-2xl shadow-black/20 backdrop-blur-sm">
                <Icon
                  name="mdi:chart-areaspline"
                  className="h-11 w-11 text-white"
                />
              </div>
              <h2 className="max-w-xl text-5xl font-black leading-tight tracking-tight">
                Xform CRM Intelligence Hub
              </h2>
              <p className="mt-4 max-w-xl text-base text-blue-100/95">
                Orchestrate pipeline execution, sales performance, and delivery
                planning in one unified control room.
              </p>
              <div className="mt-9 grid grid-cols-2 gap-3 max-w-xl">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-blue-100/70">
                    Pipeline Velocity
                  </p>
                  <p className="mt-2 text-2xl font-bold">+26%</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-blue-100/70">
                    Forecast Accuracy
                  </p>
                  <p className="mt-2 text-2xl font-bold">91%</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-blue-100/70">
                    Live Modules
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-white/95">
                    {[
                      "Leads and Accounts",
                      "Deals and Pipeline",
                      "Analytics and Reports",
                      "Projects and Tasks",
                    ].map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-white/15 px-3 py-1"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-12 text-xs text-blue-100/70">
                Enterprise-ready visibility for revenue teams and operations
                leaders.
              </p>
            </div>
          </div>
        </section>

        <div className="hidden lg:block w-px bg-white/35 shadow-[0_0_36px_rgba(148,163,184,0.45)]" />

        {/* Right panel */}
        <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:justify-start lg:px-12 xl:px-16">
          <div className="w-full max-w-[520px]">
            <div className="mb-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#4f46e5_100%)] text-white shadow-lg shadow-indigo-200">
                  <Icon name="mdi:briefcase-variant" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Workspace
                  </p>
                  <p className="text-lg font-bold text-slate-900">Xform CRM</p>
                </div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Secure Sign-in
              </span>
            </div>

            <div className="rounded-[30px] border border-white/70 bg-white/85 p-7 shadow-[0_28px_70px_rgba(30,41,59,0.12)] backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <h1 className="text-3xl font-black leading-tight text-slate-900">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Sign in to continue managing your pipeline, activities, and
                  team operations.
                </p>
              </div>

              {/* Completion bar */}
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Form Completion</span>
                  <span>{completion}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0284c7,#4f46e5)] transition-all duration-300"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>

              {error && (
                <AppAlert type="error" message={error} className="mb-5" />
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="form-label">Email Address</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <Icon
                        name="mdi:email-fast-outline"
                        className="h-4 w-4 text-slate-400"
                      />
                    </div>
                    <input
                      type="email"
                      value={form.userEmail}
                      onChange={(e) => setField("userEmail", e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="username"
                      required
                      className="form-input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="form-label mb-0">Password</label>
                    <span className={`text-xs font-semibold ${scoreClass}`}>
                      {scoreLabel}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <Icon
                        name="mdi:shield-key-outline"
                        className="h-4 w-4 text-slate-400"
                      />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="form-input pl-9 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition-colors hover:text-slate-600"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <Icon
                        name={
                          showPassword
                            ? "mdi:eye-off-outline"
                            : "mdi:eye-outline"
                        }
                        className="h-4 w-4"
                      />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 rounded-full ${n <= passwordScore ? "bg-sky-500" : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Keep me signed in
                  </label>
                  <button
                    type="button"
                    className="font-semibold text-indigo-600 hover:text-indigo-700"
                    onClick={() =>
                      (window.location.href =
                        "mailto:support@xform.in?subject=CRM%20Login%20Help")
                    }
                  >
                    Need help?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#4f46e5_55%,#0ea5e9_100%)] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && (
                    <Icon name="mdi:loading" className="h-5 w-5 animate-spin" />
                  )}
                  <span>
                    {loading ? "Authenticating..." : "Access Control Center"}
                  </span>
                  {!loading && (
                    <Icon name="mdi:arrow-top-right" className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Xform Technologies. All rights
              reserved.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
