/**
 * send-migration-emails.ts
 *
 * Sends welcome & credential emails to migrated users via Google SMTP.
 *
 * Safety & Convenience Flags:
 *   --dry-run             Preview email recipients and details without sending.
 *   --test-to=<email>     Send a single test email to verify SMTP formatting.
 *   --batch-size=<N>      Number of emails per batch (default: 10).
 *   --delay-ms=<N>        Delay between emails in milliseconds (default: 500).
 *   --limit=<N>           Limit the total number of emails to send.
 *
 * Usage:
 *   # Test with your own email first:
 *   npx tsx scripts/send-migration-emails.ts --test-to=your-email@example.com
 *
 *   # Dry run:
 *   npx tsx scripts/send-migration-emails.ts --dry-run
 *
 *   # Send to all users:
 *   npx tsx scripts/send-migration-emails.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import type { UserCredentialRecord } from './remap-db-users';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Command Line Argument Parsing ───────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const testToArg = args.find((a) => a.startsWith('--test-to='))?.split('=')[1];
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const delayArg = args.find((a) => a.startsWith('--delay-ms='))?.split('=')[1];

const maxLimit = limitArg ? parseInt(limitArg, 10) : Infinity;
const delayMs = delayArg ? parseInt(delayArg, 10) : 400;

// ─── SMTP Config ─────────────────────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER;
let SMTP_PASS = process.env.SMTP_PASS || '';

// Clean inline comments and whitespace from password
if (SMTP_PASS.includes('#')) {
  SMTP_PASS = SMTP_PASS.split('#')[0].trim();
}
// Strip surrounding quotes and whitespace/spaces for Google App passwords
SMTP_PASS = SMTP_PASS.replace(/^["']|["']$/g, '').trim().replace(/\s+/g, '');

const SMTP_FROM = process.env.SMTP_FROM || `"WaChat" <${SMTP_USER}>`;
const APP_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

if (!SMTP_USER || !SMTP_PASS) {
  console.error('\n❌ ERROR: SMTP_USER or SMTP_PASS is missing in apps/web/.env.');
  console.error('   Please ensure your Google App Password is set.\n');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// ─── HTML Email Template ─────────────────────────────────────────────────────

function createEmailHtml(name: string, email: string, tempPass: string, loginUrl: string): string {
  const displayName = name && name.trim() !== 'User' ? name : 'WaChat User';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your WaChat Account Details</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px; background-color: #5F7C65; text-align: left;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">
                WaChat
              </h1>
              <p style="margin: 4px 0 0 0; color: #E3ECE5; font-size: 13px;">
                Enterprise WhatsApp Business Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; color: #1c1917; font-size: 20px; font-weight: 600;">
                We've Upgraded Our Platform!
              </h2>
              
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #44403c;">
                Hello <strong>${displayName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #44403c;">
                We have upgraded WaChat to a new, ultra-fast authentication engine. All your WhatsApp contacts, chat conversations, templates, media, and settings have been safely preserved.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F8F6; border: 1px solid #D6E3D8; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 10px 0; font-size: 13px; color: #57534e; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">
                      Your Login Details
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #1c1917;">
                      <strong>Email:</strong> ${email}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #1c1917;">
                      <strong>Temporary Password:</strong> <code style="background-color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 16px; color: #2D583F; font-family: monospace; border: 1px solid #c9d8cb; font-weight: 600;">${tempPass}</code>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background-color: #5F7C65; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Sign In to WaChat &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #78716c;">
                <strong>Next steps:</strong> Sign in with your email address and the temporary password above. Once logged in, you can update your password anytime under Profile Settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #fafaf9; border-top: 1px solid #f5f5f4; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a8a29e;">
                &copy; ${new Date().getFullYear()} WaChat. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

async function main() {
  console.log('====================================================');
  console.log('  WACHAT MIGRATION EMAIL DISPATCHER');
  console.log('====================================================\n');

  console.log(`📡 SMTP Server: ${SMTP_HOST}:${SMTP_PORT}`);
  console.log(`✉️  From:        ${SMTP_FROM}`);
  console.log(`🔗 App URL:     ${APP_URL}\n`);

  // 1. Single test email mode
  if (testToArg) {
    console.log(`🧪 Running in TEST mode. Sending 1 email to: ${testToArg}`);
    try {
      console.log('🔌 Verifying SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection authenticated successfully.\n');
      const html = createEmailHtml('Test User', testToArg, 'WaChat-test-1234', `${APP_URL}/sign-in`);
      await transporter.sendMail({
        from: SMTP_FROM,
        to: testToArg,
        subject: 'WaChat Upgrade: Your Login Credentials (Test)',
        html,
      });
      console.log(`✅ Test email successfully sent to: ${testToArg}\n`);
    } catch (err: any) {
      console.error('\n❌ SMTP Error:', err.message);
      if (err.message.includes('BadCredentials') || err.message.includes('535')) {
        console.error('\n💡 HINT: Google rejected the credentials.');
        console.error('   1. Ensure 2-Step Verification is ON in your Google Account: https://myaccount.google.com/security');
        console.error('   2. Generate a new App Password: https://myaccount.google.com/apppasswords');
        console.error('   3. Put the 16-character password in apps/web/.env as SMTP_PASS="..."');
      }
    }
    return;
  }

  // 2. Load credentials
  const credsPath = path.resolve(process.cwd(), 'user_credentials.json');
  if (!fs.existsSync(credsPath)) {
    console.error(`❌ ERROR: ${credsPath} not found.`);
    console.error('   Please run scripts/remap-db-users.ts first.\n');
    process.exit(1);
  }

  const credentials: UserCredentialRecord[] = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  console.log(`👥 Loaded ${credentials.length} user records from ${credsPath}.\n`);

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE ENABLED — Previewing email recipients:\n');
    credentials.slice(0, 10).forEach((c, i) => {
      console.log(`   [${i + 1}] ${c.email} (${c.name || 'User'}) -> Temp Password: ${c.temp_password}`);
    });
    if (credentials.length > 10) {
      console.log(`   ... and ${credentials.length - 10} more.`);
    }
    console.log(`\n📊 Summary: ${credentials.length} users ready for email delivery.`);
    console.log('✅ Dry run completed successfully.');
    return;
  }

  // 3. Verify SMTP connection for live sending
  try {
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection authenticated successfully.\n');
  } catch (err: any) {
    console.error('\n❌ Failed connecting to SMTP server:', err.message);
    if (err.message.includes('BadCredentials') || err.message.includes('535')) {
      console.error('\n💡 HINT: Google rejected the credentials.');
      console.error('   1. Ensure 2-Step Verification is ON in your Google Account: https://myaccount.google.com/security');
      console.error('   2. Generate a new App Password: https://myaccount.google.com/apppasswords');
      console.error('   3. Put the 16-character password in apps/web/.env as SMTP_PASS="..."');
    }
    process.exit(1);
  }

  // 3. Send emails with pacing
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < credentials.length && sentCount < maxLimit; i++) {
    const user = credentials[i];

    if (user.email_sent) {
      console.log(`⏭️  Skipping already emailed: ${user.email}`);
      continue;
    }

    try {
      const html = createEmailHtml(user.name, user.email, user.temp_password, `${APP_URL}/sign-in`);
      await transporter.sendMail({
        from: SMTP_FROM,
        to: user.email,
        subject: 'Important: Your WaChat Login Credentials',
        html,
      });

      user.email_sent = true;
      sentCount++;
      console.log(`[${sentCount}] ✅ Emailed: ${user.email}`);

      // Save progress every 5 emails
      if (sentCount % 5 === 0) {
        fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2), 'utf-8');
      }

      // Small delay between emails to respect SMTP rate limits
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (err: any) {
      failedCount++;
      console.error(`❌ Failed sending to ${user.email}:`, err.message);
    }
  }

  // Final save
  fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2), 'utf-8');

  console.log('\n====================================================');
  console.log('  EMAIL DISPATCH COMPLETE');
  console.log('====================================================');
  console.log(`📊 Sent:   ${sentCount}`);
  console.log(`❌ Failed: ${failedCount}\n`);
}

main().catch((err) => {
  console.error('Fatal error in email dispatcher:', err);
  process.exit(1);
});
