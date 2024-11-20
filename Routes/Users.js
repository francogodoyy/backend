// Importaciones necesarias
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer'; // Nodemailer para envío de correos
import database from '../src/db/conexion.js';

const users = express.Router();
users.use(cors());

// Configuración de variables sensibles
const secretKey = process.env.SECRET_KEY;
const emailUser = process.env.EMAIL_USER; // Usuario del correo
const emailPass = process.env.EMAIL_PASS; // Contraseña o clave de app

// Validación de configuraciones para producción
if (!secretKey || !emailUser || !emailPass) {
    console.error("Faltan configuraciones necesarias: SECRET_KEY, EMAIL_USER, EMAIL_PASS.");
    process.exit(1);
}

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Cambiar según tu proveedor de correo
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

// Registrar un nuevo administrador
users.post('/createAdmin', async (req, res) => {
    const today = new Date();
    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const userData = { email, password: hashedPassword, created: today, role: 'admin' };
        const connection = await database;
        await connection.query('INSERT INTO users SET ?', userData);

        res.status(201).json({ success: true, message: "Administrador registrado correctamente." });
    } catch (err) {
        console.error("Error al registrar administrador:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
});

// Inicio de sesión
users.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await database;
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: "El email no existe." });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, secretKey, { expiresIn: '2h' });

        res.status(200).json({ success: true, token });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
});

// Enviar correo de restablecimiento de contraseña
users.post('/sendResetPasswordEmail', async (req, res) => {
    const { email } = req.body;

    try {
        const connection = await database;
        const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(200).json({ success: true, message: "Si el correo existe, se enviará un enlace de restablecimiento." });
        }

        const user = rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '15m' });

        const resetLink = `https://mi-sitio.com/resetPassword?token=${token}`;
        const mailOptions = {
            from: `No Reply <${emailUser}>`,
            to: email,
            subject: 'Restablecimiento de contraseña',
            text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`,
            html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${resetLink}">${resetLink}</a>`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: "Correo de restablecimiento enviado si el correo existe." });
    } catch (err) {
        console.error("Error al enviar correo:", err);
        res.status(500).json({ success: false, message: "Error al enviar el correo." });
    }
});

// Restablecer contraseña
users.post('/resetPassword', async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, secretKey);
        const hashedPassword = await bcrypt.hash(password, 12);

        const connection = await database;
        await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.id]);

        res.status(200).json({ success: true, message: "Contraseña restablecida correctamente." });
    } catch (err) {
        console.error("Error al restablecer contraseña:", err);

        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(403).json({ success: false, message: "Token inválido o expirado." });
        }

        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
});

// Exportar router
export default users;
