import express from "express";
import { register, login, patchUserById, patchMe } from "../controllers/users.controllers.js"
import { validateToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/", register)
router.post("/login", login)
router.patch("/me", validateToken, patchMe)
router.patch("/:id", validateToken, patchUserById)

export default router
