const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mySql = require('mysql2/promise');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 4000;


//app.use(cors(corsOptions));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(bodyParser.json());

const pool = mySql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ===============================
// Helpers Mantenimientos
// ===============================
const TIPOS_VALIDOS = new Set(["PREVENTIVO", "CORRECTIVO", "PREDICTIVO"]);
const ESTADOS_VALIDOS = new Set(["PROGRAMADO", "FINALIZADO"]);

const isoToMysqlDatetime = (iso) => {
  if (!iso || typeof iso !== "string") return null;
  // "2026-02-16T06:04:00" => "2026-02-16 06:04:00"
  const s = iso.replace("T", " ").slice(0, 19);
  return s.length === 19 ? s : null;
};


// Middleware para loguear la petición
app.use((req, res, next) => {
  console.log(">>> Origin:", req.headers.origin);
  console.log(">>> Method:", req.method);
  console.log(">>> Headers:", req.headers);
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en 0.0.0.0:${PORT}`);
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
    activoEnInventario,
    ubicacion,
    numInventario,
    numSerieEquipo,
    nivelRiesgo,
    nomAplicada,
    caracteristicas,
    mantCorrectivo,
    mantPreventivo,
    img,
    usuario_id,
    agregadoPor,
    fechaAgregado
  } = req.body;

  console.log("usuario_id recibido:", usuario_id);

  const sql = `
    INSERT INTO equipos_biomedicos
    (nombre, descripcion, tipoDispositivo, activoEnInventario, ubicacion, numInventario, numSerieEquipo, nivelRiesgo, nomAplicada, caracteristicas, mantPreventivo, mantCorrectivo, img, usuario_id, agregadoPor, fechaAgregado)
    VALUES (?, ?, ?, ?, ? , ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const values = [
    nombre,
    descripcion,
    tipoDispositivo,
    activoEnInventario,
    ubicacion,
    numInventario,
    numSerieEquipo,
    nivelRiesgo,
    nomAplicada,
    JSON.stringify(caracteristicas),
    JSON.stringify(mantPreventivo),
    JSON.stringify(mantCorrectivo),
    img,
    usuario_id,
    agregadoPor,
    fechaAgregado
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
    activoEnInventario,
    ubicacion,
    numInventario,
    numSerieEquipo,
    nivelRiesgo,
    nomAplicada,
    caracteristicas,
    mantPreventivo,
    mantCorrectivo,
    img,
    usuario_id,
    editadoPor,
    fechaModificacion
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID del equipo es requerido" });
  }

  try {
    const sqlUpdate = `
      UPDATE equipos_biomedicos
      SET nombre = ?, descripcion = ?, tipoDispositivo = ?, activoEnInventario = ?, ubicacion = ?, numInventario = ?, numSerieEquipo = ?, nivelRiesgo = ?, nomAplicada = ?, caracteristicas = ?, mantCorrectivo = ?, mantPreventivo = ?, img = ?, usuario_id = ?, editadoPor = ?, fechaModificacion = ?
      WHERE id = ?;
    `;

    const values = [
      nombre,
      descripcion,
      tipoDispositivo,
      activoEnInventario,
      ubicacion,
      numInventario,
      numSerieEquipo,
      nivelRiesgo,
      nomAplicada,
      JSON.stringify(caracteristicas),
      JSON.stringify(mantPreventivo),
      JSON.stringify(mantCorrectivo),
      img,
      usuario_id,
      editadoPor,
      fechaModificacion,
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


//obtiene mantenimeintos por equipo
app.get("/equipos_biomedicos/:equipoId/mantenimientos", async (req, res) => {
  try {
    const equipoId = Number(req.params.equipoId);
    if (!equipoId) return res.status(400).json({ error: "equipoId inválido" });

    const [rows] = await pool.query(
      `SELECT 
        id, equipo_id, client_uid, tipo, estado,
        fecha_programada, descripcion, realizado_por, usuario_id,
        fecha_finalizado, created_at, updated_at
       FROM mantenimientos_equipo
       WHERE equipo_id = ?
       ORDER BY created_at DESC`,
      [equipoId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener mantenimientos:", err);
    res.status(500).json({ error: "Error al obtener mantenimientos" });
  }
});


//Crear mantenimientos para un equipo
app.post("/equipos_biomedicos/:equipoId/mantenimientos", async (req, res) => {
  try {
    const equipoId = Number(req.params.equipoId);
    const items = req.body?.items;

    if (!equipoId) return res.status(400).json({ error: "equipoId inválido" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Body.items debe ser un arreglo con al menos 1 elemento" });
    }

    // Validación + armado de filas
    const rows = [];
    for (const it of items) {
      const tipo = (it?.tipo || "").toString().trim();
      const estado = (it?.estado || "PROGRAMADO").toString().trim();
      const fechaMysql = isoToMysqlDatetime(it?.fechaProgramada);
      const descripcion = (it?.descripcion || "").toString().trim();
      const realizadoPor = (it?.realizadoPor || "").toString().trim() || "Anonimo";
      const usuario_id = it?.usuario_id ?? null;

      // client_uid: usa el id string del front si te lo manda
      const client_uid = it?.client_uid ?? it?.id ?? null;

      if (!TIPOS_VALIDOS.has(tipo)) {
        return res.status(400).json({ error: `tipo inválido: ${tipo}` });
      }
      if (!ESTADOS_VALIDOS.has(estado)) {
        return res.status(400).json({ error: `estado inválido: ${estado}` });
      }
      if (!fechaMysql) {
        return res.status(400).json({ error: "fechaProgramada inválida (usa YYYY-MM-DDTHH:mm:ss)" });
      }
      if (!descripcion) {
        return res.status(400).json({ error: "descripcion requerida" });
      }

      rows.push([
        equipoId,
        client_uid,
        tipo,
        estado,
        fechaMysql,
        descripcion,
        realizadoPor,
        usuario_id,
      ]);
    }

    const placeholders = rows.map(() => "(?,?,?,?,?,?,?,?)").join(", ");
    const sql = `
      INSERT INTO mantenimientos_equipo
      (equipo_id, client_uid, tipo, estado, fecha_programada, descripcion, realizado_por, usuario_id)
      VALUES ${placeholders};
    `;

    const params = rows.flat();
    const [result] = await pool.query(sql, params);

    res.status(201).json({
      message: "Mantenimientos guardados",
      insertedCount: result.affectedRows,
      firstInsertId: result.insertId
    });
  } catch (err) {
    console.error("Error al insertar mantenimientos:", err);

    // duplicado por uq_client_uid
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Duplicado: client_uid ya existe (reintento del front)" });
    }

    res.status(500).json({ error: "Error al insertar mantenimientos" });
  }
});


//Editar mantenimiento solo si esta programado
app.patch("/mantenimientos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const fechaMysql = isoToMysqlDatetime(req.body?.fechaProgramada);
    const descripcion = (req.body?.descripcion || "").toString().trim();
    const realizadoPor = (req.body?.realizadoPor || "").toString().trim() || null;
    const usuario_id = req.body?.usuario_id ?? null;

    if (!fechaMysql) return res.status(400).json({ error: "fechaProgramada inválida" });
    if (!descripcion) return res.status(400).json({ error: "descripcion requerida" });

    const [result] = await pool.query(
      `UPDATE mantenimientos_equipo
       SET fecha_programada = ?, descripcion = ?, realizado_por = COALESCE(?, realizado_por), usuario_id = ?
       WHERE id = ? AND estado = 'PROGRAMADO'`,
      [fechaMysql, descripcion, realizadoPor, usuario_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "No se pudo editar (no existe o ya está FINALIZADO)" });
    }

    res.json({ message: "Mantenimiento actualizado" });
  } catch (err) {
    console.error("Error al editar mantenimiento:", err);
    res.status(500).json({ error: "Error al editar mantenimiento" });
  }
});


//finalizar mantenimeinto solo programado
app.patch("/mantenimientos/:id/finalizar", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const [result] = await pool.query(
      `UPDATE mantenimientos_equipo
       SET estado = 'FINALIZADO', fecha_finalizado = NOW()
       WHERE id = ? AND estado = 'PROGRAMADO'`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: "No se pudo finalizar (no existe o ya está FINALIZADO)" });
    }

    res.json({ message: "Mantenimiento finalizado" });
  } catch (err) {
    console.error("Error al finalizar mantenimiento:", err);
    res.status(500).json({ error: "Error al finalizar mantenimiento" });
  }
});


//finalizar todos los programados de un equipo
app.patch("/equipos_biomedicos/:equipoId/mantenimientos/finalizar_todos", async (req, res) => {
  try {
    const equipoId = Number(req.params.equipoId);
    if (!equipoId) return res.status(400).json({ error: "equipoId inválido" });

    const [result] = await pool.query(
      `UPDATE mantenimientos_equipo
       SET estado = 'FINALIZADO', fecha_finalizado = NOW()
       WHERE equipo_id = ? AND estado = 'PROGRAMADO'`,
      [equipoId]
    );

    res.json({ message: "OK", afectados: result.affectedRows });
  } catch (err) {
    console.error("Error al finalizar todos:", err);
    res.status(500).json({ error: "Error al finalizar todos" });
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

/*app.listen(PORT, () => {
  console.log(`Servidor corriendo en localhost:${PORT}`);
}); */



