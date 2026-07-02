import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { nama, email, password, instansi, role, username } = await req.json();

    if (!nama || !email || !password) return errorResponse('Nama, email, dan password wajib diisi.');
    if (password.length < 6) return errorResponse('Password minimal 6 karakter.');

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) return errorResponse(createError.message);

    const profileData: Record<string, unknown> = {
      id: userData.user.id,
      nama,
      email,
      instansi: instansi || null,
      role: role || 'operator',
      username: username || null,
    };

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(profileData);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return errorResponse(profileError.message);
    }

    return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message || 'Internal server error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
