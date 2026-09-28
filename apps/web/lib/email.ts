import nodemailer from 'nodemailer';

export function getMailer() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
  let pass = (process.env.SMTP_PASS || '').trim();
  
  if (pass.includes('#')) {
    pass = pass.split('#')[0].trim();
  }
  pass = pass.replace(/^["']|["']$/g, '').trim().replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, name?: string | null) {
  const user = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
  const from = (process.env.SMTP_FROM || `"WaChat" <${user}>`).replace(/^["']|["']$/g, '');
  const userName = name || 'there';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF8F5; padding: 40px 20px; color: #1c1917;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <h2 style="color: #5F7C65; margin-top: 0;">Reset Your WaChat Password</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to reset the password for your WaChat account. Click the button below to set a new password:</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="background-color: #5F7C65; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="font-size: 13px; color: #78716c; line-height: 1.5;">
      If you did not request this, you can safely ignore this email. The link will expire in 1 hour.
    </p>
    <hr style="border: none; border-top: 1px solid #f5f5f4; margin: 24px 0;" />
    <p style="font-size: 12px; color: #a8a29e; text-align: center;">
      WaChat &bull; Enterprise WhatsApp Business Platform
    </p>
  </div>
</body>
</html>
`;

  const transport = getMailer();
  return await transport.sendMail({
    from,
    to: email,
    subject: 'Reset your WaChat password',
    html,
  });
}
