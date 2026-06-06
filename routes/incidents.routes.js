import express from "express";
import { createIncident, getIncidents, getIncidentById, deleteIncident, patchIncidentById } from "../controllers/incidents.controllers.js"
import { validateToken, parseToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/", validateToken, createIncident)
router.patch("/:id", validateToken, patchIncidentById)
router.get("/", parseToken, getIncidents)
router.get("/:id", getIncidentById)
router.delete("/:id", validateToken, deleteIncident)

export default router
