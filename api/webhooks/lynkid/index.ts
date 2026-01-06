import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assignLicenseToBuyer } from '../../lib/supabase';
import { sendLicenseEmail } from '../../lib/resend';

// Lynk.id webhook payload structure (may vary, adjust as needed)
interface LynkIdWebhookPayload {
    id?: string;
    status: string;
    customer_email: string;
    customer_name?: string;
    customer_phone?: string;
    product_name?: string;
    product_price?: number;
    payment_method?: string;
    paid_at?: string;
    // Add more fields as per Lynk.id documentation
}

/**
 * Lynk.id Webhook Handler
 * 
 * Endpoint: POST /api/webhooks/lynkid
 * 
 * This handler:
 * 1. Receives payment notification from Lynk.id
 * 2. Validates the payment status
 * 3. Assigns an available license to the buyer
 * 4. Sends email with license code
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('=== Lynk.id Webhook Received ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Optional: Verify Merchant Key for security
    const merchantKey = process.env.LYNKID_MERCHANT_KEY;
    if (merchantKey) {
        // Check in headers (common patterns)
        const headerKey = req.headers['x-merchant-key'] ||
            req.headers['x-api-key'] ||
            req.headers['authorization'];
        // Also check in body
        const bodyKey = req.body?.merchant_key || req.body?.api_key;

        const providedKey = headerKey || bodyKey;

        if (providedKey !== merchantKey && providedKey !== `Bearer ${merchantKey}`) {
            console.error('Invalid merchant key');
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        const payload = req.body as LynkIdWebhookPayload;

        // Validate required fields
        if (!payload.customer_email) {
            console.error('Missing customer_email in payload');
            return res.status(400).json({ error: 'Missing customer_email' });
        }

        // Check payment status - adjust based on Lynk.id actual status values
        const validStatuses = ['paid', 'success', 'completed', 'PAID', 'SUCCESS', 'COMPLETED'];
        if (!validStatuses.includes(payload.status)) {
            console.log(`Payment status "${payload.status}" is not a success status. Ignoring.`);
            return res.status(200).json({
                message: 'Webhook received but payment not completed',
                status: payload.status
            });
        }

        console.log(`Processing purchase for: ${payload.customer_email}`);

        // Step 1: Assign an available license to the buyer
        let licenseCode: string | null = null;

        try {
            licenseCode = await assignLicenseToBuyer(payload.customer_email);
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({
                error: 'Database error while assigning license',
                details: dbError instanceof Error ? dbError.message : 'Unknown error'
            });
        }

        // Step 2: Check if license was available
        if (!licenseCode) {
            console.error('OUT OF STOCK: No available licenses');
            // TODO: Send alert to admin
            return res.status(500).json({
                error: 'Out of stock',
                message: 'No available licenses. Please contact support.'
            });
        }

        console.log(`License assigned: ${licenseCode}`);

        // Step 3: Send email with license code
        try {
            await sendLicenseEmail({
                to: payload.customer_email,
                customerName: payload.customer_name || '',
                licenseCode: licenseCode
            });
            console.log(`Email sent to: ${payload.customer_email}`);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // License is assigned but email failed - log for manual follow-up
            // Don't return error to Lynk.id to avoid retry
            return res.status(200).json({
                success: true,
                warning: 'License assigned but email delivery failed',
                licenseCode: licenseCode,
                email: payload.customer_email
            });
        }

        // Success response
        return res.status(200).json({
            success: true,
            message: 'License assigned and email sent',
            email: payload.customer_email,
            licenseCode: licenseCode
        });

    } catch (error) {
        console.error('Webhook handler error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
