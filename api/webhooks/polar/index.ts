import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
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
// EMAIL SERVICE (GMAIL SMTP via Nodemailer)
// ============================================
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const APP_URL = process.env.APP_URL || 'https://promptnest-app.vercel.app';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

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
              <div style="background: #f0f0f0; border: 2px solid #111; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #666; text-transform: uppercase;">
                  Your License Code
                </p>
                <p style="margin: 0; font-size: 28px; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace; color: #111; letter-spacing: 2px;">
                  ${licenseCode}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${APP_URL}" 
                   style="display: inline-block; padding: 16px 32px; background: #111; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px;">
                  Open PromptNest →
                </a>
              </div>
              
              <!-- Instructions -->
              <div style="background: #f8f8f8; border-radius: 12px; padding: 20px;">
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

  console.log('=== SENDING EMAIL (Gmail SMTP) ===');
  console.log('  To:', to);
  console.log('  From:', GMAIL_USER);
  console.log('  License Code:', licenseCode);

  const info = await transporter.sendMail({
    from: `PromptNest <${GMAIL_USER}>`,
    to: to,
    subject: '🔑 Your PromptNest License Code',
    html: htmlContent,
  });

  console.log('=== EMAIL SENT SUCCESSFULLY ===');
  console.log('  Message ID:', info.messageId);
  return info;
}

// ============================================
// POLAR.SH WEBHOOK SIGNATURE VALIDATION
// Uses Standard Webhooks spec
// ============================================
function validatePolarSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.log('Skipping signature validation (no signature or secret)');
    return true; // Skip validation if no secret configured
  }

  try {
    // Polar uses Standard Webhooks format
    // Signature header format: v1,<base64-signature>
    const parts = signature.split(',');
    if (parts.length < 2) {
      console.warn('Invalid signature format');
      return false;
    }

    const signatureValue = parts[1];
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    const isValid = signatureValue === expectedSignature;
    console.log('Signature validation:', isValid ? 'PASSED' : 'FAILED');
    return isValid;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// ============================================
// POLAR.SH WEBHOOK PAYLOAD INTERFACES
// ============================================
interface PolarCustomer {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

interface PolarProduct {
  id: string;
  name: string;
  description?: string;
}

interface PolarOrderData {
  id: string;
  created_at: string;
  modified_at: string;
  status: string;
  paid: boolean;
  subtotal_amount: number;
  discount_amount: number;
  net_amount: number;
  total_amount: number;
  currency: string;
  billing_reason: string;
  billing_name?: string;
  customer_id: string;
  customer?: PolarCustomer;
  product_id: string;
  product?: PolarProduct;
  checkout_id?: string;
  metadata?: Record<string, unknown>;
}

interface PolarWebhookPayload {
  type: string;
  data: PolarOrderData;
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Polar.sh Webhook Received ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const payload = req.body as PolarWebhookPayload;
    const rawBody = JSON.stringify(req.body);

    // Validate signature (optional - depends on if secret is configured)
    const polarSecret = process.env.POLAR_WEBHOOK_SECRET;
    const signature = req.headers['webhook-signature'] as string | undefined;

    if (polarSecret) {
      const isValid = validatePolarSignature(rawBody, signature, polarSecret);
      if (!isValid) {
        console.warn('Signature validation failed - proceeding anyway for now');
        // TODO: Uncomment to enforce
        // return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Handle different event types
    const eventType = payload.type;
    console.log(`Event type: ${eventType}`);

    // Only process order.paid events
    if (eventType !== 'order.paid') {
      console.log(`Event type "${eventType}" is not order.paid. Ignoring.`);
      return res.status(200).json({
        message: 'Webhook received but event type not handled',
        event: eventType
      });
    }

    const orderData = payload.data;

    // Check if order is paid
    if (!orderData.paid) {
      console.log('Order not paid yet. Status:', orderData.status);
      return res.status(200).json({
        message: 'Order not paid yet',
        status: orderData.status
      });
    }

    // Extract customer email
    // Try multiple sources: customer object, or billing_name as fallback
    let customerEmail = '';
    let customerName = '';

    if (orderData.customer?.email) {
      customerEmail = orderData.customer.email;
      customerName = orderData.customer.name || orderData.billing_name || '';
    } else if (orderData.billing_name?.includes('@')) {
      // Sometimes billing_name contains email
      customerEmail = orderData.billing_name;
    }

    // Validate required fields
    if (!customerEmail) {
      console.error('Missing customer email in payload');
      console.log('Order data:', JSON.stringify(orderData, null, 2));
      return res.status(400).json({
        error: 'Missing customer email',
        hint: 'Expected at data.customer.email or data.billing_name'
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
      orderId: orderData.id
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
