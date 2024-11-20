import db from "../db/conexion.js";
import transporter from '../nodemailerConfig.js'; // Importamos Nodemailer

export async function CheckCapacidadTallerComunidad(tallerId) {
    try {
        const CAPACIDAD_TOTAL = 50; // Define this as a constant at the top

        // Count active inscriptions (not CANCELADO) for this taller
        const [rows] = await db.execute(
            `SELECT COUNT(*) as count 
             FROM inscripciones_comunidad 
             WHERE taller_id = ? 
             AND (estado != 'CANCELADO' OR estado IS NULL)`,
            [tallerId]
        );
        
        const turnoActual = rows[0].count;
        const turnosDisponibles = CAPACIDAD_TOTAL - turnoActual;

        console.log(`Taller ${tallerId} es el turno numero ${turnoActual}`);

        return {
            capacidadTotal: CAPACIDAD_TOTAL,
            turnoActual: turnoActual,
            turnosDisponibles: turnosDisponibles
        };
    } catch (error) {
        console.error('Error checking taller capacity:', error);
        throw new Error('Error checking taller capacity');
    }
}

export async function PostTurnoComunidad(request) {
    const data = request.body;
    console.log(data)

    const campos = "nombre_alumno, edad, fecha_nacimiento, nombre_tutor, telefono_tutor, email, taller_titulo, taller_fecha,taller_id, estado";

    await db.execute(
        "INSERT INTO inscripciones_comunidad ("+campos+") VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?)", 
        [data.nombreApellido, data.edad, data.fechaNacimiento, data.nombreApellidoTutor, data.telefono, data.email, data.tallerTitulo, data.tallerFecha,data.tallerId, data.estado]
    );

    await enviarCorreoConfirmacion(data.email, data.nombreApellidoTutor, data.tallerFecha, data.tallerTitulo);
        
}

// Función para enviar un correo de confirmación de reserva
async function enviarCorreoConfirmacion(email, nombreApellidoTutor, tallerFecha, tallerTitulo) {
    const mailOptions = {
        from: 'rodrigo.gomez.pinatti@gmail.com', // Cambia por tu correo
        to: email,
        subject: 'Confirmación de Reserva',
        text: `¡Hola ${nombreApellidoTutor}!
¡Qué alegría saber que está interesado en visitar el Centro de Innovación Educ.ar Lab Chaco! Nos encanta que nos elija para vivir esta experiencia.
Este mensaje es para confirmar que su turno ha sido asignado con éxito. ¡Ya estamos esperándolo en la fecha y el día acordados!
Por favor, recuerden que, si necesitan cancelar o reprogramar la visita, pueden contactarnos a través de:
Correo: educarlab@elechaco.edu.ar
Celular: 3625175481

¡Nos vemos pronto! 
Equipo Educ.ar Lab Chaco
`
    };

    await transporter.sendMail(mailOptions);
    console.log('Correo de confirmación enviado a:', email);
}

export async function getComunidadData() {
    try {
        const [rows] = await db.execute("SELECT * FROM talleres_comunidad");
        if (rows.length > 0) {
            return rows;
        } else {
            throw new Error('No se encontraron talleres comunidad');
        }
    } catch (error) {
        console.error('Error fetching comunidad data:', error);
        throw new Error('Error fetching comunidad data');
    }
}