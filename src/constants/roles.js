// Konfigurasi role pengguna SIPATUARI
// Login diautentikasi via Supabase Auth (lihat src/contexts/AuthContext.jsx); role selalu dibaca live dari profiles.

export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  UPP: 'upp',
  PEMKAB: 'pemkab',
};

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin' },
  { value: ROLES.OPERATOR, label: 'Operator' },
  { value: ROLES.UPP, label: 'UPP' },
  { value: ROLES.PEMKAB, label: 'PEMKAB' },
];

// Deskripsi statis per role (bukan data pengguna — nama/email pengguna selalu dari profiles).
export const ROLE_PROFILE = {
  [ROLES.ADMIN]: { desc: 'Admin' },
  [ROLES.OPERATOR]: { desc: 'Operator' },
  [ROLES.UPP]: { desc: 'UPP' },
  [ROLES.PEMKAB]: { desc: 'PEMKAB' },
};
