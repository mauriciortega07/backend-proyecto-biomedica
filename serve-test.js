const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 4000;

// Configuración CORS mínima para permitir localhost:3000
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ mensaje: '¡CORS funciona correctamente!' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
