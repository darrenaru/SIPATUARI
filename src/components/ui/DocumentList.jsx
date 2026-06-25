import { useState } from 'react';
import { X } from 'lucide-react';
import { lampiranName, getLampiranUrl } from '../../lib/storage';
import { useToast } from './Toast';

export default function DocumentList({ paths = [], icon: Icon, onRemove, emptyText = 'Belum ada berkas.' }) {
  const toast = useToast();
  const [opening, setOpening] = useState(null);

  const open = async (path) => {
    setOpening(path);
    const { url, error } = await getLampiranUrl(path);
    setOpening(null);
    if (error || !url) { toast(error?.message || 'Gagal membuka berkas', 'error'); return; }
    window.open(url, '_blank');
  };

  if (paths.length === 0) return <p className="text-sm text-slate-400 italic">{emptyText}</p>;

  return (
    <div className="space-y-1.5">
      {paths.map((path) => (
        <div key={path} className="flex items-center justify-between gap-2 text-sm text-slate-600 bg-surface-50 px-3 py-2 rounded-lg border border-surface-200">
          <button type="button" onClick={() => open(path)} className="flex items-center gap-2 text-left hover:text-sea-600 transition-colors cursor-pointer truncate min-w-0">
            <Icon size={14} className="text-sea-500 flex-shrink-0" />
            <span className="truncate">{lampiranName(path)}</span>
            {opening === path && <span className="text-xs text-slate-400 flex-shrink-0">memuat...</span>}
          </button>
          {onRemove && (
            <button type="button" onClick={() => onRemove(path)} className="text-slate-400 hover:text-danger-500 flex-shrink-0 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
