import Icon from "../Icon";



const GRADIENT_CLASS = {
  blue: "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200",
  green: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200",
  orange: "bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-200",
  purple: "bg-gradient-to-br from-purple-500 to-violet-600 shadow-purple-200",
  red: "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200",
  indigo: "bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-200",
  yellow: "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-yellow-200",
  cyan: "bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-200",
  pink: "bg-gradient-to-br from-pink-500 to-rose-500 shadow-pink-200",
};

export default function StatCard({ label, value, icon, color = "blue" }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default ${GRADIENT_CLASS[color] || GRADIENT_CLASS.blue}`}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 bg-white" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full opacity-10 bg-white" />
      <div className="relative w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm">
        <Icon name={icon} className="w-6 h-6 text-white" />
      </div>
      <div className="relative">
        <p className="text-white/75 text-xs font-medium uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-white leading-none">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
}
