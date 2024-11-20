// Importación de módulos necesarios
// Carga las variables de entorno desde el archivo .env
import 'dotenv/config';

import transporter from './nodemailerConfig.js';


import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url'; //
import moment from 'moment'; // Para formato de fechas 
import passport from './apis/passportConfig.js';
import { Escuela, Horarios, PostTurno, getHorariosOcupados, getFechasOcupadas, getCue } from './apis/formEscuelas.js';
import { PostTurnoComunidad, getComunidadData,CheckCapacidadTallerComunidad } from './apis/formComunidad.js';
import { PostTurnoDocente, getDocenteData,CheckCapacidadTallerDocente } from './apis/formDocente.js';
import users from '../Routes/Users.js';
import DB from './db/conexion.js';


// Configuración de la aplicación Express
const app = express()
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de la aplicación Express
app.use(express.json());
app.use(express.urlencoded({extended: true, }));
app.use(cors())
//Inicializamos passport para progeter las rutas de administradores
app.use(passport.initialize());



app.use(express.static(path.join(__dirname, '..', 'views')));


app.use(express.static(path.join(__dirname, 'dist')));


// Ruta raíz
app.get('/', (req, res) => {
    res.json({ message: "ok" });
})

// Ruta para obtener datos de escuela
app.get('/get', (req, res) => {
    res.json(Escuela);
})  

// Ruta para obtener horarios
app.get('/get_horarios', (req, res) => {
  res.json(Horarios);
})

//Parte de Franco Godoy - Login y Comentarios
//Router de usuarios
app.use('/users', users);

// Ruta para la página principal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'EducarLab.html'));
});

// Ruta para obtener todos los comentarios
app.get('/comentarios', async (req, res) => {
  try {
    const [rows] = await DB.query('SELECT * FROM comentarios ORDER BY created_at DESC LIMIT 5');
    res.status(200).json(rows); // Respondemos con los comentarios obtenidos
  } catch (err) {
    console.error('Error al obtener comentarios:', err);
    res.status(500).json({ message: 'Error al obtener los comentarios.' });
  }
});

// Ruta para agregar comentarios
app.post('/comentarios', async (req, res) => {
  const { name, description } = req.body;
  const token = req.headers['authorization'];

  // Verificar el token
  if (!token) {
    return res.status(401).json({ message: 'No autorizado, por favor inicie sesión.' });
  }

  try {
    // Inserción del comentario en la base de datos
    await DB.query('INSERT INTO comentarios (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ message: 'Comentario agregado exitosamente.' });
  } catch (err) {
    console.error('Error al agregar comentario:', err);
    res.status(500).json({ message: 'Error al agregar el comentario.' });
  }
});


// Ruta para eliminar un comentario por ID
app.delete('/comentarios/:id', async (req, res) => {
  const { id } = req.params;

  // Verificación de autenticación
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'No autorizado, por favor inicie sesión.' });
  }

  try {
    const [result] = await DB.query('DELETE FROM comentarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Comentario no encontrado.' });
    }
    res.status(200).json({ message: 'Comentario eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar comentario:', err);
    res.status(500).json({ message: 'Error al eliminar el comentario.' });
  }
});



// Página de administración de comentarios (Solo para administradores)
app.get('/adminComentarios', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'adminComentarios.html'));
});

//Servimos la página principal
app.get('/educarlab', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/public/EducarLab.html'));
});

// Ruta para la página de restablecimiento de contraseña
app.get('/resetPassword', (req, res) => {
  res.sendFile(path.join(__dirname,'..', 'views', 'resetPassword.html'));
});



// Ruta para la página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// Ruta para la página de login
app.get('/createAdmin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'register.html'));
});

app.get('/sendResetPasswordEmail', (req, res) => {
  res.sendFile(path.join(__dirname,'..', 'views', 'requestPasswordReset.html'));
});



// Ruta para insertar turno de escuela
app.post('/post', (req, res) => {
    try {
        PostTurno(req);
        res.status(200).send('Datos insertados con éxito');
      } catch (error) {
        res.status(500).send('Error al insertar datos');
      }
})

// Ruta para insertar turno de comunidad
app.post('/post/comunidad', (req, res) => {
  try {
      PostTurnoComunidad(req);
      res.status(200).send('Datos insertados con éxito');
    } catch (error) {
      res.status(500).send('Error al insertar datos');
    }
})

// Ruta para insertar turno de docente
app.post('/post/docente', (req, res) => {
  try {
      PostTurnoDocente(req);
      res.status(200).send('Datos insertados con éxito');
    } catch (error) {
      res.status(500).send('Error al insertar datos');
    }
})


// Ruta para obtener horarios ocupados
app.get('/horarios/ocupados', async (req, res) => {
  const { fechaVisita } = req.query;

  try {
      const ocupados = await getHorariosOcupados(fechaVisita);
      res.json({ ocupados });
  } catch (error) {
      console.error('Error al traer los horarios ocupados:', error);
      res.status(500).json({ error: "Error al traer los horarios ocupados" });
  }
});

app.get('/fechas-sin-horarios' , async (req, res) =>{
  try{
    const fechasOcupadas= await getFechasOcupadas();
    const fechasSinHorarios = fechasOcupadas.map(fecha => 
      new Date(fecha).toISOString().split('T')[0]
    );
    res.json({fechasSinHorarios});
  } catch(error){
    console.error('Error al traer las fechas sin horarios: ', error);
    res.status(500).json({error: "Error al traer las fechas ocupadas"});
  }
})


// Ruta para obtener datos de comunidad
app.get('/comunidad_data', async (req, res) => {
  try {
      const data = await getComunidadData();
      res.json(data);
  } catch (error) {
      console.error('Error al traer la data para los talleres comunidad :', error);
      res.status(500).json({ error: "Error al traer la data para los talleres comunidad" });
  }
});

// Ruta para obtener datos de docente
app.get('/docente_data', async (req, res) => {
  try {
      const data = await getDocenteData();
      res.json(data);
  } catch (error) {
      console.error('Error al traer la data para los talleres docentes:', error);
      res.status(500).json({ error: "Error al traer la data para los talleres docentes" });
  }
});

app.get('/api/cue', async (req, res) => {
  try {
      const cueData = await getCue();
      res.json(cueData);
  } catch (error) {
      console.error('Error al traer la data para el CUE:', error);
      res.status(500).json({ error: 'Error al traer la data para el CUE' });
  }
});

//Parte de Paniagua (Tema Carga de Talleres(Alumnos y Docentes) y Carrusel Principal )
// Habilitar CORS para todas las rutas

// Middleware para parsear datos del formulario y JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Configurar el middleware estático correctamente
app.use(express.static(path.join(__dirname, '../../frontend/public/vistasTaller')));

// Ruta para cargarTalleralumnos.html
app.get('/alumnos', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile(path.join(__dirname, '../views/cargaTalleralumnos.html'));
});

// API para obtener datos de talleres de alumnos
app.get('/api/alumnos', async (req, res) => {
  try {
    const [results] = await DB.query('SELECT * FROM talleres_comunidad');
    results.forEach(entry => {
      entry.fecha = moment(entry.fecha).format('YYYY-MM-DD');
    });
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Ruta para manejar la inserción de nuevos talleres de alumnos
app.post('/alumnos/confirmacion', async (req, res) => {
  const { titulo, descripcion, driveLink, fecha } = req.body; // Añadir `fecha` en el destructuring
  const imagen = driveLink ? convertToLh3Format(driveLink) : null;
  const sqlInsert = 'INSERT INTO talleres_comunidad (titulo, descripcion, imagen, fecha) VALUES (?, ?, ?, ?)';

  try {
    await DB.execute(sqlInsert, [titulo, descripcion, imagen, fecha]);
    console.log('Entrada de comunidad insertada en la base de datos');
    res.redirect('/alumnos?status=success');
  } catch (err) {
    console.error('Error al insertar:', err);
    res.redirect('/alumnos?status=error');
  }
});

// Ruta para eliminar un taller de alumnos
app.delete('/alumnos/delete/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM talleres_comunidad WHERE id = ?';

  try {
    await DB.execute(sql, [id]);
    console.log(`Entrada de comunidad con id ${id} eliminada de la base de datos`);
    res.json({ message: 'Entrada eliminada exitosamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para cargarTallerdocentes.html
app.get('/docentes', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile(path.join(__dirname, '../views/cargaTallerdocentes.html'));
});

// API para obtener datos de talleres de docentes
app.get('/api/docentes', async (req, res) => {
  try {
    const [results] = await DB.query('SELECT * FROM talleres_docentes');
    results.forEach(entry => {
      entry.fecha = moment(entry.fecha).format('YYYY-MM-DD');
    });
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para manejar la inserción de nuevos talleres de docentes
app.post('/docente/confirmacion', async (req, res) => {
  const { titulo, descripcion, driveLink, fecha } = req.body; // Añadir `fecha` al destructuring
  const imagen = driveLink ? convertToLh3Format(driveLink) : null;
  const sqlInsert = 'INSERT INTO talleres_docentes (titulo, descripcion, imagen, fecha) VALUES (?, ?, ?, ?)';

  try {
    await DB.execute(sqlInsert, [titulo, descripcion, imagen, fecha]);
    console.log('Entrada de docente insertada en la base de datos');
    res.redirect('/docentes?status=success');
  } catch (err) {
    console.error('Error al insertar:', err);
    res.redirect('/docentes?status=error');
  }
});


// Ruta para eliminar un taller de docentes
app.delete('/docente/delete/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM talleres_docentes WHERE id = ?';

  try {
    await DB.execute(sql, [id]);
    console.log('Entrada de docente eliminada de la base de datos');
    res.json({ message: 'Entrada eliminada exitosamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Función para convertir enlace de Google Drive a formato LH3
function convertToLh3Format(driveLink) {
  const fileId = driveLink.match(/[-\w]{25,}/);
  if (fileId && fileId[0]) {
    return `https://lh3.googleusercontent.com/d/${fileId[0]}`;
  }
  return null;
}

//FACUNDO VALLEJOS

// Ruta para mostrar el HTML de consultas de escuelas
app.get('/escuelasConsultas', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'escuelasConsultas.html'));
});

// Ruta para mostrar el HTML de consultas de la comunidad
app.get('/comunidadConsultas', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'comunidadConsultas.html'));
});

// Ruta para mostrar el HTML de consultas de docentes
app.get('/docentesConsultas', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'docentesConsultas.html'));
});
// Ruta para obtener datos de comunidad
app.get('/comunidad_data', async (req, res) => {
  try {
      const data = await getComunidadData();
      res.json(data);
  } catch (error) {
      console.error('Error fetching comunidad data:', error);
      res.status(500).json({ error: "Error fetching comunidad data" });
  }
});

// Ruta para obtener datos de docente
app.get('/docente_data', async (req, res) => {
  try {
      const data = await getDocenteData();
      res.json(data);
  } catch (error) {
      console.error('Error fetching docente data:', error);
      res.status(500).json({ error: "Error fetching docente data" });
  }
});

app.get('/escuelas', async (req, res) => {
  try {
      const [rows] = await DB.execute('SELECT * FROM escuelas'); // Consulta para obtener todas las escuelas
      console.log('Resultados de la consulta:', rows);

      if (rows.length > 0) {
          res.json(rows);
      } else {
          res.status(404).json({ message: 'No se encontraron escuelas' });
      }
  } catch (error) {
      console.error('Error al consultar la base de datos:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para obtener todas las escuelas
app.get('/cue/:id_cue', async (req, res) => {
  try {
      const [rows] = await DB.execute('SELECT * FROM bdcue'); // Consulta para obtener todas las escuelas
      console.log('Resultados de la consulta:', rows);

      if (rows.length > 0) {
          res.json(rows);
      } else {
          res.status(404).json({ message: 'No se encontraron escuelas' });
      }
  } catch (error) {
      console.error('Error al consultar la base de datos:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para cancelar el turno de escuela
app.put('/cancelar_turno/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {

    const { id } = req.params; // Extraer id
    try {
        // Actualizar el estado de la escuela a 'CANCELADO'
        const [result] = await DB.execute(
            'UPDATE escuelas SET estado = ? WHERE id = ?',
            ['CANCELADO', id]
        );
  
        if (result.affectedRows > 0) {
            // Obtener el correo electrónico de la escuela o del usuario relacionado
            const [rows] = await DB.execute(
                'SELECT email FROM escuelas WHERE id = ?',
                [id]
            );
  
            if (rows.length > 0) {
                const emailEscuela = rows[0].email;
  
                // Enviar el correo de cancelación
                const info = await transporter.sendMail({
                    from: "Educ.ar Lab",
                    to: emailEscuela,
                    subject: "Cancelación de turno",
                    text: `Le informamos que su turno ha sido cancelado con éxito.
Si tiene alguna pregunta o desea reprogramar su turno, no dude en ponerse en contacto con nosotros.
  
¡Nos vemos pronto!
Equipo Educ.ar Lab Chaco`
                });
  
                console.log('Correo de cancelación enviado exitosamente', info.messageId);
            } else {
                console.log('Correo no encontrado para la escuela');
            }
  
            res.status(200).send('Turno cancelado con éxito');
        } else {
            res.status(404).send('No se encontró la escuela');
        }
    } catch (error) {
        console.error('Error al cancelar el turno:', error);
        res.status(500).send('Error al cancelar el turno');
    }
});
  





// Ruta para cancelar el turno de docente y enviar correo de cancelación
app.put('/cancelar_inscripcion/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const { id } = req.params;
    try {
        console.log('ID recibido para cancelación:', id);

        // Actualizar el estado de la inscripción a 'CANCELADO'
        const [result] = await DB.execute('UPDATE inscripciones_docente SET estado = ? WHERE id = ?', ['CANCELADO', id]);
        console.log('Resultado de la actualización:', result);

        if (result.affectedRows > 0) {
            // Obtener el correo electrónico del docente o usuario relacionado con la inscripción
            const [rows] = await DB.execute('SELECT email, nombre_docente FROM inscripciones_docente WHERE id = ?', [id]);
            console.log('Resultado de la consulta de docente:', rows);

            if (rows.length > 0) {
                const emailDocente = rows[0].email;
                const nombreDocente = rows[0].nombre_docente;

                // Enviar el correo de cancelación
                const info = await transporter.sendMail({
                    from: "Educ.ar Lab",
                    to: emailDocente,
                    subject: "Cancelación de inscripción",
                    text: `Buenos dias ${nombreDocente}, su inscripción ha sido cancelada. 
Si tiene alguna pregunta o desea realizar alguna consulta adicional, no dude en ponerse en contacto con nosotros.
  
¡Nos vemos pronto!
Equipo Educ.ar Lab Chaco`
                });

                console.log('Correo de cancelación enviado exitosamente', info.messageId);
            } else {
                console.log('Correo no encontrado para el docente');
            }

            res.status(200).send('Inscripción cancelada con éxito');
        } else {
            res.status(404).send('No se encontró la inscripción');
        }
    } catch (error) {
        console.error('Error al cancelar la inscripción:', error.message);
        res.status(500).send('Error al cancelar la inscripción');
    }
});




// Ruta para cancelar la inscripción de un alumno de la comunidad y enviar correo de cancelación
app.put('/cancelar_inscripcion_comunidad/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Actualizar el estado de la inscripción a 'CANCELADO'
        const [result] = await DB.execute('UPDATE inscripciones_comunidad SET estado = ? WHERE id = ?', ['CANCELADO', id]);
        
        if (result.affectedRows > 0) {
            // Obtener el correo electrónico del usuario relacionado con la inscripción en la comunidad
            const [rows] = await DB.execute('SELECT email, nombre_tutor FROM inscripciones_comunidad WHERE id = ?', [id]);

            if (rows.length > 0) {
                const emailUsuario = rows[0].email;
                const nombreTutor = rows[0].nombre_tutor;

                // Enviar el correo de cancelación
                const info = await transporter.sendMail({
                    from: "Educ.ar Lab",
                    to: emailUsuario,
                    subject: "Cancelación de inscripción",
                    text: `Buenos días ${nombreTutor}, su inscripción ha sido cancelada. 
Si tiene alguna pregunta o desea realizar alguna consulta adicional, no dude en ponerse en contacto con nosotros.

¡Nos vemos pronto!
Equipo Educ.ar Lab Chaco`
                });

                console.log('Correo de cancelación enviado exitosamente', info.messageId);
            } else {
                console.log('Correo no encontrado para el usuario de la comunidad');
            }

            res.status(200).send('Inscripción cancelada con éxito');
        } else {
            res.status(404).send('No se encontró la inscripción');
        }
    } catch (error) {
        console.error('Error al cancelar la inscripción:', error.message);
        res.status(500).send('Error al cancelar la inscripción');
    }
});


//consultar inscripciones comunidad
app.get('/inscripciones_comunidad', async (req, res) => {
  try {
      const [rows] = await DB.execute('SELECT * FROM inscripciones_comunidad'); // Consulta para obtener todas las comunidades
      console.log('Resultados de la consulta:', rows);

      if (rows.length > 0) {
          res.json(rows);
      } else {
          res.status(404).json({ message: 'No se encontraron escuelas' });
      }
  } catch (error) {
      console.error('Error al consultar la base de datos:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
  }
});

//consultar inscripciones docentes
app.get('/inscripciones_docente', async (req, res) => {
  try {
      const [rows] = await DB.execute('SELECT * FROM inscripciones_docente'); // Consulta para obtener todas los docentes
      console.log('Resultados de la consulta:', rows);

      if (rows.length > 0) {
          res.json(rows);
      } else {
          res.status(404).json({ message: 'No se encontraron escuelas' });
      }
  } catch (error) {
      console.error('Error al consultar la base de datos:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para ver la capacidad de estudiantes en los talleres abiertos
app.get('/capacidad-taller-comunidad/:tallerId', async (req, res) => {
  try {
      const data= await CheckCapacidadTallerComunidad(req.params.tallerId);
      res.json(data);
  } catch (error) {
      res.status(400).json({ 
          success: false, 
          message: error.message 
      });
  }
});

app.get('/capacidad-taller-docente/:tallerId', async (req, res) => {
  try {
      const data = await CheckCapacidadTallerDocente(req.params.tallerId);
      res.json(data);
  } catch (error) {
      res.status(400).json({ 
          success: false, 
          message: error.message 
      });
  }
});




const port = process.env.PORT || 3000; // Usa el puerto proporcionado por Vercel o 3000 si estás localmente
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});