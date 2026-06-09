import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function adminKeyValid(provided: string | null): boolean {
  const expected = Deno.env.get('ADMIN_KEY');
  if (!provided || !expected || provided.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return result === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!adminKeyValid(req.headers.get('x-admin-key'))) return json({ error: 'Unauthorised' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('menu_items').select('*').order('id');
    if (error) return json({ error: error.message }, 500);
    // Auto-restore items past their unavailable_until time
    const now = new Date();
    const toRestore = (data || []).filter((i: any) => !i.available && i.unavailable_until && new Date(i.unavailable_until) <= now);
    if (toRestore.length > 0) {
      await supabase.from('menu_items').update({ available: true, unavailable_until: null }).in('id', toRestore.map((i: any) => i.id));
      const { data: fresh } = await supabase.from('menu_items').select('*').order('id');
      return json(fresh || []);
    }
    return json(data || []);
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
      const { name, description, price, category, image_url } = body;
      if (!name?.trim() || !category?.trim() || price == null) return json({ error: 'name, category and price required' }, 400);
      const { data: last } = await supabase.from('menu_items').select('id').order('id', { ascending: false }).limit(1);
      const newId = ((last?.[0] as any)?.id ?? 0) + 1;
      const { error } = await supabase.from('menu_items').insert({
        id: newId, name: name.trim(), description: description?.trim() ?? '',
        price: Number(price), category: category.trim(), image_url: image_url?.trim() ?? '', available: true,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, id: newId });
    }

    if (action === 'edit') {
      const { id, name, description, price, category, image_url } = body;
      if (!id || !name?.trim() || !category?.trim() || price == null) return json({ error: 'id, name, category and price required' }, 400);
      const { error } = await supabase.from('menu_items').update({
        name: name.trim(), description: description?.trim() ?? '',
        price: Number(price), category: category.trim(), image_url: image_url?.trim() ?? '',
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return json({ error: 'id required' }, 400);
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === 'toggle') {
      const { id, available, unavailableUntil } = body;
      if (id == null || typeof available !== 'boolean') return json({ error: 'id and available required' }, 400);
      const { error } = await supabase.from('menu_items').update({
        available,
        unavailable_until: available ? null : (unavailableUntil || new Date(Date.now() + 3600000).toISOString()),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
});
