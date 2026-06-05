import express from "express";
import { createIncident, getIncidents, getIncidentById } from "../controllers/incidents.controllers.js"
import { validateToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/", validateToken, createIncident)
router.get("/:id", getIncidentById)
router.get("/", getIncidents)

export default router
