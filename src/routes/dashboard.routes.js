const express = require('express');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get('/', asyncHandler(async (req, res) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const chartStart = new Date(since);
  chartStart.setDate(chartStart.getDate() - 6);

  const { data: vehicles, error: vehiclesError } = await supabaseAdmin
    .from('vehicles')
    .select('id, vehicle_type, stay_type, entry_at, exit_at, billing_total');

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
    const savedTotal = Number(vehicle.billing_total);
    return total + (Number.isFinite(savedTotal) ? savedTotal : (ratesByKey.get(`${vehicle.vehicle_type}::${vehicle.stay_type}`) || 0));
  }, 0);

  const activeByType = activeVehicles.reduce((acc, vehicle) => {
    acc[vehicle.vehicle_type] = (acc[vehicle.vehicle_type] || 0) + 1;
    return acc;
  }, {});

  const vehicleTypeTotals = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.vehicle_type] = (acc[vehicle.vehicle_type] || 0) + 1;
    return acc;
  }, {});

  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(chartStart);
    date.setDate(chartStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      entries: 0,
      exits: 0,
      revenue: 0
    };
  });
  const dayMap = new Map(dayBuckets.map((day) => [day.key, day]));

  const hourlyEntries = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}h`,
    total: 0
  }));

  vehicles.forEach((vehicle) => {
    const entryDate = new Date(vehicle.entry_at);
    const entryKey = entryDate.toISOString().slice(0, 10);
    const entryDay = dayMap.get(entryKey);

    if (entryDay) {
      entryDay.entries += 1;
    }

    hourlyEntries[entryDate.getHours()].total += 1;

    if (vehicle.exit_at) {
      const exitDate = new Date(vehicle.exit_at);
      const exitKey = exitDate.toISOString().slice(0, 10);
      const exitDay = dayMap.get(exitKey);

      if (exitDay) {
        const savedTotal = Number(vehicle.billing_total);
        exitDay.exits += 1;
        exitDay.revenue += Number.isFinite(savedTotal)
          ? savedTotal
          : (ratesByKey.get(`${vehicle.vehicle_type}::${vehicle.stay_type}`) || 0);
      }
    }
  });

  const peakDay = dayBuckets.reduce((currentPeak, day) => (
    day.entries > currentPeak.entries ? day : currentPeak
  ), dayBuckets[0]);
  const peakHour = hourlyEntries.reduce((currentPeak, hour) => (
    hour.total > currentPeak.total ? hour : currentPeak
  ), hourlyEntries[0]);
  const totalRevenue = vehicles.reduce((total, vehicle) => {
    if (!vehicle.exit_at) return total;

    const savedTotal = Number(vehicle.billing_total);
    return total + (Number.isFinite(savedTotal) ? savedTotal : (ratesByKey.get(`${vehicle.vehicle_type}::${vehicle.stay_type}`) || 0));
  }, 0);

  return res.json({
    activeVehicles: activeVehicles.length,
    entriesToday: todayEntries.length,
    exitsToday: todayExits.length,
    revenueToday,
    totalRevenue,
    activeByType,
    vehicleTypeTotals,
    peakDay: {
      label: peakDay.label,
      total: peakDay.entries
    },
    peakHour: {
      label: peakHour.label,
      total: peakHour.total
    },
    dailyPerformance: dayBuckets,
    hourlyEntries
  });
}));

module.exports = router;
