import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();

    if (!reference || typeof reference !== 'string') {
      return json({ error: 'Reference is required.' }, 400);
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } },
    );
    const paystackData = await paystackRes.json();
    const paymentData = paystackData.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (paymentData?.status === 'success' && order) {
      await supabase
        .from('orders')
        .update({ status: 'Confirmed', payment_verified: true, updated_at: new Date().toISOString() })
        .eq('order_id', order.order_id);
    }

    const { data: updatedOrder } = order
      ? await supabase.from('orders').select('*').eq('order_id', order.order_id).single()
      : { data: null };

    return json({
      paymentData: { status: paymentData?.status },
      order: updatedOrder
        ? {
            orderId: updatedOrder.order_id,
            status: updatedOrder.status,
            amount: updatedOrder.amount,
            items: updatedOrder.items,
            createdAt: updatedOrder.created_at,
          }
        : null,
    });
  } catch (error: any) {
    console.error('verify-payment error:', error);
    return json({ error: 'Payment verification failed. Please try again.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
