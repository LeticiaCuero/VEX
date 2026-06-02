const { supabaseAuth } = require('../config/supabase');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticacao nao informado.' });
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: 'Sessao invalida ou expirada.' });
  }

  req.user = data.user;
  return next();
}

module.exports = {
  requireAuth
};
