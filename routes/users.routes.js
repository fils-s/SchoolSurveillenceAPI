import express from "express";
import { register, login } from "../controllers/users.controllers.js"
import { validateToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

/* router.post("/", validateToken, register)
router.post("/login", validateToken, login) */
router.post("/", register)
router.post("/login", login)

export default router
