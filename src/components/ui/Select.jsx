import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function Select({ label, options = [], value, onChange, placeholder = 'Pilih...', className = '', id, clearable = true }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const mappedOptions = options.map((opt) => ({
    value: String(opt?.value ?? opt),
    label: opt?.label ?? opt,
  }));
  const normalized = clearable ? [{ value: '', label: placeholder }, ...mappedOptions] : mappedOptions;
  const selected = normalized.find((opt) => opt.value === String(value)) ?? { value: '', label: placeholder };

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < maxHeight && rect.top > spaceBelow;
    setCoords({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      maxHeight,
    });
  };

  const handleOpen = () => {
    updateCoords();
    setHighlighted(Math.max(0, normalized.findIndex((opt) => opt.value === String(value))));
    setOpen(true);
  };

  const selectOption = (opt) => {
    onChange?.({ target: { value: opt.value } });
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateCoords();
    const onClickOutside = (e) => {
      if (!triggerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        handleOpen();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(normalized.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (normalized[highlighted]) selectOption(normalized[highlighted]);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          ref={triggerRef}
          onClick={() => (open ? setOpen(false) : handleOpen())}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 bg-white border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm text-left text-navy-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors cursor-pointer"
        >
          <span className={selected.value === '' ? 'text-slate-400' : ''}>{selected.label}</span>
          <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && coords && createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
              maxHeight: coords.maxHeight,
            }}
            className="z-50 overflow-auto bg-white border border-surface-200 rounded-lg shadow-lg py-1 animate-dropdown"
          >
            {normalized.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === String(value)}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectOption(opt)}
                className={`px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                  opt.value === String(value)
                    ? 'bg-cyan-50 text-cyan-700 font-medium'
                    : i === highlighted
                    ? 'bg-surface-100 text-navy-900'
                    : opt.value === '' ? 'text-slate-400' : 'text-navy-900'
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>,
          document.body
        )}
      </div>
    </div>
  );
}
