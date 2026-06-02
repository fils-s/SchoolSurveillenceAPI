import express from "express";
import 'dotenv/config';

import { Incident, Category, IncidentStatus, Treatment, Comment, IncidentPhoto, User, IncCategories } from './models/db.config.js';

const app = express();

const PORT = process.env.PORT;
const HOST = process.env.HOST;

app.use(express.json());


// routes
import usersRoutes from "./routes/users.routes.js"
app.use("/users", usersRoutes)

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});