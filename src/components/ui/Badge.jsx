export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    aktif: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20',
    nonaktif: 'bg-red-50 text-red-600 ring-1 ring-red-500/20',
    berlayar: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/20',
    selesai: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20',
    docking: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/20',
    beroperasi: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/20',
    info: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-500/20',
    sea: 'bg-sea-500/10 text-sea-600 ring-1 ring-sea-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
