import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: { bg: '#ECFDF5', border: '#10B981', icon: '#059669', text: '#065F46' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '#D97706', text: '#92400E' },
  error: { bg: '#FEF2F2', border: '#EF4444', icon: '#DC2626', text: '#991B1B' },
  info: { bg: '#EFF6FF', border: '#3B82F6', icon: '#2563EB', text: '#1E40AF' },
};

function Toast({ id, message, type = 'info', onClose }) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[type];
  const color = colors[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div
      style={{
        background: color.bg,
        borderLeft: `4px solid ${color.border}`,
        animation: isExiting ? 'toastOut 0.3s ease-in forwards' : 'toastIn 0.3s ease-out forwards',
      }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg w-full sm:w-auto sm:min-w-[320px] sm:max-w-[420px]"
    >
      <Icon size={20} style={{ color: color.icon, flexShrink: 0 }} />
      <p className="flex-1 text-sm font-medium" style={{ color: color.text }}>{message}</p>
      <button
        onClick={() => { setIsExiting(true); setTimeout(() => onClose(id), 300); }}
        className="p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
      >
        <X size={14} style={{ color: color.text }} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-4 left-4 right-4 sm:left-auto z-[9999] flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
