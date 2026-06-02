const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.get('/current', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, started_at, plan:plans(id, slug, name, price, billing_cycle)')
    .eq('user_id', req.user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return res.json(data || null);
}));

router.post('/', asyncHandler(async (req, res) => {
  const slug = String(req.body.planSlug || '').trim() || 'basic';

  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, slug, name, price, billing_cycle')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (planError || !plan) {
    return res.status(404).json({ message: 'Plano nao encontrado.' });
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled', ended_at: new Date().toISOString() })
    .eq('user_id', req.user.id)
    .eq('status', 'active');

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: req.user.id,
      plan_id: plan.id,
      status: 'active'
    })
    .select('id, status, started_at, plan:plans(id, slug, name, price, billing_cycle)')
    .single();

  if (error) throw error;
  return res.status(201).json(data);
}));

module.exports = router;
