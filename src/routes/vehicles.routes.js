const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const normalizePlate = (value) => String(value || '').trim().toUpperCase();

router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  let query = supabaseAdmin
    .from('vehicles')
    .select('id, plate, model, brand, color, owner_cpf, vehicle_type, stay_type, entry_at, exit_at, created_at')
    .order('entry_at', { ascending: false });


  if (status === 'active') query = query.is('exit_at', null);
  if (status === 'closed') query = query.not('exit_at', 'is', null);

  const { data, error } = await query;

  if (error) throw error;
  return res.json(data);
}));

router.post('/', asyncHandler(async (req, res) => {
  const payload = {
    plate: normalizePlate(req.body.plate),
    model: String(req.body.model || '').trim(),
    brand: String(req.body.brand || '').trim(),
    color: String(req.body.color || '').trim(),
    owner_cpf: String(req.body.ownerCpf || '').trim(),
    vehicle_type: String(req.body.vehicleType || '').trim(),
    stay_type: String(req.body.stayType || '').trim()
  };

  if (Object.values(payload).some((value) => !value)) {
    return res.status(400).json({ message: 'Preencha todos os dados do veiculo.' });
  }

  const { data: rate, error: rateError } = await supabaseAdmin
    .from('rates')
    .select('id')
    .eq('vehicle_type', payload.vehicle_type)
    .eq('stay_type', payload.stay_type)
    .maybeSingle();

  if (rateError) throw rateError;

  if (!rate) {
    return res.status(400).json({ message: 'Nao existe tarifa configurada para esse tipo de veiculo e estadia.' });
  }

  const { data: activeVehicle, error: activeError } = await supabaseAdmin
    .from('vehicles')
    .select('id')
    .eq('plate', payload.plate)
    .is('exit_at', null)
    .maybeSingle();


  if (activeError) throw activeError;

  if (activeVehicle) {
    return res.status(409).json({ message: 'Ja existe uma entrada ativa para esta placa.' });
  }

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .insert({ ...payload })
    .select('id, plate, model, brand, color, owner_cpf, vehicle_type, stay_type, entry_at, exit_at')

    .single();

  if (error) throw error;
  return res.status(201).json(data);
}));

router.patch('/:id/exit', asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .update({ exit_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .is('exit_at', null)

    .select('id, plate, model, brand, color, owner_cpf, vehicle_type, stay_type, entry_at, exit_at')
    .single();

  if (error) throw error;
  return res.json(data);
}));

module.exports = router;
