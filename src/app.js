require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const contactsRoutes = require('./routes/contacts.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const plansRoutes = require('./routes/plans.routes');
const ratesRoutes = require('./routes/rates.routes');
const subscriptionsRoutes = require('./routes/subscriptions.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const { requireAuth } = require('./middleware/auth');

const app = express();
const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';

app.use(helmet());
app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/rates', requireAuth, ratesRoutes);
app.use('/api/subscriptions', requireAuth, subscriptionsRoutes);
app.use('/api/vehicles', requireAuth, vehiclesRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.use('/view', express.static(path.join(__dirname, '..', 'view')));
app.use('/script', express.static(path.join(__dirname, '..', 'script')));
app.use('/style', express.static(path.join(__dirname, '..', 'style')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));

app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Rota nao encontrada.' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

module.exports = app;
