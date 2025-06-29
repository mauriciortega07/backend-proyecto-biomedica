const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mySql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 4000;

//app.use(cors(corsOptions));
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/*const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};*/

/*app.options("*", cors({
  origin: 'http://localhost:3000',
  credentials: true
}));*/

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Si es preflight (CORS preflight OPTIONS), respondemos directamente
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


app.use(bodyParser.json());

/*const pool = mySql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "biomedica_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});*/

const pool = mySql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware para loguear la petición
app.use((req, res, next) => {
  console.log(">>> Origin:", req.headers.origin);
  console.log(">>> Method:", req.method);
  console.log(">>> Headers:", req.headers);
  next();
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando");
});

// Obtener todos los equipos biomédicos
app.get("/equipos_biomedicos", async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM equipos_biomedicos');
    res.json(results);
  } catch (err) {
    console.error("Error al obtener equipos:", err);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
});

// Insertar nuevo equipo biomédico
app.post('/equipos_biomedicos', async (req, res) => {
  const {
    nombre,
    descripcion,
    tipoDispositivo,
    nivelRiesgo,
    nomAplicada,
    caracteristicas,
    mantCorrectivo,
    mantPreventivo,
    img,
    usuario_id
  } = req.body;

  const sql = `
    INSERT INTO equipos_biomedicos
    (nombre, descripcion, tipoDispositivo, nivelRiesgo, nomAplicada, caracteristicas, mantPreventivo, mantCorrectivo, img, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const values = [
    nombre,
    descripcion,
    tipoDispositivo,
    nivelRiesgo,
    nomAplicada,
    JSON.stringify(caracteristicas),
    JSON.stringify(mantPreventivo),
    JSON.stringify(mantCorrectivo),
    img,
    usuario_id
  ];

  try {
    const [insertResult] = await pool.query(sql, values);
    const [rows] = await pool.query("SELECT * FROM equipos_biomedicos WHERE id = ?", [insertResult.insertId]);

    const equipo = rows[0];
    equipo.caracteristicas = JSON.parse(equipo.caracteristicas || '[]');
    equipo.mantPreventivo = JSON.parse(equipo.mantPreventivo || '[]');
    equipo.mantCorrectivo = JSON.parse(equipo.mantCorrectivo || '[]');
    res.status(201).json({ message: "Equipo guardado exitosamente", equipo: rows[0] });
  } catch (error) {
    console.error("Error al insertar equipo ", error);
    return res.status(500).json({ error: error.message });
  }
});

// Editar equipo biomédico por id
app.put('/equipos_biomedicos/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    descripcion,
    tipoDispositivo,
    nivelRiesgo,
    nomAplicada,
    caracteristicas,
    mantPreventivo,
    mantCorrectivo,
    img,
    usuario_id
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID del equipo es requerido" });
  }

  try {
    const sqlUpdate = `
      UPDATE equipos_biomedicos
      SET nombre = ?, descripcion = ?, tipoDispositivo = ?, nivelRiesgo = ?, nomAplicada = ?, caracteristicas = ?, mantCorrectivo = ?, mantPreventivo = ?, img = ?, usuario_id = ?
      WHERE id = ?;
    `;

    const values = [
      nombre,
      descripcion,
      tipoDispositivo,
      nivelRiesgo,
      nomAplicada,
      JSON.stringify(caracteristicas),
      JSON.stringify(mantPreventivo),
      JSON.stringify(mantCorrectivo),
      img,
      usuario_id,
      id
    ];

    console.log("Valores recibidos para actualizar:", values);

    const [result] = await pool.query(sqlUpdate, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    const [rows] = await pool.query("SELECT * FROM equipos_biomedicos WHERE id = ?", [id]);
    const equipo = rows[0];
    equipo.caracteristicas = JSON.parse(equipo.caracteristicas || '[]');
    equipo.mantPreventivo = JSON.parse(equipo.mantPreventivo || '[]');
    equipo.mantCorrectivo = JSON.parse(equipo.mantCorrectivo || '[]');
    res.json({ message: "Equipo actualizado exitosamente", equipo: rows[0] });
  } catch (error) {
    console.error("Error al actualizar el equipo:", error);
    res.status(500).json({ error: "Error al actualizar el equipo" });
  }
});

// Eliminar equipo biomédico
app.delete("/equipos_biomedicos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM equipos_biomedicos WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar el equipo: ", error);
    res.status(500).json({ error: 'Error al eliminar el equipo' });
  }
});

// Registro de usuario
app.post('/register', async (req, res) => {
  const { name, idempleado, rolempleado, password } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM usuarios WHERE idempleado = ?', [idempleado]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const [result] = await pool.query(
      'INSERT INTO usuarios (name, idempleado, rolempleado, password) VALUES (?, ?, ?, ?)',
      [name, idempleado, rolempleado, password]
    );

    res.status(201).json({
      message: "Registro exitoso",
      user: { id: result.insertId, name, idempleado, rolempleado }
    });
  } catch (error) {
    console.error("Error al registrar usuario: ", error);
    res.status(500).json({ error: "Error al registrar el usuario" });
  }
});

// Login de usuario
app.post('/login', async (req, res) => {
  const { idempleado, password } = req.body;

  try {
    const [results] = await pool.query(
      'SELECT * FROM usuarios WHERE idempleado = ? AND password = ?',
      [idempleado, password]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const user = results[0];
    res.status(200).json({
      message: "Login exitoso",
      user: {
        id: user.id,
        name: user.name,
        idempleado: user.idempleado,
        rolempleado: user.rolempleado
      }
    });
  } catch (error) {
    console.log("Error al verificar el login:", error);
    res.status(500).json({ error: "Error al verificar el login" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en localhost:${PORT}`);
});



