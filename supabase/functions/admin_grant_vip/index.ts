import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return new Response('Missing bearer token', { status: 401 });

  const body = await req.json();
  const targetUserId = String(body?.target_user_id ?? '').trim();
  const note = String(body?.note ?? '').trim();

  if (!targetUserId) {
    return new Response('target_user_id is required', { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { error } = await adminClient.rpc('admin_grant_vip', {
    p_target_user: targetUserId,
    p_note: note || null,
  });

  if (error) {
    return new Response(error.message, { status: 400 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
