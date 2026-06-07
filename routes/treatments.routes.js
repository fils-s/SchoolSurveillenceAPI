import express from "express";
import { createTreatment, patchTreatmentById, getTreatmentbyIncident } from "../controllers/treatments.controllers.js"
import { validateToken, parseToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.get("/:incidentId/treatment", getTreatmentbyIncident)
router.post("/:incidentId/treatment", validateToken, createTreatment)
router.patch("/:incidentId/treatment", validateToken, patchTreatmentById)

export default router
