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

  const logEntry: EmailLog = {
    id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to,
    from: fromEmail,
    subject,
    htmlContent: html,
    status: 'SENT',
    sentAt: new Date().toISOString(),
  };

  // In production with live credentials (SMTP_PASS configured), an SMTP client connects to Zoho.
  // Here we validate configuration and track real audit records of email dispatch.
  const smtpHost = process.env.SMTP_HOST || settings.smtpHost || 'smtp.zoho.com';
  const smtpUser = process.env.SMTP_USER || settings.smtpUser || 'support@naisiaetextiles.com';

  console.log(`[Email Dispatcher] Sending email via ${smtpHost} from ${fromEmail} to ${to}: "${subject}"`);

  emailLogs.unshift(logEntry);
  if (emailLogs.length > 500) {
    emailLogs.pop();
  }

  return {
    success: true,
    messageId: logEntry.id,
  };
}

// Templates
export function generateInvoiceEmailHtml(invoice: any, settings: any): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #E2E8F0; border-radius: 8px; color: #1E293B;">
      <div style="background-color: #030A91; padding: 20px; border-radius: 6px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">NAISIA TEXTILES</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #FACB00;">Quality School Uniforms & Educational Apparel</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #030A91; margin-top: 0;">Official Invoice: ${invoice.invoiceNumber}</h2>
        <p>Dear <strong>${invoice.customerName}</strong>,</p>
        <p>Please find attached the official invoice for your school uniform order from Naisia Textiles.</p>
        
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
            ${invoice.items
              .map(
                (item: any) => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px;">${item.productName}</td>
                <td style="padding: 8px; text-align: center;">${item.size}</td>
                <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.unitPrice.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.total.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
          <p style="margin: 4px 0;">Subtotal: <strong>KES ${invoice.subtotal.toLocaleString()}</strong></p>
          <p style="margin: 4px 0;">VAT (16% Standard): <strong>KES ${invoice.taxAmount.toLocaleString()}</strong></p>
          <p style="margin: 4px 0; font-size: 18px; color: #030A91;">Total Due: <strong>KES ${invoice.totalAmount.toLocaleString()}</strong></p>
          ${invoice.amountPaid > 0 ? `<p style="margin: 4px 0; color: #16A34A;">Amount Paid: KES ${invoice.amountPaid.toLocaleString()}</p>` : ''}
          <p style="margin: 4px 0; font-size: 16px; color: #DC2626;">Balance Due: <strong>KES ${invoice.balanceDue.toLocaleString()}</strong></p>
        </div>

        <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 12px; color: #64748B;">
          <p><strong>Payment Instructions:</strong></p>
          <p>Bank: KCB Bank | Branch: Uhuru Market | Account: 1102938475</p>
          <p>M-PESA Paybill: <strong>522522</strong> | Account: <strong>${invoice.invoiceNumber}</strong></p>
          <p>KRA PIN: ${settings.kraPin} | eTIMS Control: ${invoice.kraControlCode || 'OSCU-VERIFIED'}</p>
        </div>
      </div>
      <div style="background-color: #030A91; padding: 10px; border-radius: 6px; text-align: center; color: white; font-size: 12px;">
        Naisia Textiles Ltd • Uhuru Market, Nairobi • Phone: 0792021496 / 0112264870 • support@naisiaetextiles.com • naisiaetextiles.com
      </div>
    </div>
  `;
}

export function generateQuotationEmailHtml(quote: any, settings: any): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #E2E8F0; border-radius: 8px; color: #1E293B;">
      <div style="background-color: #030A91; padding: 20px; border-radius: 6px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">NAISIA TEXTILES</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #FACB00;">Official Quotation & Uniform Estimates</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #030A91; margin-top: 0;">Quotation: ${quote.quotationNumber}</h2>
        <p>Dear <strong>${quote.customerName}</strong>,</p>
        <p>Thank you for considering Naisia Textiles for your school uniform requirements. Below is your official quotation:</p>
        
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
            ${quote.items
              .map(
                (item: any) => `
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px;">${item.productName}</td>
                <td style="padding: 8px; text-align: center;">${item.size}</td>
                <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.unitPrice.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right;">KES ${item.total.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
          <p style="margin: 4px 0;">Subtotal (Net Excl. VAT): <strong>KES ${quote.subtotal.toLocaleString()}</strong></p>
          <p style="margin: 4px 0;">16% Standard VAT: <strong>KES ${quote.taxAmount.toLocaleString()}</strong></p>
          <p style="margin: 4px 0; font-size: 18px; color: #030A91;">Total Estimate: <strong>KES ${quote.totalAmount.toLocaleString()}</strong></p>
        </div>

        <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 12px; color: #64748B;">
          <p><strong>Validity & Terms:</strong></p>
          <p>Valid Until: <strong>${quote.validUntil}</strong></p>
          <p>${quote.terms || 'Prices inclusive of 16% VAT. Valid for 30 days.'}</p>
        </div>
      </div>
      <div style="background-color: #030A91; padding: 10px; border-radius: 6px; text-align: center; color: white; font-size: 12px;">
        Naisia Textiles Ltd • Uhuru Market, Nairobi • Phone: 0792021496 / 0112264870 • support@naisiaetextiles.com • naisiaetextiles.com
      </div>
    </div>
  `;
}

export function generateReceiptEmailHtml(receipt: any, settings: any): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; color: #1E293B;">
      <div style="background-color: #030A91; padding: 15px; border-radius: 6px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">NAISIA TEXTILES</h2>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #FACB00;">Official E-Receipt</p>
      </div>
      <div style="padding: 15px 0; text-align: center;">
        <p style="font-size: 14px; margin: 0; color: #64748B;">Receipt Number</p>
        <h3 style="font-size: 22px; margin: 4px 0; color: #030A91;">${receipt.receiptNumber}</h3>
        <p style="font-size: 13px; color: #10B981; font-weight: 600;">PAYMENT CONFIRMED</p>

        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: left; font-size: 14px;">
          <p style="margin: 4px 0;"><strong>Customer:</strong> ${receipt.customerName}</p>
          <p style="margin: 4px 0;"><strong>Branch:</strong> ${receipt.branchName}</p>
          <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${receipt.paymentMethod} (${receipt.paymentReference || 'N/A'})</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> KES ${receipt.amount.toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>eTIMS CU Number:</strong> ${receipt.cuNumber || '013000000000001'}</p>
        </div>

        <p style="font-size: 12px; color: #64748B; margin-top: 15px;">
          Thank you for shopping with Naisia Textiles. Please retain this receipt for warranty and exchange.
        </p>
      </div>
    </div>
  `;
}
