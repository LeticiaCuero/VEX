const express = require('express');
const { supabaseAuth } = require('../config/supabase');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Informe usuario e senha.' });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: username,
    password
  });

  if (error || !data.session) {
    return res.status(401).json({ message: 'Usuario ou senha invalidos.' });
  }

  return res.json({
    user: {
      id: data.user.id,
      email: data.user.email
    },
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
    }
  });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim();

  if (!email) {
    return res.status(400).json({ message: 'Informe o e-mail da conta.' });
  }

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email);

  if (error) {
    return res.status(400).json({ message: 'Nao foi possivel enviar o e-mail de recuperacao.' });
  }

  return res.json({ message: 'E-mail de recuperacao enviado.' });
}));

module.exports = router;
