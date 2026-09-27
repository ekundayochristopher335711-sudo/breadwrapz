import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function adminKeyValid(provided: string | null): boolean {
  const expected = Deno.env.get('ADMIN_KEY');
  if (!provided || !expected || provided.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
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
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error) return json({ error: error.message }, 500);
    return json(data || []);
  }

  if (req.method === 'POST') {
    const { id, action } = await req.json();

    if (action === 'approve') {
      const { error } = await supabase.from('reviews').update({ approved: true }).eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === 'reject') {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
