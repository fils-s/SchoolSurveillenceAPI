import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Category } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError} from "../utils/error.utils.js";

export const createCategory = async(req, res, next)=>{
    try{
        const { incCategoryDesc } = req.body

        // validate if user authenticated is an admin
        if (req.user.userType !== "admin") { 
            return next(forbiddenError("You are not allowed to do this request"))
        }

        if(!incCategoryDesc){
            return next(missingFieldsValidationError())
        }

        // validate if the formats are correct
        if (typeof incCategoryDesc !== "string") {
            return next(validationError([
                { path: "incCategoryDesc", message: "Category must be a string." }
            ]))
        }

        // validate character length 
        if(incCategoryDesc.length < 3){
            return next(validationError([{ path: "incCategoryDesc", message: "Category must be at least 3 characters long" }]))
        }

        // validate if category already exists
        const existingCategory = await Category.findOne({ where: { incCategoryDesc: incCategoryDesc.toLowerCase() } })
        if(existingCategory){
            return next(conflictError(`The category ${incCategoryDesc} already exists.`));
        }

        const newCategory = await Category.create({ incCategoryDesc: incCategoryDesc.toLowerCase() });
        res.status(201).json({ 
            id: newCategory.id,
            incCategoryDesc: newCategory.incCategoryDesc,
            links: {
                add_to_incidents: { href: "/incidents", method:"POST" }
            }
        })
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}


export const deleteCategory = async(req, res, next)=>{
    try{
        const { id } = req.params

        // validate if id is a number
        if(isNaN(parseInt(id))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        // validate if user authenticated is an admin
        if (req.user.userType !== "admin") { 
            return next(forbiddenError("You are not allowed to do this request"))
        }

        // validate if the category exists
        const category = await Category.findByPk(id)
        if (!category) {
            return next(notFoundError("Category", id))
        }

        // validate if category is associated with any incident
        /* const associatedIncidents = await category.getIncidents()
        if (associatedIncidents.length > 0) {
            return next(conflictError(`Category \`${category.incCategoryDesc}\` cannot be deleted because it is associated with existing incidents.`))
        } */

        await category.destroy()
        res.status(200).json({ message: "Category deleted successfully." })
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"))
    }
}