import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return json({ error: 'No file provided' }, 400);

    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, 400);
    }
    if (file.size > MAX_SIZE) {
      return json({ error: 'File too large. Max 5 MB.' }, 400);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (uploadError) return json({ error: uploadError.message }, 500);

    const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(fileName);

    return json({ url: publicUrl });
  } catch (err: any) {
    return json({ error: err.message || 'Upload failed' }, 500);
  }
});
