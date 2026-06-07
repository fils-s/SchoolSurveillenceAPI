import express from "express";
import { createComment } from "../controllers/comments.controllers.js"
import { validateToken, parseToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/:id/comments", validateToken, createComment)

export default router
