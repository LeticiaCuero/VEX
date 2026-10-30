const { supabaseAdmin: db } = require('../config/supabase');

function formatStay(rate) {
  return rate.stay_type === 'minute' ? `${rate.stay_minutes} Minutos` : rate.stay_type === 'daily' ? 'Diaria' : 'Mensal';
}
function mapRate(rate) {
  return { ...rate, sql_stay_type: rate.stay_type, stay_type: formatStay(rate), value: Number(rate.initial_value), additional: rate.additional_hour == null ? null : Number(rate.additional_hour) };
}
function calculateBilling(vehicle, rate, exitAt) {
  const elapsed = Math.max(Math.round((new Date(exitAt) - new Date(vehicle.entered_at)) / 60000), 0);
  const minutes = rate.stay_type === 'minute' ? rate.stay_minutes : rate.stay_type === 'daily' ? 1440 : 43200;
  const additionalStart = Math.max(minutes, 60);
  const exceeded = Math.max(elapsed - additionalStart, 0);
  const hours = Math.ceil(exceeded / 60);
  const initial = Number(rate.initial_value);
  const additional = Number(rate.additional_hour || 0) || (minutes < 1440 ? initial : 0);
  return { billing_rate_id: rate.id, billing_initial: initial, billing_additional: additional,
    billing_additional_hours: hours, billing_additional_total: hours * additional,
    billing_total: initial + hours * additional, billing_elapsed_minutes: elapsed,
    billing_initial_minutes: minutes, billing_additional_start_minutes: additionalStart,
    billing_exceeded_minutes: exceeded };
}
async function loadVehicles(companyId) {
  const { data: vehicles, error } = await db.from('vehicles').select('*').eq('company_id', companyId).order('entered_at', { ascending: false });
  if (error) throw error;
  const { data: rates, error: rateError } = await db.from('register').select('*').eq('company_id', companyId);
  if (rateError) throw rateError;
  const { data: history, error: historyError } = await db.from('history').select('*').eq('company_id', companyId);
  if (historyError) throw historyError;
  const rateMap = new Map(rates.map(rate => [rate.id, rate]));
  const historyMap = new Map(history.map(item => [item.vehicle_id, item]));
  return vehicles.map(vehicle => {
    const rate = rateMap.get(vehicle.register_id);
    const closed = historyMap.get(vehicle.id);
    const billing = closed && rate ? calculateBilling(vehicle, rate, closed.exited_at) : {};
    return { ...vehicle, ...billing, owner_cpf: vehicle.cpf || '', entry_at: vehicle.entered_at,
      exit_at: closed?.exited_at || null, vehicle_type: rate?.vehicle_type || '',
      stay_type: rate ? formatStay(rate) : '', billing_total: closed ? Number(closed.total_value) : null };
  });
}
module.exports = { formatStay, mapRate, calculateBilling, loadVehicles };
