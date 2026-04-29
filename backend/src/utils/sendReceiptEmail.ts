import { Resend } from 'resend';

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface ReceiptData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  date: string;
}

export async function sendReceiptEmail(data: ReceiptData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // skip silently if not configured
  const resend = new Resend(apiKey);
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${item.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">Rs. ${(item.price * item.qty).toLocaleString()}</td>
    </tr>
  `).join('');

  await resend.emails.send({
    from: 'OneShop POS <onboarding@resend.dev>',
   to: data.customerEmail,
    subject: `Your Receipt - ${data.orderId}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#111827">
        <div style="background:#1B1A55;padding:20px;border-radius:12px;text-align:center;margin-bottom:24px">
          <h1 style="color:white;margin:0;font-size:20px">OneShop POS</h1>
          <p style="color:#9290C3;margin:4px 0 0">Payment Receipt</p>
        </div>

        <p>Hi <strong>${data.customerName}</strong>, thank you for your purchase!</p>

        <div style="background:#f7f8fc;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 4px;color:#6B7280;font-size:12px">ORDER ID</p>
          <p style="margin:0;font-weight:bold">${data.orderId}</p>
          <p style="margin:8px 0 4px;color:#6B7280;font-size:12px">DATE</p>
          <p style="margin:0">${data.date}</p>
          <p style="margin:8px 0 4px;color:#6B7280;font-size:12px">PAYMENT</p>
          <p style="margin:0">${data.paymentMethod}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="color:#6B7280;font-size:12px">
              <th style="text-align:left;padding-bottom:8px">Item</th>
              <th style="text-align:center;padding-bottom:8px">Qty</th>
              <th style="text-align:right;padding-bottom:8px">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div style="border-top:2px solid #1B1A55;padding-top:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#6B7280">
            <span>Subtotal</span><span>Rs. ${data.subtotal.toLocaleString()}</span>
          </div>
          ${data.discount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#F59E0B">
            <span>Discount</span><span>−Rs. ${data.discount.toLocaleString()}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;color:#1B1A55;margin-top:8px">
            <span>Total</span><span>Rs. ${data.total.toLocaleString()}</span>
          </div>
        </div>

        <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:24px">
          Thank you for shopping with us!<br/>OneShop POS v1.0
        </p>
      </div>
    `,
  });
}