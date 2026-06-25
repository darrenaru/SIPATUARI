export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  iconPosition = 'left',
  className = '', 
  disabled = false,
  ...props 
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-sea-600 text-white hover:bg-sea-500 active:bg-sea-700 shadow-sm hover:shadow-md',
    secondary: 'bg-navy-700 text-white hover:bg-navy-600 active:bg-navy-800',
    outline: 'border-2 border-sea-500 text-sea-600 hover:bg-sea-500 hover:text-white',
    ghost: 'text-sea-600 hover:bg-sea-500/10',
    danger: 'bg-danger-500 text-white hover:bg-danger-400 active:bg-red-700',
    success: 'bg-success-500 text-white hover:bg-success-400 active:bg-green-700',
    cyan: 'bg-cyan-500 text-navy-900 hover:bg-cyan-400 font-bold shadow-sm hover:shadow-md',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
    xl: 'px-8 py-3 text-lg',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
    </button>
  );
}
