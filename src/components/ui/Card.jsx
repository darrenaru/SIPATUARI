export default function Card({ children, className = '', padding = true, hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-surface-200
        ${padding ? 'p-5' : ''}
        ${hover ? 'hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300' : 'shadow-[var(--shadow-card)]'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-bold text-navy-900 font-[var(--font-heading)] ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-slate-500 mt-0.5 ${className}`}>
      {children}
    </p>
  );
}
