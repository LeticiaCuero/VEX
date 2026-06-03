const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const normalizePlate = (value) => String(value || '').trim().toUpperCase();
const vehicleColumns = [
  'id',
  'plate',
  'model',
  'brand',
  'color',
  'owner_cpf',
  'vehicle_type',
  'stay_type',
  'entry_at',
  'exit_at',
  'created_at',
  'billing_rate_id',
  'billing_initial',
  'billing_additional',
  'billing_additional_hours',
  'billing_additional_total',
  'billing_total',
  'billing_elapsed_minutes',
  'billing_initial_minutes',
  'billing_additional_start_minutes',
  'billing_exceeded_minutes'
].join(', ');

function normalizeStayType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseStayMinutes(stayType) {
  const normalized = normalizeStayType(stayType);
  const numberMatch = normalized.match(/(\d+(?:[,.]\d+)?)/);
  const amount = numberMatch ? Number(numberMatch[1].replace(',', '.')) : 0;

  if (normalized.includes('diaria') || normalized.includes('dia')) {
    return 24 * 60;
  }

  if (normalized.includes('mensal') || normalized.includes('mes')) {
    return 30 * 24 * 60;
  }

  if (amount && /(min|minuto|minutos)/.test(normalized)) {
    return Math.round(amount);
  }

  if (amount && /(h|hora|horas)/.test(normalized)) {
    return Math.round(amount * 60);
  }

  return 60;
}

function isDailyStay(stayType) {
  const normalized = normalizeStayType(stayType);
  return normalized === 'diaria' || normalized.includes('diaria') || normalized.includes('dia');
}

function isNormalStay(stayType) {
  return normalizeStayType(stayType) === 'normal';
}

function getRatesForStayChoice(rates, stayType) {
  if (isNormalStay(stayType)) {
    return rates
      .filter((rate) => !isDailyStay(rate.stay_type) && !normalizeStayType(rate.stay_type).includes('mensal'))
      .sort((a, b) => parseStayMinutes(a.stay_type) - parseStayMinutes(b.stay_type));
  }

  if (isDailyStay(stayType)) {
    return rates.filter((rate) => isDailyStay(rate.stay_type));
  }

  return rates.filter((rate) => rate.stay_type === stayType);
}

function findRateForStayChoice(rates, stayType, elapsedMinutes = 0) {
  const matchingRates = getRatesForStayChoice(rates, stayType);

  if (!matchingRates.length) {
    return null;
  }

  if (isNormalStay(stayType)) {
    return matchingRates.find((rate) => elapsedMinutes <= parseStayMinutes(rate.stay_type)) || matchingRates[matchingRates.length - 1];
  }

  return matchingRates[0];
}

function resolveAdditionalValue(rate, initial, initialMinutes) {
  const additional = Number(rate.additional || 0);

  if (additional > 0) {
    return additional;
  }

  return initialMinutes < 24 * 60 ? initial : 0;
}

function calculateBilling(vehicle, rate, exitAt) {
  const entryDate = new Date(vehicle.entry_at);
  const exitDate = new Date(exitAt);
  const elapsedMs = Math.max(exitDate - entryDate, 0);
  const elapsedMinutes = Math.max(Math.round(elapsedMs / (1000 * 60)), 0);
  const initialMinutes = parseStayMinutes(rate.stay_type);
  const additionalStartMinutes = Math.max(initialMinutes, 60);
  const exceededMinutes = Math.max(elapsedMinutes - additionalStartMinutes, 0);
  const additionalHours = Math.ceil(exceededMinutes / 60);
  const initial = Number(rate.value || 0);
  const additional = resolveAdditionalValue(rate, initial, initialMinutes);
  const additionalTotal = additionalHours * additional;

  return {
    billing_rate_id: rate.id,
    billing_initial: initial,
    billing_additional: additional,
    billing_additional_hours: additionalHours,
    billing_additional_total: additionalTotal,
    billing_total: initial + additionalTotal,
    billing_elapsed_minutes: elapsedMinutes,
    billing_initial_minutes: initialMinutes,
    billing_additional_start_minutes: additionalStartMinutes,
    billing_exceeded_minutes: exceededMinutes
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  let query = supabaseAdmin
    .from('vehicles')
    .select(vehicleColumns)
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

  const { data: rates, error: rateError } = await supabaseAdmin
    .from('rates')
    .select('id, stay_type')
    .eq('vehicle_type', payload.vehicle_type);

  if (rateError) throw rateError;

  if (!findRateForStayChoice(rates || [], payload.stay_type)) {
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
    .select(vehicleColumns)

    .single();

  if (error) throw error;
  return res.status(201).json(data);
}));

router.patch('/:id/exit', asyncHandler(async (req, res) => {
  const exitAt = new Date().toISOString();

  const { data: vehicle, error: vehicleError } = await supabaseAdmin
    .from('vehicles')
    .select(vehicleColumns)
    .eq('id', req.params.id)
    .is('exit_at', null)
    .single();

  if (vehicleError) throw vehicleError;

  const elapsedMs = Math.max(new Date(exitAt) - new Date(vehicle.entry_at), 0);
  const elapsedMinutes = Math.max(Math.round(elapsedMs / (1000 * 60)), 0);

  const { data: rates, error: rateError } = await supabaseAdmin
    .from('rates')
    .select('id, stay_type, value, additional')
    .eq('vehicle_type', vehicle.vehicle_type);

  if (rateError) throw rateError;

  const rate = findRateForStayChoice(rates || [], vehicle.stay_type, elapsedMinutes);

  if (!rate) {
    return res.status(400).json({ message: 'Tarifa nao encontrada para esse veiculo.' });
  }

  const billing = calculateBilling(vehicle, rate, exitAt);

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .update({ exit_at: exitAt, ...billing })
    .eq('id', req.params.id)
    .is('exit_at', null)
    .select(vehicleColumns)
    .single();

  if (error) throw error;
  return res.json(data);
}));

module.exports = router;
