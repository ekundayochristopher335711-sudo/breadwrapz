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

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    let { data, error } = await supabase
      .from('food_availability')
      .select('*')
      .order('food_id', { ascending: true });

    if (error) return json({ error: error.message }, 500);

    // Auto-enable foods that are past their unavailable_until time
    const now = new Date();
    const foodsToUpdate = (data || []).filter((f: any) => 
      f.unavailable_until && new Date(f.unavailable_until) <= now && !f.is_available
    );

    if (foodsToUpdate.length > 0) {
      const ids = foodsToUpdate.map((f: any) => f.id);
      await supabase
        .from('food_availability')
        .update({ is_available: true, unavailable_until: null })
        .in('id', ids);

      // Refresh data
      const result = await supabase
        .from('food_availability')
        .select('*')
        .order('food_id', { ascending: true });
      data = result.data;
    }

    return json(data || []);
  }

  if (req.method === 'POST') {
    const { foodId, foodName, isAvailable, unavailableUntil } = await req.json();

    if (!foodId || typeof isAvailable !== 'boolean') {
      return json({ error: 'Missing required foodId or availability state.' }, 400);
    }

    if (!isAvailable && !unavailableUntil) {
      return json({ error: 'Please provide a valid unavailable-until datetime.' }, 400);
    }

    // Check if record exists
    const { data: existing, error: existingError } = await supabase
      .from('food_availability')
      .select('id')
      .eq('food_id', foodId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      return json({ error: existingError.message }, 500);
    }

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from('food_availability')
        .update({
          is_available: isAvailable,
          unavailable_until: isAvailable ? null : unavailableUntil,
          updated_at: new Date(),
        })
        .eq('food_id', foodId);
    } else {
      // Insert new
      result = await supabase
        .from('food_availability')
        .insert({
          food_id: foodId,
          food_name: foodName,
          is_available: isAvailable,
          unavailable_until: isAvailable ? null : unavailableUntil,
        });
    }

    if (result.error) return json({ error: result.error.message }, 500);
    return json({ success: true });
  }

  return json({ error: 'Method not allowed' }, 405);
});
