import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Incident, User, Treatment } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError, unauthorizedError} from "../utils/error.utils.js";

export const createTreatment = async (req, res, next)=>{
    try {
        const { incidentId } = req.params
        
        const { treatmentDesc } = req.body
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

        //validate if the user is a janitor
        if(req.user.userType !== "janitor"){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        if(!treatmentDesc){
            return next(missingFieldsValidationError())
        }

        // validate if the formats are correct
        if(typeof treatmentDesc != "string"){
            return next(validationError([{ path: "treatmentDesc", message: "Treatment content must be a string." }]))
        }

        const newTreatment = await Treatment.create({
            treatmentDesc,
            incidentId: incident.id
        })

        res.status(201).json(newTreatment)

    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}

export const 