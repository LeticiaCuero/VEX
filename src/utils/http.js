function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

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

function normalizePlate(value) {
  return String(value || '').trim().toUpperCase();
}

module.exports = {
  asyncHandler,
  normalizePlate,
  parseMoney
};
