import express from "express";
import 'dotenv/config';

import { Incident, Category, IncidentStatus, Treatment, Comment, IncidentPhoto, User, IncCategories } from './models/db.config.js';

const app = express();

const PORT = process.env.PORT;
const HOST = process.env.HOST;

app.use(express.json());


// routes
import usersRoutes from "./routes/users.routes.js"
import categoriesRoutes from "./routes/categories.routes.js"
import incidentRoutes from "./routes/incidents.routes.js"
import commentRoutes from "./routes/comments.routes.js"
import treatmentRoutes from "./routes/treatments.routes.js";

app.use("/categories", categoriesRoutes)
app.use("/users", usersRoutes)
app.use("/incidents", incidentRoutes, commentRoutes, treatmentRoutes)

// centralized error handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const payload = {
        message: err.message || "Internal Server Error"
    };

    if (err.errors) {
        payload.errors = err.errors;
    }

    if (err.accessToken !== undefined) {
        payload.accessToken = err.accessToken;
    }

    res.status(status).json(payload);
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});



// coisas para melhorar agora que eu nao me sinto inseguro e tenho nota no projeto (e é boa yayyyyyyy)
// - fazer a estatística de consulta do histórico de uma ocorrência
// - se for preciso, dar rework à tabela incident_status, pq eu não sei se aquilo está a guardar direito as coisas necessarias
// - se uma ocorrência for marcada como Concluída, começar um timer para apagá-la do servidor nas próximas 24 horas
// - proibir os users de atualizar ocorrências que estejam marcadas como in_resolution ou solved
// - pôr cloudinary a funcionar