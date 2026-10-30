const express = require('express');
const { supabaseAdmin: db } = require('../config/supabase');
const { formatStay, calculateBilling, loadVehicles } = require('../lib/vex-schema');
const router = express.Router();
const run = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.get('/', run(async (req, res) => {
  let vehicles = await loadVehicles(req.user.id);
  if (req.query.status === 'active') vehicles = vehicles.filter(v => !v.exit_at);
  if (req.query.status === 'closed') vehicles = vehicles.filter(v => v.exit_at);
  res.json(vehicles);
}));
router.post('/', run(async (req, res) => {
  const plate = String(req.body.plate || '').trim().toUpperCase();
  if (!plate) return res.status(400).json({ message: 'Informe a placa.' });
  const { data: rates, error: rateError } = await db.from('register').select('*').eq('company_id', req.user.id).eq('vehicle_type', String(req.body.vehicleType || '').trim()).order('stay_minutes');
  if (rateError) throw rateError;
  const choice = String(req.body.stayType || '');
  const rate = rates.find(r => r.id === req.body.registerId) || rates.find(r => formatStay(r) === choice) || rates.find(r => choice === 'Normal' && r.stay_type === 'minute');
  if (!rate) return res.status(400).json({ message: 'Tarifa nao encontrada para esta empresa.' });
  const existing = await loadVehicles(req.user.id);
  if (existing.some(v => v.plate === plate && !v.exit_at)) return res.status(409).json({ message: 'Ja existe uma entrada ativa para esta placa.' });
  const optional = value => String(value || '').trim() || null;
  const { data, error } = await db.from('vehicles').insert({ company_id: req.user.id, register_id: rate.id, plate,
    model: optional(req.body.model), brand: optional(req.body.brand), color: optional(req.body.color), cpf: optional(req.body.ownerCpf) }).select('id').single();
  if (error) throw error;
  res.status(201).json((await loadVehicles(req.user.id)).find(v => v.id === data.id));
}));
router.patch('/:id/exit', run(async (req, res) => {
  const { data: vehicle, error } = await db.from('vehicles').select('*').eq('company_id', req.user.id).eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!vehicle) return res.status(404).json({ message: 'Veiculo nao encontrado.' });
  const { data: rate, error: rateError } = await db.from('register').select('*').eq('company_id', req.user.id).eq('id', vehicle.register_id).single();
  if (rateError) throw rateError;
  const exitAt = new Date().toISOString();
  const billing = calculateBilling(vehicle, rate, exitAt);
  const { error: historyError } = await db.from('history').insert({ company_id: req.user.id, vehicle_id: vehicle.id, exited_at: exitAt, total_value: billing.billing_total });
  if (historyError) {
    if (historyError.code === '23505') return res.status(409).json({ message: 'Esta estadia ja foi encerrada.' });
    throw historyError;
  }
  res.json((await loadVehicles(req.user.id)).find(v => v.id === vehicle.id));
}));
module.exports = router;
