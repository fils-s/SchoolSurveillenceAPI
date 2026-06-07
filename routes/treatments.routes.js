import express from "express";
import { createTreatment } from "../controllers/treatments.controllers.js"
import { validateToken, parseToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/:incidentId/treatment", validateToken, createTreatment)

export default router
