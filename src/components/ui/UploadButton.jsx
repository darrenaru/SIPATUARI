import { useRef, useState } from 'react';
import { Upload as UploadIcon } from 'lucide-react';
import { uploadLampiran } from '../../lib/storage';
import { useToast } from './Toast';

export default function UploadButton({ folder, accept, multiple = true, label = 'Unggah Berkas', icon: Icon = UploadIcon, onUploaded }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const { path, error } = await uploadLampiran(folder, file);
      if (error) { toast(`Gagal mengunggah ${file.name}: ${error.message}`, 'error'); continue; }
      onUploaded(path);
    }
    setUploading(false);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleChange} />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-surface-300 text-sm text-slate-500 hover:border-sea-400 hover:text-sea-600 transition-colors cursor-pointer disabled:opacity-50"
      >
        <Icon size={15} /> {uploading ? 'Mengunggah...' : label}
      </button>
    </>
  );
}
