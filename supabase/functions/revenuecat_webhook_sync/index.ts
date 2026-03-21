// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('x-revenuecat-signature') ?? '';
  if (!signature || signature !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await req.json()) as any;
  const event = body?.event ?? body;

  const userId = event?.app_user_id;
  const productId = event?.product_id;
  const transactionId = event?.transaction_id ?? crypto.randomUUID();
  const price = Number(event?.price ?? 0);

  if (!userId || !productId) {
    return new Response('Missing payload fields', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const tierMap: Record<string, string> = {
    premium_month: 'PREMIUM_MONTH',
    premium_6m: 'PREMIUM_6M',
    premium_12m: 'PREMIUM_12M',
    premium_lifetime: 'PREMIUM_LIFETIME',
  };

  const tier = tierMap[productId] ?? 'PREMIUM_MONTH';

  await supabase.from('purchases').insert({
    user_id: userId,
    plan_code: tier,
    provider: 'revenuecat',
    provider_event_id: transactionId,
    amount_eur: price,
    raw_payload: event,
  });

  await supabase.from('memberships').upsert({
    user_id: userId,
    tier,
    status: 'active',
    source: 'revenuecat_webhook',
  });

  if (price > 0) {
    await supabase.from('donation_ledger').insert({
      amount_eur: Number((price * 0.1).toFixed(2)),
      reason: '10% premium omzet donatie',
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
