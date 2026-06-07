import express from "express";
import { register, login, patchUserById, patchMe, getAllUsers } from "../controllers/users.controllers.js"
import { validateToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.get("/", validateToken, getAllUsers)
router.post("/", register)
router.post("/login", login)
router.patch("/me", validateToken, patchMe)
router.patch("/:id", validateToken, patchUserById)

export default router
