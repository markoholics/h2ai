// POST /api/enquiry
// Saves to Supabase and emails contact@humantothepowerofai.com via Resend.
// Env vars required:  RESEND_API_KEY
// Optional overrides: SUPABASE_URL, SUPABASE_ANON_KEY

const { createClient } = require('@supabase/supabase-js');

const TYPE_LABELS = {
  advisory: 'H2AI Advisory — AI Audit & Implementation',
  learn:    'H2AI Learn — Courses & Certifications',
  labs:     'H2AI Labs — Product Early Access',
  general:  'General Enquiry',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, role, company, size, type, message } = req.body || {};

  if (!name || !email || !role || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const warnings = [];

  // ── 1. Supabase ──────────────────────────────────────────────────────────
  try {
    const sb = createClient(
      process.env.SUPABASE_URL      || 'https://xlfblvgtsqykyrnduyvn.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZmJsdmd0c3F5a3lybmR1eXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDY3MTgsImV4cCI6MjA5MDEyMjcxOH0.GfxMZ0tmMG1LL_A141ATBhmMVQdPl4EJvCmh7g-21mo'
    );
    const { error: sbErr } = await sb.from('enquiries').insert([{
      full_name:         name,
      email,
      phone:             phone   || null,
      role,
      company:           company || null,
      organisation_size: size    || null,
      enquiry_type:      type,
      message:           message || null,
      source:            'website',
    }]);
    if (sbErr) warnings.push(`supabase: ${sbErr.message}`);
  } catch (err) {
    warnings.push(`supabase: ${err.message}`);
  }

  // ── 2. Email via Resend ──────────────────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const row = (label, value) =>
      `<tr><td style="padding:8px 12px;font-weight:600;color:#555;width:160px;vertical-align:top">${label}</td>` +
      `<td style="padding:8px 12px">${value || '—'}</td></tr>`;

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1D4ED8;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">New enquiry from humantothepowerofai.com</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-top:none">
          ${row('Name', name)}
          ${row('Email', `<a href="mailto:${email}" style="color:#1D4ED8">${email}</a>`)}
          ${row('Phone / WhatsApp', phone)}
          ${row('Role', role)}
          ${row('Organisation', company)}
          ${row('Org size', size)}
          ${row('Interested in', TYPE_LABELS[type] || type)}
          ${row('Message', `<span style="white-space:pre-wrap">${message || '—'}</span>`)}
        </table>
        <p style="font-size:11px;color:#9ca3af;padding:12px;margin:0">
          Reply directly to this email to respond to ${name}.
        </p>
      </div>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:     'H²AI Enquiries <onboarding@resend.dev>',
          to:       ['contact@humantothepowerofai.com'],
          reply_to: email,
          subject:  `New enquiry: ${name} — ${TYPE_LABELS[type] || type}`,
          html,
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        warnings.push(`resend: ${body}`);
      }
    } catch (err) {
      warnings.push(`resend: ${err.message}`);
    }
  } else {
    warnings.push('resend: RESEND_API_KEY not set — email skipped');
  }

  return res.status(200).json({ ok: true, warnings });
};
