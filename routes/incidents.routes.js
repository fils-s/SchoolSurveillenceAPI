import express from "express";
import { createIncident, getIncidents } from "../controllers/incidents.controllers.js"
import { validateToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/", validateToken, createIncident)
router.get("/", validateToken, getIncidents)

export default router
