import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminKey = process.env.ADMIN_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get all food availability
router.get('/', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== adminKey) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let { data } = await supabase
      .from('food_availability')
      .select('*')
      .order('food_id', { ascending: true });

    // Check if any foods need to be auto-enabled
    const now = new Date();
    const foodsToUpdate = (data || []).filter(f => f.unavailable_until && new Date(f.unavailable_until) <= now && !f.is_available);
    
    if (foodsToUpdate.length > 0) {
      await supabase
        .from('food_availability')
        .update({ is_available: true, unavailable_until: null })
        .in('id', foodsToUpdate.map(f => f.id));
      
      // Refresh data
      ({ data } = await supabase
        .from('food_availability')
        .select('*')
        .order('food_id', { ascending: true }));
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching food availability:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update food availability
router.post('/', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== adminKey) return res.status(401).json({ error: 'Unauthorized' });

  const { foodId, foodName, isAvailable, unavailableUntil } = req.body;

  try {
    // Check if record exists
    const { data: existing } = await supabase
      .from('food_availability')
      .select('id')
      .eq('food_id', foodId)
      .single();

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

    if (result.error) throw result.error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating food availability:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
