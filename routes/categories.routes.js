import express from "express";
import { createCategory, deleteCategory } from "../controllers/categories.controllers.js"
import { validateToken } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/", validateToken, createCategory)
router.delete("/:id", validateToken, deleteCategory)

export default router
