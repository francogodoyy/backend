import express from 'express';
const router = express.Router();
const pool = require('./db');  // Asegúrate de que apunte al archivo de conexión
const { verifyAdmin } = require('../Routes/Users/verifyAdmin');  // Middleware para verificar si el usuario es admin

// Obtener todos los comentarios
router.get('/comentarios', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM comentarios');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los comentarios' });
    }
});

// Crear un nuevo comentario (Solo admins)
// Comentar temporalmente la verificación de admin para probar
router.post('/comentarios', async (req, res) => {
    const { name, description } = req.body;
    if (!name || !description) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    try {
        const [result] = await pool.query('INSERT INTO comentarios (name, description) VALUES (?, ?)', [name, description]);
        res.json({ id: result.insertId, name, description });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el comentario' });
    }
});

// Eliminar un comentario (Solo admins)
router.delete('/comentarios/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM comentarios WHERE id = ?', [id]);
        res.json({ message: 'Comentario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el comentario' });
    }
});

module.exports = router;

