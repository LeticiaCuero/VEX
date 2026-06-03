const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data: vehicles, error: vehiclesError } = await supabaseAdmin
    .from('vehicles')
    .select('id, vehicle_type, stay_type, entry_at, exit_at');

  if (vehiclesError) throw vehiclesError;

  const { data: rates, error: ratesError } = await supabaseAdmin
    .from('rates')
    .select('vehicle_type, stay_type, value');

  if (ratesError) throw ratesError;

  const ratesByKey = new Map(
    rates.map((rate) => [`${rate.vehicle_type}::${rate.stay_type}`, Number(rate.value)])
  );

  const todayEntries = vehicles.filter((vehicle) => new Date(vehicle.entry_at) >= since);
  const todayExits = vehicles.filter((vehicle) => vehicle.exit_at && new Date(vehicle.exit_at) >= since);
  const activeVehicles = vehicles.filter((vehicle) => !vehicle.exit_at);
  const revenueToday = todayExits.reduce((total, vehicle) => {
    return total + (ratesByKey.get(`${vehicle.vehicle_type}::${vehicle.stay_type}`) || 0);
  }, 0);

  const activeByType = activeVehicles.reduce((acc, vehicle) => {
    acc[vehicle.vehicle_type] = (acc[vehicle.vehicle_type] || 0) + 1;
    return acc;
  }, {});

  return res.json({
    activeVehicles: activeVehicles.length,
    entriesToday: todayEntries.length,
    exitsToday: todayExits.length,
    revenueToday,
    activeByType
  });
}));

module.exports = router;
