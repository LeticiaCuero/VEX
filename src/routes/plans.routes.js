const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('plans')
    .select('id, slug, name, price, billing_cycle, features')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) throw error;
  return res.json(data);
}));

module.exports = router;
