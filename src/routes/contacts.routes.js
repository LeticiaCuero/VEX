const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const message = String(req.body.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Informe nome, e-mail e mensagem.' });
  }

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert({ name, email, phone, message })
    .select('id, created_at')
    .single();

  if (error) throw error;
  return res.status(201).json(data);
}));

module.exports = router;
