import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends HR a "personal message" (SMS or WhatsApp) whenever a new candidate
 * applies, containing the same details as the email notification.
 *
 * This uses Twilio when credentials are configured via environment
 * variables. If Twilio isn't configured, it fails gracefully (no crash,
 * no blocked application) and just logs that the message wasn't sent —
 * the email notification still goes out independently.
 *
 * Required env vars for this to actually send:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER        (e.g. "+14155238886" for WhatsApp sandbox, or your SMS-enabled number)
 *   TWILIO_MESSAGING_CHANNEL  ("sms" or "whatsapp", defaults to "sms")
 */
export async function sendNewCandidatePersonalMessage({ candidate, jobTitle, hrPhone }) {
  const rawPhone = hrPhone || process.env.HR_NOTIFY_PHONE || '9512506193';
  // Normalize to E.164 with India country code if not already prefixed.
  const normalizedPhone = rawPhone.trim().startsWith('+') ? rawPhone.trim() : `+91${rawPhone.replace(/\D/g, '')}`;

  const bodyLines = [
    `New candidate applied — LocalSM`,
    `${candidate.name} for ${jobTitle}`,
    `Ph: ${candidate.phone}`,
    `Email: ${candidate.email}`,
    candidate.resumeUrl ? `Resume: ${candidate.resumeUrl}` : null,
    `Check Admin Panel > Applicants for full details.`
  ].filter(Boolean);
  const body = bodyLines.join('\n');

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  const channel = (process.env.TWILIO_MESSAGING_CHANNEL || 'sms').toLowerCase();

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn(
      '[SMS] Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing). ' +
      'Skipping personal message — set these env vars to enable SMS/WhatsApp notifications to HR.'
    );
    return { success: false, provider: 'none', error: 'Twilio not configured' };
  }

  try {
    const to = channel === 'whatsapp' ? `whatsapp:${normalizedPhone}` : normalizedPhone;
    const from = channel === 'whatsapp' ? `whatsapp:${TWILIO_FROM_NUMBER}` : TWILIO_FROM_NUMBER;

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: from, Body: body });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    if (response.ok) {
      console.log(`[SMS] Personal message sent to HR (${normalizedPhone}) via Twilio ${channel}.`);
      return { success: true, provider: `twilio-${channel}` };
    }

    const errMsg = await response.text();
    console.error(`[SMS] Twilio send failed (${response.status}):`, errMsg);
    return { success: false, provider: `twilio-${channel}`, error: errMsg };
  } catch (err) {
    console.error('[SMS] Failed to send personal message:', err);
    return { success: false, provider: 'twilio', error: err.message };
  }
}
