import { supabase } from './supabaseClient';

const BUCKET = 'lampiran';

export async function uploadLampiran(folder, file) {
  const path = `${folder}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  return { path, error };
}

export async function getLampiranUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return { url: data?.signedUrl, error };
}

export async function removeLampiran(path) {
  return supabase.storage.from(BUCKET).remove([path]);
}

export function lampiranName(path) {
  return (path.split('/').pop() || path).replace(/^[0-9a-f-]{36}-/, '');
}
