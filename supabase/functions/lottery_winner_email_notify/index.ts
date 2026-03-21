import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
const emailFrom = Deno.env.get('LOTTERY_EMAIL_FROM') ?? 'ALL-INN AJAX <onboarding@resend.dev>';
const fallbackRecipient = 'all.inn.media.contact@gmail.com';

function parseRecipients(raw: string | null): string[] {
  const list = (raw ?? fallbackRecipient)
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter((v) => v.includes('@') && v.includes('.'));
  return [...new Set(list)];
}

const recipients = parseRecipients(Deno.env.get('LOTTERY_WINNER_NOTIFY_EMAILS'));

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ ok: false, message: 'Supabase env mist.' }, { status: 500 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return new Response('Missing bearer token', { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!resendApiKey) {
    return Response.json(
      { ok: false, message: 'RESEND_API_KEY ontbreekt. Zet deze in Edge Function Secrets.' },
      { status: 500 }
    );
  }

  if (!recipients.length) {
    return Response.json(
      { ok: false, message: 'LOTTERY_WINNER_NOTIFY_EMAILS is leeg of ongeldig.' },
      { status: 400 }
    );
  }

  const drawsRes = await adminClient
    .from('lottery_draws')
    .select('id,target_paid_members,winner_user_id,winner_ticket_number,participants_count,drawn_at')
    .is('winner_email_sent_at', null)
    .order('drawn_at', { ascending: true })
    .limit(10);

  if (drawsRes.error) {
    return Response.json({ ok: false, message: drawsRes.error.message }, { status: 400 });
  }

  const draws = (drawsRes.data ??
    []) as Array<{
    id: string;
    target_paid_members: number | null;
    winner_user_id: string;
    winner_ticket_number: number | null;
    participants_count: number | null;
    drawn_at: string | null;
  }>;

  if (!draws.length) {
    return Response.json({ ok: true, sent: 0, skipped: 0, message: 'Geen nieuwe trekkingen.' });
  }

  let sent = 0;
  let skipped = 0;

  const contentRes = await adminClient
    .from('app_content')
    .select('lottery_winner_interview,lottery_winner_photo_url,lottery_winner_video_url')
    .eq('id', 1)
    .maybeSingle();

  const interviewText = contentRes.data?.lottery_winner_interview?.trim() ?? '';
  const winnerPhotoUrl = contentRes.data?.lottery_winner_photo_url?.trim() ?? '';
  const winnerVideoUrl = contentRes.data?.lottery_winner_video_url?.trim() ?? '';

  for (const draw of draws) {
    const profileRes = await adminClient
      .from('profiles')
      .select('display_name,username')
      .eq('id', draw.winner_user_id)
      .maybeSingle();

    const winnerName =
      profileRes.data?.display_name?.trim() ||
      profileRes.data?.username?.trim() ||
      `Gebruiker ${draw.winner_user_id.slice(0, 8)}`;

    const drawnAt = draw.drawn_at ? new Date(draw.drawn_at).toLocaleString('nl-NL') : 'onbekend';
    const subject = `ALL-INN AJAX loterij winnaar: ${winnerName}`;
    const html = `
      <h2>Nieuwe loterij winnaar</h2>
      <p><strong>Winnaar:</strong> ${winnerName}</p>
      <p><strong>Ticketnummer:</strong> ${draw.winner_ticket_number ?? '-'}</p>
      <p><strong>Mijlpaal:</strong> ${draw.target_paid_members ?? '-'} premium leden</p>
      <p><strong>Deelnemers:</strong> ${draw.participants_count ?? '-'}</p>
      <p><strong>Getrokken op:</strong> ${drawnAt}</p>
      ${interviewText ? `<p><strong>Interview:</strong><br/>${interviewText.replace(/\n/g, '<br/>')}</p>` : ''}
      ${winnerPhotoUrl ? `<p><strong>Foto:</strong> <a href="${winnerPhotoUrl}">${winnerPhotoUrl}</a></p>` : ''}
      ${winnerVideoUrl ? `<p><strong>Video:</strong> <a href="${winnerVideoUrl}">${winnerVideoUrl}</a></p>` : ''}
      <p><strong>Draw ID:</strong> ${draw.id}</p>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: recipients,
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = (await emailRes.text()).slice(0, 500);
      await adminClient
        .from('lottery_draws')
        .update({ winner_email_error: errText })
        .eq('id', draw.id);
      skipped += 1;
      continue;
    }

    await adminClient
      .from('lottery_draws')
      .update({
        winner_email_sent_at: new Date().toISOString(),
        winner_email_error: null,
      })
      .eq('id', draw.id);
    sent += 1;
  }

  return Response.json({ ok: true, sent, skipped, recipients });
});
