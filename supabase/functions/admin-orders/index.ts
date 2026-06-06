import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const VALID_STATUSES = ['Order Received', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

function adminKeyValid(provided: string | null): boolean {
  const expected = Deno.env.get('ADMIN_KEY');
  if (!provided || !expected || provided.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

function toClientOrder(o: Record<string, unknown>) {
  return {
    orderId: o.order_id,
    reference: o.reference,
    userId: o.user_id,
    email: o.email,
    contact: o.contact,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    amount: o.amount,
    items: o.items,
    deliveryLocation: o.delivery_location,
    deliveryDistanceKm: o.delivery_distance_km,
    deliveryFee: o.delivery_fee,
    status: o.status,
    paymentVerified: o.payment_verified,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!adminKeyValid(req.headers.get('x-admin-key'))) {
    return json({ error: 'Unauthorised' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (req.method === 'GET') {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return json({ error: error.message }, 500);
    return json((orders || []).map(toClientOrder));
  }

  if (req.method === 'POST') {
    const { orderId, status } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
      return json({ error: 'Invalid status.', validStatuses: VALID_STATUSES }, 400);
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error || !updated) return json({ error: 'Order not found.' }, 404);
    return json(toClientOrder(updated));
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
