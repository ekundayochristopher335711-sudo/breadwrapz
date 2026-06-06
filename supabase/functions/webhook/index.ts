import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OWNER_EMAIL = 'ekundayochristopher335711@gmail.com';

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('PAYSTACK_WEBHOOK_SECRET');
  if (!secret) {
    console.error('PAYSTACK_WEBHOOK_SECRET not set — webhook rejected.');
    return new Response('OK', { status: 200 });
  }

  const signature = req.headers.get('x-paystack-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const rawBody = await req.text();

  // Verify HMAC-SHA512 signature
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hash = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (hash !== signature) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(rawBody);

  if (event.event === 'charge.success') {
    const { reference } = event.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (order) {
      await supabase
        .from('orders')
        .update({ status: 'Confirmed', payment_verified: true, updated_at: new Date().toISOString() })
        .eq('order_id', order.order_id);

      console.log(`Webhook: order ${order.order_id} confirmed.`);

      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Breadwrapz Orders <onboarding@resend.dev>',
            to: OWNER_EMAIL,
            subject: `✅ Payment Confirmed — ${order.order_id}`,
            text: `Payment confirmed for order ${order.order_id}.\n\nCustomer: ${order.customer_name || 'N/A'}\nPhone: ${order.customer_phone || order.contact}\nDelivery: ${order.delivery_location}\nTotal: ₦${Number(order.amount).toLocaleString()}\n\nYou can now prepare this order.`,
          }),
        }).catch(console.error);
      }
    }
  }

  return new Response('OK', { status: 200 });
});
