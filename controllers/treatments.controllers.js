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

        //validate if the user is a janitor AND if they have approval to do the request
        if(req.user.userType !== "janitor" || req.user.approval!== true){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        if(!treatmentDesc){
            return next(missingFieldsValidationError())
        }

        // validate if the formats are correct
        if(typeof treatmentDesc != "string"){
            return next(validationError([{ path: "treatmentDesc", message: "Treatment content must be a string." }]))
        }

        // validate character length
        if (treatmentDesc !== undefined && treatmentDesc.length < 3) {
            return next(validationError([{ path: "title", message: "Treatment content must be more than 3 characters long" }]))
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

export const patchTreatmentById = async(req, res, next)=>{
    try {
        const { incidentId } = req.params

        if (!incidentId) {
            return next(validationError([
                { path: "id", message: "Incident ID must be provided." },
            ]))
        }

        // validate if id is a number
        if(isNaN(parseInt(incidentId))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        const { treatmentDesc } = req.body
        const incident = await Incident.findByPk(incidentId)
        const treatment = await Treatment.findOne({ where: { incidentId } })
        // validate if the incident exists
        if (!incident) {
            return next(notFoundError("Incident", incidentId))
        }

        // validate if the treatment exists for that incident
        if (!treatment) {
            return next(notFoundError("Treatment", incidentId))
        }

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        //validate if the user is a janitor AND if they have approval to do the request
        if(req.user.userType !== "janitor" || req.user.approval!== true){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        // validate if the treatment belongs to that incident
        if (treatment.incidentId.toString() !== incidentId.toString()) {
            return next(notFoundError(`Treatment for the Incident with ID ${incident.id} was not found.`))
        }

        //validate if at least one field was provided
        if (treatmentDesc === undefined) {
            return next(missingFieldsValidationError())
        }

        // validate if the format is correct
        if(typeof treatmentDesc !== 'string'){
            return next(validationError({path: 'treatmentDesc', message: "Treatment content must be a string."}))
        }

        // validate character length
        if (treatmentDesc.length < 3) {
            return next(validationError([{ path: "treatmentDesc", message: "Treatment content must be more than 3 characters long" }]))
        }

        treatment.treatmentDesc = treatmentDesc
        await treatment.save()

        res.status(200).json({
            id: treatment.id,
            incidentId: treatment.incidentId,
            treatmentDesc: treatment.treatmentDesc,
            links: {
                self: { href: `/incidents/${incident.id}/treatment`, method: "GET" }
            }
        })

    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}