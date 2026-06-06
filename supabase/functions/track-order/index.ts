import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return json({ error: 'Order ID is required.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order } = await supabase
      .from('orders')
      .select('order_id, status, amount, items, delivery_location, created_at, updated_at, reference')
      .eq('order_id', orderId.trim().toUpperCase())
      .single();

    if (!order) {
      return json({ error: 'Order not found.' }, 404);
    }

    return json({
      orderId: order.order_id,
      status: order.status,
      amount: order.amount,
      items: order.items,
      deliveryLocation: order.delivery_location,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      reference: order.reference,
    });
  } catch (error: any) {
    console.error('track-order error:', error);
    return json({ error: 'Failed to fetch order status.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
