const express = require('express');
const { createClient } = require('@supabase/supabase-js');
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

router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = String(req.body.refreshToken || '').trim();

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token nao informado.' });
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken
  });

  if (error || !data.session) {
    return res.status(401).json({ message: 'Sessao invalida ou expirada.' });
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

  const origin = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3333}`);
  const redirectTo = new URL('/view/reset-password.html', origin).href;
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return res.status(400).json({ message: 'Nao foi possivel enviar o e-mail de recuperacao.' });
  }

  return res.json({ message: 'Se houver uma conta com este e-mail, você receberá o link de recuperação.' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { accessToken, refreshToken, password } = req.body;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Use uma senha de 8 a 128 caracteres.' });
  }
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || !accessToken || !refreshToken) {
    return res.status(400).json({ message: 'Link inválido. Solicite uma nova recuperação.' });
  }
  // Cliente isolado por requisição: nunca altera a sessão compartilhada do servidor.
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (sessionError) return res.status(400).json({ message: 'Link inválido ou expirado. Solicite uma nova recuperação.' });
  const { error } = await client.auth.updateUser({ password });
  if (error) return res.status(400).json({ message: 'Não foi possível alterar a senha. Use uma senha diferente e tente novamente.' });
  await client.auth.signOut({ scope: 'local' });
  return res.json({ message: 'Senha alterada com sucesso. Entre com sua nova senha.' });
}));

module.exports = router;
