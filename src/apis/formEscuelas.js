import db from "../db/conexion.js";
import transporter from '../nodemailerConfig.js'; // Importamos Nodemailer

// Función para agregar una reserva y enviar correo
export async function PostTurno(request, response) {
    const data = request.body;
    console.log(data);

    const campos = "cue, nombre_escuela, localidad_escuela, nombre_director, grado_escuela, turno, cantidad_alumnos, telefono, email, fecha, horario, estado";

    // Inserción en la base de datos
    await db.execute(
        "INSERT INTO escuelas (" + campos + ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [
            data.cue, data.nombreEscuela, data.localidadEscuela, data.nombreDirector, 
            data.grado, data.turno, data.cantAlumnos, data.telefono, data.email, 
            data.fechaVisita, data.horario, data.estado
        ]
    );

    // Llamada para enviar correo de confirmación
    await enviarCorreoConfirmacion(data.email, data.nombreEscuela, data.fechaVisita, data.horario);

}

// Función para enviar un correo de confirmación de reserva
async function enviarCorreoConfirmacion(email, nombreEscuela, fechaVisita, horario) {
    const mailOptions = {
        from: 'rodrigo.gomez.pinatti@gmail.com', // Cambia por tu correo
        to: email,
        subject: 'Confirmación de Reserva',
        text: `¡Hola profe!
¡Qué alegría saber que están interesados en visitar el Centro de Innovación Educ.ar Lab Chaco! Nos encanta que nos elijan para vivir esta experiencia junto a sus estudiantes.
Este mensaje es para confirmar que su turno ha sido asignado con éxito. ¡Ya estamos esperándolos en la fecha y el día acordados!
Por favor, recuerden que, si necesitan cancelar o reprogramar la visita, pueden contactarnos a través de:
Correo: educarlab@elechaco.edu.ar
Celular: 3625175481
Antes de la visita, les sugerimos revisar con sus estudiantes las pautas y la autorización de uso de imagen ¡Son documentos sumamente importantes!
¡Nos vemos pronto! 
Equipo Educ.ar Lab Chaco
`
    };

    await transporter.sendMail(mailOptions);
    console.log('Correo de confirmación enviado a:', email);
}


async function GetEscuela() {
    const [row] = await db.execute("SELECT * FROM escuelas");
    return row
}

async function GetHorarios() {
    const horarios = [
        { id: 'Mañana 1', descr: 'Mañana 1' },
        { id: 'Mañana 2', descr: 'Mañana 2' },
        { id: 'Tarde 1', descr: 'Tarde 1' },
        { id: 'Tarde 2', descr: 'Tarde 2' },
    ];
    return horarios;
}



export async function getHorariosOcupados(fechaVisita){
    try{
        const [rows] = await db.execute("SELECT horario FROM escuelas WHERE fecha = ? AND (estado != 'CANCELADO' OR estado IS NULL)", [fechaVisita]);
        return rows.map(row => row.horario)
    }
    catch(error){
        console.error('error al cargar los horarios ocupados en la fecha: ', error);
        throw new Error('Error al cargar los horarios ocupados')
    }
}

export async function getFechasOcupadas() {
    try {
        const [rows] = await db.execute("SELECT fecha FROM escuelas WHERE (estado != 'CANCELADO' OR estado IS NULL) GROUP BY fecha HAVING COUNT(DISTINCT horario) >= 4")
        return rows.map(row => row.fecha)
    } catch(error) {
        console.error('Error al cargar las fechas sin horarios: ', error);
        throw new Error('Error al cargar las fechas sin horarios');
    }
}

export async function getCue() {
    try {
        const [rows] = await db.execute("SELECT * FROM bdcue");
        return rows;
    } catch (error) {
        console.error('Error fetching CUE data:', error);
        throw new Error('Error fetching CUE data');
    }
}



 export const Escuela = await GetEscuela()
 export const Horarios = await GetHorarios()
 export const Cue = await getCue()
