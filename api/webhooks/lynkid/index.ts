import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

// ============================================
// SUPABASE CLIENT
// ============================================
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function assignLicenseToBuyer(buyerEmail: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin.rpc('assign_license_to_buyer', {
        input_email: buyerEmail
    });

    if (error) {
        console.error('Error assigning license:', error);
        throw new Error(`Failed to assign license: ${error.message}`);
    }

    return data as string | null;
}

// ============================================
// EMAIL SERVICE (RESEND)
// ============================================
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'PromptNest <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'https://promptnest-app.vercel.app';

async function sendLicenseEmail(to: string, customerName: string, licenseCode: string) {
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

    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: '🔑 Your PromptNest License Code',
        html: htmlContent,
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
}

// ============================================
// LYNK.ID SIGNATURE VALIDATION
// ============================================
function validateLynkSignature(
    ref_id: string,
    amount: string | number,
    message_id: string,
    receivedSignature: string,
    secretKey: string
): boolean {
    const signatureString = String(amount) + ref_id + message_id + secretKey;
    const calculatedSignature = crypto
        .createHash('sha256')
        .update(signatureString)
        .digest('hex');

    console.log('Signature validation:');
    console.log('  signatureString:', signatureString);
    console.log('  calculatedSignature:', calculatedSignature);
    console.log('  receivedSignature:', receivedSignature);

    return calculatedSignature === receivedSignature;
}

// ============================================
// LYNK.ID WEBHOOK PAYLOAD INTERFACES
// ============================================
interface LynkIdCustomer {
    email: string;
    name: string;
    phone?: string;
}

interface LynkIdMessageData {
    createdAt: string;
    customer: LynkIdCustomer;
    items: Array<{
        title: string;
        price: number;
        qty: number;
    }>;
    refId: string;
    totals: {
        grandTotal: number;
        totalPrice: number;
    };
}

interface LynkIdWebhookPayload {
    event: string;
    data: {
        message_action: string;
        message_code: string;
        message_data: LynkIdMessageData;
        message_id: string;
        message_desc?: string;
        message_title?: string;
    };
    signature?: string;
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('=== Lynk.id Webhook Received ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
        const payload = req.body as LynkIdWebhookPayload;

        // Validate event type
        if (payload.event !== 'payment.received') {
            console.log(`Event type "${payload.event}" is not payment.received. Ignoring.`);
            return res.status(200).json({
                message: 'Webhook received but event type not handled',
                event: payload.event
            });
        }

        // Validate message action (SUCCESS)
        if (payload.data?.message_action !== 'SUCCESS') {
            console.log(`Message action "${payload.data?.message_action}" is not SUCCESS. Ignoring.`);
            return res.status(200).json({
                message: 'Webhook received but payment not successful',
                message_action: payload.data?.message_action
            });
        }

        // Optional: Validate signature if merchant key is set
        const merchantKey = process.env.LYNKID_MERCHANT_KEY;
        // Signature is sent via header X-Lynk-Signature
        const signature = req.headers['x-lynk-signature'] as string | undefined;

        if (merchantKey && signature) {
            const messageData = payload.data.message_data;
            const amount = messageData.totals?.grandTotal || messageData.totals?.totalPrice || 0;

            const isValid = validateLynkSignature(
                messageData.refId,
                amount,
                payload.data.message_id,
                signature,
                merchantKey
            );

            if (!isValid) {
                console.error('Invalid signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.log('Signature validated successfully');
        } else {
            console.log('Skipping signature validation (no signature header or merchant key)');
        }

        // Extract customer info from nested structure
        const customer = payload.data?.message_data?.customer;
        const customerEmail = customer?.email || '';
        const customerName = customer?.name || '';

        // Validate required fields
        if (!customerEmail) {
            console.error('Missing customer email in payload');
            console.log('Payload structure:', JSON.stringify(payload, null, 2));
            return res.status(400).json({
                error: 'Missing customer email',
                hint: 'Expected at data.message_data.customer.email'
            });
        }

        console.log(`Processing purchase for: ${customerEmail} (${customerName})`);

        // Step 1: Assign license
        let licenseCode: string | null = null;
        try {
            licenseCode = await assignLicenseToBuyer(customerEmail);
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({
                error: 'Database error while assigning license',
                details: dbError instanceof Error ? dbError.message : 'Unknown error'
            });
        }

        // Step 2: Check stock
        if (!licenseCode) {
            console.error('OUT OF STOCK: No available licenses');
            return res.status(500).json({
                error: 'Out of stock',
                message: 'No available licenses. Please contact support.'
            });
        }

        console.log(`License assigned: ${licenseCode}`);

        // Step 3: Send email
        try {
            await sendLicenseEmail(customerEmail, customerName, licenseCode);
            console.log(`Email sent to: ${customerEmail}`);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            return res.status(200).json({
                success: true,
                warning: 'License assigned but email delivery failed',
                licenseCode: licenseCode,
                email: customerEmail
            });
        }

        // Success
        return res.status(200).json({
            success: true,
            message: 'License assigned and email sent',
            email: customerEmail,
            licenseCode: licenseCode,
            refId: payload.data.message_data.refId
        });

    } catch (error) {
        console.error('Webhook handler error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
