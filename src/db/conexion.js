import mysql from 'mysql2/promise';

// Crear una conexión a la base de datos usando las variables de entorno
let DB = null;

try {
  DB = await mysql.createConnection({
    host: process.env.DB_HOST,          // Usamos la variable de entorno DB_HOST
    user: process.env.DB_USER,          // Usamos la variable de entorno DB_USER
    password: process.env.DB_PASSWORD,  // Usamos la variable de entorno DB_PASSWORD
    database: process.env.DB_NAME,      // Usamos la variable de entorno DB_NAME
  });
  console.log("Conectado a la base de datos");
} catch (err) {
  console.error("Error al conectar a la base de datos:", err);
}

export default DB;