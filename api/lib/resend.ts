import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'PromptNest <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'https://promptnest-app.vercel.app';

interface SendLicenseEmailParams {
    to: string;
    customerName: string;
    licenseCode: string;
}

/**
 * Send license delivery email to customer
 */
export async function sendLicenseEmail({ to, customerName, licenseCode }: SendLicenseEmailParams) {
    const displayName = customerName || to.split('@')[0];

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your PromptNest License</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FDFBF7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <img src="https://ui-avatars.com/api/?name=PN&background=111&color=fff&size=64&bold=true" 
                   alt="PromptNest" 
                   style="width: 48px; height: 48px; border-radius: 12px;">
              <h1 style="margin: 16px 0 0 0; font-size: 24px; font-weight: 700; color: #111;">
                PromptNest
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background: white; border-radius: 24px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              <h2 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #111;">
                Welcome, ${displayName}! 🎉
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555;">
                Thank you for your purchase! Your PromptNest license is ready. Use the code below to access your AI prompt library.
              </p>
              
              <!-- License Code Box -->
              <div style="background: linear-gradient(135deg, #111 0%, #333 100%); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                  Your License Code
                </p>
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: 2px; font-family: monospace;">
                  ${licenseCode}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${APP_URL}" 
                   style="display: inline-block; background: #111; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                  Access PromptNest →
                </a>
              </div>
              
              <!-- Instructions -->
              <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-top: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111;">
                  How to get started:
                </h3>
                <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555;">
                  <li>Go to <a href="${APP_URL}" style="color: #111;">promptnest-app.vercel.app</a></li>
                  <li>Enter your username (any name you prefer)</li>
                  <li>Paste your License Code above</li>
                  <li>Start organizing your AI prompts! ✨</li>
                </ol>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding-top: 32px;">
              <p style="margin: 0; font-size: 13px; color: #888;">
                Questions? Reply to this email or contact support.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #aaa;">
                © ${new Date().getFullYear()} PromptNest. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

    const textContent = `
Welcome to PromptNest, ${displayName}!

Thank you for your purchase! Here's your license code:

LICENSE CODE: ${licenseCode}

To get started:
1. Go to ${APP_URL}
2. Enter your username
3. Paste your license code
4. Start organizing your AI prompts!

Questions? Reply to this email.

© ${new Date().getFullYear()} PromptNest
  `.trim();

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: '🔑 Your PromptNest License Code',
            html: htmlContent,
            text: textContent,
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }

        console.log('Email sent successfully:', data?.id);
        return data;
    } catch (err) {
        console.error('Email sending failed:', err);
        throw err;
    }
}
