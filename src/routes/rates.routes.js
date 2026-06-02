const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function parseMoney(value) {
  if (typeof value === 'number') {
    return value;
  }

  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('rates')
    .select('id, vehicle_type, stay_type, value, created_at, updated_at')
    .order('vehicle_type', { ascending: true })
    .order('stay_type', { ascending: true });

  if (error) throw error;
  return res.json(data);
}));

router.post('/', asyncHandler(async (req, res) => {
  const vehicleType = String(req.body.vehicleType || '').trim();
  const stayType = String(req.body.stayType || '').trim();
  const value = parseMoney(req.body.value);

  if (!vehicleType || !stayType || !Number.isFinite(value) || value < 0) {
    return res.status(400).json({ message: 'Informe tipo de veiculo, tipo de estadia e valor valido.' });
  }

  const { data, error } = await supabaseAdmin
    .from('rates')
    .insert({ vehicle_type: vehicleType, stay_type: stayType, value })
    .select('id, vehicle_type, stay_type, value, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Essa configuracao ja existe.' });
    }
    throw error;
  }

  return res.status(201).json(data);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const vehicleType = String(req.body.vehicleType || '').trim();
  const stayType = String(req.body.stayType || '').trim();
  const value = parseMoney(req.body.value);

  if (!vehicleType || !stayType || !Number.isFinite(value) || value < 0) {
    return res.status(400).json({ message: 'Informe tipo de veiculo, tipo de estadia e valor valido.' });
  }

  const { data, error } = await supabaseAdmin
    .from('rates')
    .update({ vehicle_type: vehicleType, stay_type: stayType, value, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('id, vehicle_type, stay_type, value, created_at, updated_at')
    .single();

  if (error) throw error;
  return res.json(data);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { error } = await supabaseAdmin
    .from('rates')
    .delete()
    .eq('id', req.params.id);

  if (error) throw error;
  return res.status(204).send();
}));

module.exports = router;
