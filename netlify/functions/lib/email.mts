// Email notification service for EE Scholar AI
// Supports Resend, SendGrid, Brevo (Sendinblue), Postmark, and console fallback in development.

export interface PasswordResetEmailOptions {
  to: string;
  name: string;
  resetUrl: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; provider: string; details?: string }> {
  const { to, subject, html, text } = payload;
  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM || "EE Scholar AI <onboarding@resend.dev>";

  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Resend API error:", errorData);
        throw new Error(`Resend API error: ${res.status}`);
      }

      return { success: true, provider: "resend" };
    } catch (err: any) {
      console.error("Failed to send email via Resend:", err.message);
      // Fall through to other providers or dev log
    }
  }

  // 2. SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: {
            email: process.env.EMAIL_FROM_ADDRESS || "noreply@eescholar.ai",
            name: "EE Scholar AI",
          },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
        }),
      });

      if (!res.ok && res.status !== 202) {
        const errorData = await res.text();
        console.error("SendGrid API error:", errorData);
        throw new Error(`SendGrid API error: ${res.status}`);
      }

      return { success: true, provider: "sendgrid" };
    } catch (err: any) {
      console.error("Failed to send email via SendGrid:", err.message);
    }
  }

  // 3. Brevo (Sendinblue) API
  if (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY) {
    const key = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": key as string,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "EE Scholar AI", email: process.env.EMAIL_FROM_ADDRESS || "noreply@eescholar.ai" },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!res.ok && res.status !== 201) {
        const errorData = await res.text();
        console.error("Brevo API error:", errorData);
        throw new Error(`Brevo API error: ${res.status}`);
      }

      return { success: true, provider: "brevo" };
    } catch (err: any) {
      console.error("Failed to send email via Brevo:", err.message);
    }
  }

  // 4. Postmark API
  if (process.env.POSTMARK_SERVER_TOKEN) {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: fromEmail,
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Postmark API error:", errorData);
        throw new Error(`Postmark API error: ${res.status}`);
      }

      return { success: true, provider: "postmark" };
    } catch (err: any) {
      console.error("Failed to send email via Postmark:", err.message);
    }
  }

  // 5. Development / Fallback mode (no API key configured)
  console.log("\n=======================================================");
  console.log("📨 [EE SCHOLAR AI - EMAIL DISPATCH (DEV/FALLBACK)]");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("-------------------------------------------------------");
  console.log(text);
  console.log("=======================================================\n");

  return {
    success: true,
    provider: "console-fallback",
    details: "No email API key configured (set RESEND_API_KEY in Netlify environment variables). Reset link printed to server logs.",
  };
}

export function generatePasswordResetEmailHtml(options: PasswordResetEmailOptions): string {
  const { name, resetUrl } = options;
  const firstName = name.trim().split(/\s+/)[0] || "Student";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your EE Scholar AI Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0b0f;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e5e7eb;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 560px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    .card {
      background-color: #141419;
      border: 1px solid #262630;
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 1px solid #262630;
      padding-bottom: 20px;
    }
    .badge {
      display: inline-block;
      background-color: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 6px 0;
    }
    .sub {
      font-size: 12px;
      color: #9ca3af;
      margin: 0;
    }
    p {
      font-size: 14px;
      color: #d1d5db;
      margin: 0 0 16px 0;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background-color: #22c55e;
      color: #06210a !important;
      font-weight: 700;
      font-size: 14px;
      padding: 13px 28px;
      border-radius: 10px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);
    }
    .note {
      font-size: 12px;
      color: #9ca3af;
      background-color: #1a1a24;
      border-left: 3px solid #22c55e;
      padding: 10px 14px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .direct-link {
      font-size: 11px;
      color: #9ca3af;
      word-break: break-all;
      background-color: #0d0d12;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #22222d;
    }
    .direct-link a {
      color: #22c55e;
      text-decoration: none;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="badge">ABU ZARIA · ELECTRICAL ENGINEERING</div>
        <h1>EE SCHOLAR AI</h1>
        <p class="sub">Your Personal AI Tutor & Academic Assistant</p>
      </div>

      <p>Hello <strong>${firstName}</strong>,</p>
      
      <p>We received a request to reset the password for your EE Scholar AI account. Click the button below to choose a new password:</p>

      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset My Password</a>
      </div>

      <div class="note">
        ⏱️ <strong>This reset link expires in 1 hour.</strong><br />
        If you did not make this request, you can safely ignore this email — your account and password remain completely secure.
      </div>

      <p style="font-size: 12px; color: #9ca3af; margin-bottom: 6px;">Button not working? Copy and paste this link into your browser:</p>
      <div class="direct-link">
        <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a>
      </div>
    </div>

    <div class="footer">
      EE Scholar AI · Department of Electrical Engineering<br />
      Ahmadu Bello University, Zaria, Nigeria
    </div>
  </div>
</body>
</html>`;
}

export function generatePasswordResetEmailText(options: PasswordResetEmailOptions): string {
  const { name, resetUrl } = options;
  const firstName = name.trim().split(/\s+/)[0] || "Student";

  return `EE SCHOLAR AI - Password Reset Request

Hello ${firstName},

We received a request to reset the password for your EE Scholar AI account.

To reset your password, open the following secure link in your web browser:
${resetUrl}

This link is valid for 1 hour.

If you did not request a password reset, you can safely ignore this email. Your account remains secure.

--
EE Scholar AI · Department of Electrical Engineering
Ahmadu Bello University (ABU), Zaria, Nigeria`;
}

export async function sendPasswordResetEmail(options: PasswordResetEmailOptions) {
  const html = generatePasswordResetEmailHtml(options);
  const text = generatePasswordResetEmailText(options);
  return sendEmail({
    to: options.to,
    subject: "Reset your EE Scholar AI Password",
    html,
    text,
  });
}
