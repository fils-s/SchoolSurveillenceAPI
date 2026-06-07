import express from "express";
import { createTreatment, patchTreatmentById } from "../controllers/treatments.controllers.js"
import { validateToken, parseToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/:incidentId/treatment", validateToken, createTreatment)
router.patch("/:incidentId/treatment", validateToken, patchTreatmentById)

export default router
