const app = require('./app');

const port = Number(process.env.PORT || 3333);

app.listen(port, () => {
  console.log(`Vex API rodando em http://localhost:${port}`);
});
