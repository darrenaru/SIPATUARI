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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verifikasi pemanggil adalah admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerJwt = authHeader.replace('Bearer ', '');
    if (!callerJwt) return errorResponse('Unauthorized', 401);

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(callerJwt);
    if (callerErr || !caller) return errorResponse('Unauthorized', 401);

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (callerProfile?.role !== 'admin') {
      return errorResponse('Forbidden: hanya admin yang dapat menghapus pengguna.', 403);
    }

    const { user_id } = await req.json();
    if (!user_id) return errorResponse('user_id wajib diisi.');

    // Gunakan direct fetch ke GoTrue Admin API untuk menghindari bug JS client
    // (GoTrue mengembalikan field "msg", bukan "message", sehingga error.message bisa undefined)
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!deleteRes.ok) {
      const body = await deleteRes.json().catch(() => ({}));
      let msg = body.msg || body.message || body.error || `Gagal menghapus pengguna (HTTP ${deleteRes.status}).`;
      if (typeof msg === 'string' && msg.includes('kapal_operator_id_fkey')) {
        msg = 'Pengguna tidak dapat dihapus karena masih memiliki kapal yang terdaftar.';
      }
      return errorResponse(msg, deleteRes.status);
    }

    return new Response(JSON.stringify({ success: true }), {
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
