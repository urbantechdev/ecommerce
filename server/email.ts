import nodemailer from 'nodemailer';
import { db } from './db.js';

export interface EmailLog {
  id: string;
  to: string;
  from: string;
  subject: string;
  htmlContent: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  error?: string;
  sentAt: string;
}

export const emailLogs: EmailLog[] = [];

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = db.getData().settings;
  const fromEmail = settings.companyEmail || 'support@naisiaetextiles.com';
  const companyName = 'Naisiae Textiles';

  const logEntry: EmailLog = {
    id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to,
    from: `"${companyName}" <${fromEmail}>`,
    subject,
    htmlContent: html,
    status: 'SENT',
    sentAt: new Date().toISOString(),
  };

  const smtpHost = process.env.SMTP_HOST || settings.smtpHost || 'smtp.zoho.com';
  const smtpPort = Number(process.env.SMTP_PORT || settings.smtpPort || 465);
  const smtpSecure = smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || settings.smtpUser || 'support@naisiaetextiles.com';
  const smtpPass = process.env.SMTP_PASS || settings.smtpPassword || '';

  // If live credentials are provided, use real nodemailer transport
  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = await transporter.sendMail({
        from: `"${companyName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      console.log(`[Email Dispatcher] Real email sent via ${smtpHost} (${info.messageId}) to ${to}`);
      logEntry.status = 'SENT';
      logEntry.id = info.messageId || logEntry.id;
    } catch (err: any) {
      console.error(`[Email Dispatcher Error] Failed sending to ${to} via ${smtpHost}:`, err.message);
      logEntry.status = 'FAILED';
      logEntry.error = err.message;

      emailLogs.unshift(logEntry);
      if (emailLogs.length > 500) emailLogs.pop();

      return {
        success: false,
        error: err.message,
      };
    }
  } else {
    console.log(`[Email Dispatcher Simulated] No SMTP password set. Recorded dispatch to ${to}: "${subject}"`);
    logEntry.status = 'SENT';
  }

  emailLogs.unshift(logEntry);
  if (emailLogs.length > 500) {
    emailLogs.pop();
  }

  return {
    success: true,
    messageId: logEntry.id,
  };
}

// ==========================================
// SHARED EMAIL HEADER & FOOTER LAYOUT
// ==========================================

const LOGO_URL = 'https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png';

function wrapEmailContent(contentHtml: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px; color: #1E293B; background-color: #FFFFFF;">
      <!-- Header Bar with Logo -->
      <div style="background: linear-gradient(135deg, #02066F 0%, #030A91 50%, #0412B3 100%); padding: 24px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <img src="${LOGO_URL}" alt="Naisiae Textiles Logo" style="width: 64px; height: 64px; object-fit: contain; margin-bottom: 10px; display: block;" />
              <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px; color: #FFFFFF; font-weight: 900;">NAISIAE TEXTILES</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #FACB00; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                Official School Uniforms & Educational Apparel
              </p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Body Content -->
      <div style="padding: 24px 16px;">
        ${contentHtml}
      </div>

      <!-- Footer -->
      <div style="background-color: #030A91; padding: 16px; border-radius: 0 0 10px 10px; text-align: center; color: white; font-size: 11px; line-height: 1.6;">
        <p style="margin: 0; color: #FFFFFF; font-weight: bold;">Naisiae Textiles Ltd • Uhuru Market, Nairobi, Kenya</p>
        <p style="margin: 4px 0 0 0; color: #93C5FD;">Phone: 0792021496 / 0112264870 • Email: support@naisiaetextiles.com • naisiaetextiles.com</p>
      </div>
    </div>
  `;
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

export function generateWelcomeEmailHtml(customerName: string, settings: any): string {
  const clientName = customerName || 'Valued Customer';
  const body = `
    <h2 style="color: #030A91; margin-top: 0; font-size: 20px;">Welcome to Naisiae Textiles, ${clientName}!</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Thank you for creating your account with <strong>Naisiae Textiles</strong>. Your profile is now active, giving you access to our complete institutional and school uniform catalog, custom fittings, and rapid order dispatch.
    </p>

    <div style="background-color: #F8FAFC; border-left: 4px solid #030A91; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #030A91;">What You Can Do Now:</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
        <li>Browse and order authentic school uniforms by institution name.</li>
        <li>Select precise sizes, colors, and official embroidery details.</li>
        <li>Enjoy instant checkout via <strong>M-PESA Paybill 522522</strong>, Card, or Cash.</li>
        <li>Track order status and download official KRA eTIMS fiscal receipts.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://naisiaetextiles.com/portal" style="background-color: #030A91; color: #FACB00; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
        Explore Uniform Catalog &rarr;
      </a>
    </div>

    <div style="border-top: 1px solid #E2E8F0; padding-top: 18px; font-size: 13px; color: #64748B;">
      <p style="margin: 4px 0;"><strong>Need Assistance or Bulk Sizing?</strong></p>
      <p style="margin: 4px 0;">Our uniform specialists are available at Uhuru Market, Nairobi.</p>
      <p style="margin: 4px 0;">Direct Lines: <strong>0792021496 / 0112264870</strong></p>
      <p style="margin: 4px 0;">Support Email: <a href="mailto:support@naisiaetextiles.com" style="color: #030A91;">support@naisiaetextiles.com</a></p>
    </div>
  `;
  return wrapEmailContent(body);
}

export function generateInvoiceEmailHtml(invoice: any, settings: any): string {
  const body = `
    <h2 style="color: #030A91; margin-top: 0;">Official Invoice: ${invoice.invoiceNumber}</h2>
    <p>Dear <strong>${invoice.customerName}</strong>,</p>
    <p>Please find below the official invoice for your school uniform order from Naisiae Textiles.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
          <th style="padding: 8px; text-align: left;">Item Description</th>
          <th style="padding: 8px; text-align: center;">Size</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Unit Price</th>
          <th style="padding: 8px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || [])
          .map(
            (item: any) => `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 8px;">${item.productName}</td>
            <td style="padding: 8px; text-align: center;">${item.size || 'STD'}</td>
            <td style="padding: 8px; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right;">KES ${Number(item.unitPrice).toLocaleString()}</td>
            <td style="padding: 8px; text-align: right;">KES ${Number(item.total).toLocaleString()}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
      <p style="margin: 4px 0;">Subtotal: <strong>KES ${Number(invoice.subtotal).toLocaleString()}</strong></p>
      <p style="margin: 4px 0;">VAT (16% Standard): <strong>KES ${Number(invoice.taxAmount).toLocaleString()}</strong></p>
      <p style="margin: 4px 0; font-size: 18px; color: #030A91;">Total Due: <strong>KES ${Number(invoice.totalAmount).toLocaleString()}</strong></p>
      ${invoice.amountPaid > 0 ? `<p style="margin: 4px 0; color: #16A34A;">Amount Paid: KES ${Number(invoice.amountPaid).toLocaleString()}</p>` : ''}
      <p style="margin: 4px 0; font-size: 16px; color: #DC2626;">Balance Due: <strong>KES ${Number(invoice.balanceDue).toLocaleString()}</strong></p>
    </div>

    <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 12px; color: #64748B;">
      <p><strong>Payment Instructions:</strong></p>
      <p>Bank: KCB Bank | Branch: Uhuru Market | Account: 1102938475</p>
      <p>M-PESA Paybill: <strong>522522</strong> | Account: <strong>${invoice.invoiceNumber}</strong></p>
      <p>KRA PIN: ${settings?.kraPin || 'A009876543Z'} | eTIMS Control: ${invoice.kraControlCode || 'OSCU-VERIFIED'}</p>
    </div>
  `;
  return wrapEmailContent(body);
}

export function generateQuotationEmailHtml(quote: any, settings: any): string {
  const body = `
    <h2 style="color: #030A91; margin-top: 0;">Quotation: ${quote.quotationNumber}</h2>
    <p>Dear <strong>${quote.customerName}</strong>,</p>
    <p>Thank you for considering Naisiae Textiles for your school uniform requirements. Below is your official quotation:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
          <th style="padding: 8px; text-align: left;">Item Description</th>
          <th style="padding: 8px; text-align: center;">Size</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Unit Price</th>
          <th style="padding: 8px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(quote.items || [])
          .map(
            (item: any) => `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 8px;">${item.productName}</td>
            <td style="padding: 8px; text-align: center;">${item.size || 'STD'}</td>
            <td style="padding: 8px; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; text-align: right;">KES ${Number(item.unitPrice).toLocaleString()}</td>
            <td style="padding: 8px; text-align: right;">KES ${Number(item.total).toLocaleString()}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
      <p style="margin: 4px 0;">Subtotal (Net Excl. VAT): <strong>KES ${Number(quote.subtotal).toLocaleString()}</strong></p>
      <p style="margin: 4px 0;">16% Standard VAT: <strong>KES ${Number(quote.taxAmount).toLocaleString()}</strong></p>
      <p style="margin: 4px 0; font-size: 18px; color: #030A91;">Total Estimate: <strong>KES ${Number(quote.totalAmount).toLocaleString()}</strong></p>
    </div>

    <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 12px; color: #64748B;">
      <p><strong>Validity & Terms:</strong></p>
      <p>Valid Until: <strong>${quote.validUntil}</strong></p>
      <p>${quote.terms || 'Prices inclusive of 16% VAT. Valid for 30 days.'}</p>
    </div>
  `;
  return wrapEmailContent(body);
}

export function generateReceiptEmailHtml(receipt: any, saleOrSettings?: any): string {
  const items = saleOrSettings?.items || [];
  const body = `
    <div style="text-align: center;">
      <p style="font-size: 13px; margin: 0; color: #64748B; text-transform: uppercase; font-weight: bold;">Receipt Number</p>
      <h3 style="font-size: 24px; margin: 4px 0; color: #030A91; font-weight: 900;">${receipt.receiptNumber}</h3>
      <p style="font-size: 13px; color: #16A34A; font-weight: 700; margin-top: 4px;">&#10003; PAYMENT CONFIRMED & FULFILLED</p>

      <div style="background-color: #F8FAFC; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: left; font-size: 14px; border: 1px solid #E2E8F0;">
        <p style="margin: 6px 0;"><strong>Customer:</strong> ${receipt.customerName}</p>
        <p style="margin: 6px 0;"><strong>Fulfillment Branch:</strong> ${receipt.branchName || 'Nairobi CBD (Uhuru Market)'}</p>
        <p style="margin: 6px 0;"><strong>Payment Method:</strong> ${receipt.paymentMethod} ${receipt.paymentReference ? `(${receipt.paymentReference})` : ''}</p>
        <p style="margin: 6px 0; font-size: 16px; color: #030A91;"><strong>Amount Paid:</strong> KES ${Number(receipt.amount).toLocaleString()}</p>
        <p style="margin: 6px 0; font-size: 12px; color: #64748B;"><strong>KRA eTIMS CU Number:</strong> ${receipt.cuNumber || '013000000000001'}</p>
      </div>

      ${
        items.length > 0
          ? `
        <div style="text-align: left; margin: 20px 0;">
          <p style="font-size: 13px; font-weight: bold; color: #030A91; margin-bottom: 8px;">Order Items:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${items
              .map(
                (it: any) => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 6px 0;">${it.productName} (${it.size || 'STD'})</td>
                <td style="padding: 6px 0; text-align: center;">Qty: ${it.quantity}</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold;">KES ${Number(it.total || it.unitPrice * it.quantity).toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>
      `
          : ''
      }

      <p style="font-size: 12px; color: #64748B; margin-top: 20px; line-height: 1.5;">
        Thank you for choosing Naisiae Textiles. Please retain this email receipt for warranty, collection, and exchanges.
      </p>
    </div>
  `;
  return wrapEmailContent(body);
}
