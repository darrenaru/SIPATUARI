import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ icon: Icon, label, value, trend, color = 'sea', delay = 0 }) {
  const colorMap = {
    sea: { bg: 'bg-sea-500/10', icon: 'text-sea-500', ring: 'ring-sea-500/20' },
    cyan: { bg: 'bg-cyan-500/10', icon: 'text-cyan-500', ring: 'ring-cyan-500/20' },
    success: { bg: 'bg-success-500/10', icon: 'text-success-500', ring: 'ring-success-500/20' },
    warning: { bg: 'bg-warning-500/10', icon: 'text-warning-500', ring: 'ring-warning-500/20' },
    navy: { bg: 'bg-navy-700/10', icon: 'text-navy-700', ring: 'ring-navy-700/20' },
  };

  const c = colorMap[color] || colorMap.sea;
  const trendValue = trend ? parseFloat(trend) : 0;
  const TrendIcon = trendValue > 0 ? TrendingUp : trendValue < 0 ? TrendingDown : Minus;
  const trendColor = trendValue > 0 ? 'text-success-500' : trendValue < 0 ? 'text-danger-500' : 'text-slate-400';

  return (
    <div
      className="bg-white rounded-xl border border-surface-200 p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-navy-900 font-[var(--font-heading)]">
            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon size={14} />
              <span className="text-xs font-semibold">{trend}</span>
              <span className="text-xs text-slate-400 ml-1">vs bulan lalu</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
