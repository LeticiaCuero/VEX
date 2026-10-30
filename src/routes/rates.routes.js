const express = require('express');
const { supabaseAdmin: db } = require('../config/supabase');
const { mapRate } = require('../lib/vex-schema');
const router = express.Router();
const run = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
function parseRate(body) {
  const stay = String(body.stayType || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let type = body.sqlStayType;
  let minutes = Number(body.stayMinutes);
  if (!type) {
    if (/diaria|dia|daily/.test(stay)) type = 'daily';
    else if (/mensal|mes|monthly/.test(stay)) type = 'monthly';
    else {
      type = 'minute';
      const match = stay.match(/(\d+(?:[,.]\d+)?)/);
      minutes = match ? Number(match[1].replace(',', '.')) * (/hora|\bh\b/.test(stay) ? 60 : 1) : NaN;
    }
  }
  return { vehicle_type: String(body.vehicleType || '').trim(), stay_type: type,
    stay_minutes: type === 'minute' ? minutes : null, initial_value: Number(body.value),
    additional_hour: body.additional === '' || body.additional == null ? null : Number(body.additional) };
}
router.get('/', run(async (req, res) => {
  const { data, error } = await db.from('register').select('*').eq('company_id', req.user.id).order('vehicle_type').order('stay_minutes');
  if (error) throw error;
  res.json(data.map(mapRate));
}));
async function save(req, res) {
  const values = parseRate(req.body);
  if (!values.vehicle_type || !['minute','daily','monthly'].includes(values.stay_type) ||
      (values.stay_type === 'minute' && (!Number.isInteger(values.stay_minutes) || values.stay_minutes < 1)) ||
      !Number.isFinite(values.initial_value) || values.initial_value < 0 || values.initial_value > 99999999.99 ||
      (values.additional_hour != null && (!Number.isFinite(values.additional_hour) || values.additional_hour < 0 || values.additional_hour > 99999999.99))) {
    return res.status(400).json({ message: 'Informe veiculo, estadia (ex.: 30 Minutos, Diaria ou Mensal) e valores validos.' });
  }
  const query = req.params.id
    ? db.from('register').update(values).eq('company_id', req.user.id).eq('id', req.params.id)
    : db.from('register').insert({ ...values, company_id: req.user.id });
  const { data, error } = await query.select('*').single();
  if (error) {
    if (error.code === '23503') return res.status(409).json({ message: 'Cadastre a empresa vinculada a esta conta antes de salvar tarifas.' });
    throw error;
  }
  res.status(req.params.id ? 200 : 201).json(mapRate(data));
}
router.post('/', run(save));
router.put('/:id', run(save));
router.delete('/:id', run(async (req, res) => {
  const { error } = await db.from('register').delete().eq('company_id', req.user.id).eq('id', req.params.id);
  if (error) {
    if (error.code === '23503') return res.status(409).json({ message: 'Esta tarifa esta vinculada a veiculos e nao pode ser excluida.' });
    throw error;
  }
  res.status(204).send();
}));
module.exports = router;
