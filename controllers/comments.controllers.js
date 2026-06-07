import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Incident, User, Comment } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError, unauthorizedError} from "../utils/error.utils.js";

export const createComment = async(req, res, next)=>{
    try{
        const { id: incidentId } = req.params
        
        const { commentDesc } = req.body
        const incident = await Incident.findByPk(incidentId)

        // validate if id is a number
        if(isNaN(parseInt(incidentId))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        // validate if the incident exists
        if (!incident) {
            return next(notFoundError("Incident", incidentId))
        }

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        if(!commentDesc){
            return next(missingFieldsValidationError())
        }

        // validate if the formats are correct
        if(typeof commentDesc != "string"){
            return next(validationError([{ path: "commentDesc", message: "Comment content must be a string." }]))
        }

        const newComment = await Comment.create({
            commentDesc,
            userId: req.user.id,
            incidentId: incident.id
        })

        res.status(201).json(newComment)

    } catch(error){
        next(genericError("Something went wrong. Please try again later"));
    }
}