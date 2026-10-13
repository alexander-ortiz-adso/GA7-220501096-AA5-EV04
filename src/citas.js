const express = require("express");
const mongoose = require("mongoose");

const app = express();

// Permite recibir información en formato JSON
app.use(express.json());

/*
 Tecnologo en Analisis y Desarrollo de Software
 Jose Alexander Ortiz Rubio // API del proyecto. GA7-220501096-AA5-EV04
 Modulo de agendamiento de citas
 */

// ============================
// CONEXIÓN A MONGODB
// ============================

// Es la misma dirección que se usa en MongoDB Compass
mongoose.connect("mongodb://127.0.0.1:27017/agendamiento_citas")
    .then(() => console.log("Conectado a MongoDB"))
    .catch(err => console.log("Error de conexión a MongoDB:", err.message));

// ============================
// ESPECIALIDADES Y MÉDICOS
// ============================

const especialidades = [
    { especialidad: "Fisioterapia", medico: "Valentina Perez" },
    { especialidad: "Fonoaudiología", medico: "Lorena Velaco" },
    { especialidad: "Psicología Individual", medico: "Luis Figueroa" }
];

// Horas en las que se atienden las citas
const horasPermitidas = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00"
];

// ============================
// MODELO DE LA CITA
// ============================

const citaSchema = new mongoose.Schema({
    paciente: { type: String, required: true },
    documento: { type: String, required: true },
    telefono: { type: String },
    especialidad: { type: String, required: true },
    medico: { type: String, required: true },
    fecha: { type: String, required: true },
    hora: { type: String, required: true },
    motivo: { type: String }
}, {
    timestamps: false,
    versionKey: false
});

const Cita = mongoose.model("Cita", citaSchema);

// ============================
// RUTA PRINCIPAL
// ============================

app.get("/", (req, res) => {
    res.send("API de Agendamiento de citas funcionando correctamente");
});

// ==================================
// SERVICIO PARA LISTAR ESPECIALIDADES
// ==================================

app.get("/api/consulta/especialidades", (req, res) => {

    // Devolver las especialidades con su médico
    res.status(200).json(especialidades);
});

// ============================
// SERVICIO PARA AGENDAR CITA
// ============================

app.post("/api/citas/agendar", async (req, res) => {

    try {
        // Obtener los datos enviados
        const { paciente, documento, telefono, especialidad, fecha, hora, motivo } = req.body;

        // Validar que los datos sean obligatorios
        if (!paciente || !documento || !especialidad || !fecha || !hora) {
            return res.status(400).json({
                error: "¡Atención! Paciente, documento, especialidad, fecha y hora son obligatorios"
            });
        }

        // Buscar la especialidad para obtener su médico
        const datos = especialidades.find(e => e.especialidad === especialidad);

        if (!datos) {
            return res.status(404).json({
                error: "La especialidad no existe"
            });
        }

        // Validar el formato de la fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha))) {
            return res.status(400).json({
                error: "La fecha debe tener el formato AAAA-MM-DD"
            });
        }

        // Validar la hora de atención
        if (!horasPermitidas.includes(hora)) {
            return res.status(400).json({
                error: "Hora no válida. Horas permitidas: " + horasPermitidas.join(", ")
            });
        }

        // Verificar si el médico ya tiene una cita en esa fecha y hora
        const citaExiste = await Cita.findOne({
            medico: datos.medico,
            fecha: fecha,
            hora: hora
        });

        if (citaExiste) {
            return res.status(409).json({
                error: "El médico ya tiene una cita en esa fecha y hora"
            });
        }

        // Registrar la nueva cita
        const nuevaCita = await Cita.create({
            paciente,
            documento,
            telefono,
            especialidad: datos.especialidad,
            medico: datos.medico,
            fecha,
            hora,
            motivo
        });

        // Respuesta del servicio
        res.status(201).json({
            mensaje: "Cita agendada exitosamente",
            cita: nuevaCita
        });

    } catch (error) {
        res.status(500).json({
            error: "Error en el servidor: " + error.message
        });
    }
});

// ==============================
// SERVICIO PARA LISTAR CITAS
// ==============================

app.get("/api/consulta/citas", async (req, res) => {

    try {
        // Filtros opcionales: ?especialidad=...&fecha=...&documento=...
        const filtro = {};

        if (req.query.especialidad) filtro.especialidad = req.query.especialidad;
        if (req.query.fecha) filtro.fecha = req.query.fecha;
        if (req.query.documento) filtro.documento = req.query.documento;

        // Devolver la lista de citas registradas
        const citas = await Cita.find(filtro).sort({ fecha: 1, hora: 1 });

        res.status(200).json(citas);

    } catch (error) {
        res.status(500).json({
            error: "Error en el servidor: " + error.message
        });
    }
});

// =====================================
// SERVICIO PARA CONSULTAR UNA CITA POR ID
// =====================================

app.get("/api/consulta/citas/:id", async (req, res) => {

    try {
        // Validar que el id tenga formato de MongoDB
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                error: "El id de la cita no es válido"
            });
        }

        const cita = await Cita.findById(req.params.id);

        if (!cita) {
            return res.status(404).json({
                error: "La cita no existe"
            });
        }

        res.status(200).json(cita);

    } catch (error) {
        res.status(500).json({
            error: "Error en el servidor: " + error.message
        });
    }
});

// ==============================
// SERVICIO PARA REPROGRAMAR CITA
// ==============================

app.put("/api/citas/:id", async (req, res) => {

    try {
        // Validar que el id tenga formato de MongoDB
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                error: "El id de la cita no es válido"
            });
        }

        // Buscar la cita que se va a modificar
        const cita = await Cita.findById(req.params.id);

        if (!cita) {
            return res.status(404).json({
                error: "La cita no existe"
            });
        }

        // Tomar los datos nuevos o conservar los actuales
        const fecha = req.body.fecha || cita.fecha;
        const hora = req.body.hora || cita.hora;

        // Validar la hora de atención
        if (!horasPermitidas.includes(hora)) {
            return res.status(400).json({
                error: "Hora no válida. Horas permitidas: " + horasPermitidas.join(", ")
            });
        }

        // Verificar que el médico esté libre en la nueva fecha y hora
        const citaExiste = await Cita.findOne({
            _id: { $ne: cita._id },
            medico: cita.medico,
            fecha: fecha,
            hora: hora
        });

        if (citaExiste) {
            return res.status(409).json({
                error: "El médico ya tiene una cita en esa fecha y hora"
            });
        }

        // Actualizar la cita
        cita.fecha = fecha;
        cita.hora = hora;
        if (req.body.motivo !== undefined) cita.motivo = req.body.motivo;
        if (req.body.telefono !== undefined) cita.telefono = req.body.telefono;

        await cita.save();

        res.status(200).json({
            mensaje: "Cita reprogramada correctamente",
            cita: cita
        });

    } catch (error) {
        res.status(500).json({
            error: "Error en el servidor: " + error.message
        });
    }
});

// =================================
// SERVICIO PARA ELIMINAR UNA CITA
// =================================

app.delete("/api/citas/:id", async (req, res) => {

    try {
        // Validar que el id tenga formato de MongoDB
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                error: "El id de la cita no es válido"
            });
        }

        // Buscar y eliminar la cita
        const cita = await Cita.findByIdAndDelete(req.params.id);

        if (!cita) {
            return res.status(404).json({
                error: "La cita no existe"
            });
        }

        // Informar que la eliminación fue exitosa
        res.status(200).json({
            mensaje: "La cita ha sido eliminada correctamente"
        });

    } catch (error) {
        res.status(500).json({
            error: "Error en el servidor: " + error.message
        });
    }
});

// ELIMINAR TODAS LAS CITAS

app.delete("/api/citas", async (req, res) => {

    try {
        // Eliminar todas las citas
        await Cita.deleteMany({});

        res.status(200).json({
            mensaje: "Todas las citas han sido eliminadas correctamente"
        });

    } catch (error) {
        res.status(500).json({
            error: "Error en el servidor: " + error.message
        });
    }
});

// ============================
// INICIAR SERVIDOR
// ============================

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});