import express from "express";
import { createComment, deleteComment, getCommentsByIncident } from "../controllers/comments.controllers.js"
import { validateToken, parseToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.get('/:incidentId/comments', parseToken, getCommentsByIncident)
router.post("/:incidentId/comments", validateToken, createComment)
router.delete("/:incidentId/comments/:commentId", validateToken, deleteComment)

export default router
