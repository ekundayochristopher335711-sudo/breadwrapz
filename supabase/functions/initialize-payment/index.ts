import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { calculateTotal, calculateDeliveryFee, DELIVERY_FEE } from '../_shared/menuPrices.ts';

const MAX_ORDER_AMOUNT = 500000;
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'breadwrapzfoods@gmail.com';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, items, deliveryLocation, contact, customerName, customerPhone, deliveryDistanceKm } =
      await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Cart is empty.' }, 400);
    }
    if (!deliveryLocation?.trim()) {
      return json({ error: 'Delivery location is required.' }, 400);
    }

    const parsedDistance = Number(deliveryDistanceKm);
    const computedDeliveryFee =
      Number.isFinite(parsedDistance) && parsedDistance > 0
        ? calculateDeliveryFee(parsedDistance)
        : DELIVERY_FEE;

    const amount = calculateTotal(items, computedDeliveryFee);

    if (amount <= 0) return json({ error: 'Order total must be greater than zero.' }, 400);
    if (amount > MAX_ORDER_AMOUNT) return json({ error: 'Order total exceeds maximum allowed amount.' }, 400);

    const normalizedEmail = email?.trim().toLowerCase() || `customer+${Date.now()}@breadwrapz.com`;
    const orderId = `BRD-${Date.now()}`;
    const reference = orderId;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Extract user ID from JWT if logged in
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id ?? null;
    }

    const { error: dbError } = await supabase.from('orders').insert({
      order_id: orderId,
      reference,
      user_id: userId,
      email: normalizedEmail,
      contact,
      customer_name: customerName,
      customer_phone: customerPhone,
      amount,
      items,
      delivery_location: deliveryLocation.trim(),
      delivery_distance_km: Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : null,
      delivery_fee: computedDeliveryFee,
      status: 'Order Received',
    });

    if (dbError) throw dbError;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        amount: Math.round(amount * 100),
        reference,
        callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL') || 'https://breadwrapz2.netlify.app',
        metadata: { orderId, contact, deliveryLocation, items, deliveryDistanceKm: parsedDistance, deliveryFee: computedDeliveryFee },
      }),
    });

    const paystackData = await paystackRes.json();

    // Fire-and-forget owner notification
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const itemList = (items as any[]).map((i) => `• ${i.name} — ₦${Number(i.price).toLocaleString()}`).join('\n');
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${Deno.env.get('RESEND_FROM_NAME') || 'Breadwrapz Orders'} <${Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'}>`,
          to: OWNER_EMAIL,
          subject: `New Order ${orderId} — ₦${Number(amount).toLocaleString()}`,
          text: `New order received!\n\nOrder ID: ${orderId}\nCustomer: ${customerName || 'N/A'}\nPhone: ${customerPhone || contact}\nDelivery: ${deliveryLocation}\n\nItems:\n${itemList}\n\nTotal: ₦${Number(amount).toLocaleString()}\n\nStatus: Order Received`,
        }),
      }).catch(console.error);
    }

    return json({
      order: {
        orderId,
        reference,
        amount,
        status: 'Order Received',
        deliveryFee: computedDeliveryFee,
        deliveryDistanceKm: Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : null,
      },
      paystack: paystackData.data,
    });
  } catch (error: any) {
    console.error('initialize-payment error:', error);
    return json({ error: 'Payment initialization failed. Please try again.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
