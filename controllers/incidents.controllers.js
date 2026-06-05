import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Incident, IncidentStatus, IncidentPhoto, IncCategories, User } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError} from "../utils/error.utils.js";

export const createIncident = async(req, res, next)=>{
    try{
        // body params: title, description, building, coordinates, priority, photo(s), categor(ies)
        const { title, description, building, coordinates, priority, photo, incCategoryId } = req.body

        if(!title || !building || !coordinates || !priority){
            return next(missingFieldsValidationError())
        }

        // validate if the formats are correct
        if (typeof title !== "string" 
            || typeof description !== "string" 
            || typeof building !== "string" 
            || typeof priority !== "string" 
            || typeof coordinates != "string"
            || (Array.isArray(photo) && !photo.every(p => typeof p === "string"))
            || !Array.isArray(incCategoryId) || incCategoryId.length === 0) {
            return next(validationError([ 
                { path: "title", message: "Title must be a string." },
                { path: "description", message: "Description must be a string." },
                { path: "building", message: "Building must be a string." },
                { path: "priority", message: "Status must be a string." },
                { path: "coordinates", message: "Coordinates must be a string." },
                { path: "photo", message: "Photo must be a string." },
                { path: "incCategoryId", message: "You must provide at least one category." }
            ]))
        }

        // validate character length 
        if(title.length < 3 || title.length > 50){
            return next(validationError([{ path: "title", message: "Title must be between 3 and 50 characters long" }]))
        }
        if(building.length < 2 || building.length > 100){
            return next(validationError([{ path: "building", message: "Building must be between 2 and 100 characters long" }]))
        }
        if(coordinates.length < 4 || coordinates.length > 50){
            return next(validationError([{ path: "coordinates", message: "Coordinates must be between 4 and 50 characters long" }]))
        }

        // validate priority value
        const validPriorities = ["low", "medium", "high"]
        if (!validPriorities.includes(priority.toLowerCase())) {
            return next(validationError([{ path: "priority", message: "Invalid priority value. Priority must be either low, medium, or high." }]))
        }

        // validate if photo(s) are valid JPEG, PNG OR WEBP images
        if (Array.isArray(photo)) {
            for (const p of photo) {
                if (!p.match(/^data:image\/(jpeg|jpg|png|webp);base64,/)) {
                    return next(validationError([{ path: "photo", message: "All photos must be images of one of the following formats: JPEG, PNG or WEBP." }]))
                }
            }
        } else if (photo !== undefined && !photo.match(/^data:image\/(jpeg|jpg|png|webp);base64,/)) {
            return next(validationError([{ path: "photo", message: "Photo must be an image of one of the following formats: JPEG, PNG or WEBP." }]))
        }

        const newIncident = await Incident.create({ 
            title, 
            description,
            building,
            coordinates,
            priority: priority.toLowerCase(),
            status: "in_analysis",
            userId: req.user.id
        });

        // create photo
        if(photo){
            for(const p of photo){
               await IncidentPhoto.create({
                photo: p,
                incidentId: newIncident.id
            }) 
            }
        }

        // create incident-category associations
        for (const categoryId of incCategoryId) {
            await IncCategories.create({
                incidentId: newIncident.id,
                incCategoryId: categoryId
            })
        }

        // create incident-status association        
        await IncidentStatus.create({
            incidentId: newIncident.id,
            status: "in_analysis"
        });

        res.status(201).json({
            id: newIncident.id,
            title: newIncident.title,
            registrationDate: newIncident.registrationDate,
            building: newIncident.building,
            priority: newIncident.priority,
            links: {
                self: { href: `/incidents/${newIncident.id}`, method: "GET" }
            }
        });

    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}

export const getIncidents = async(req, res, next)=>{
    try{
        // query params
        const {page, limit, sort, author, status} = req.query

        // validate query parameters
        // pagination
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 5;
        const offset = (pageNumber - 1) * limitNumber;

        // sort
        if (sort && (sort !== "registrationDate:asc" && sort !== "registrationDate:desc")) {
            return next(validationError([{ path: "sort", message: "Only 'registrationDate' sorting is allowed. Sort direction must be 'desc' (descending) or 'asc' (ascending)." }]));
        }
        const sortDirection = sort ? sort.split(':')[1].toUpperCase() : null;
        const order = sort ? [['registrationDate', sortDirection]] : [];

        let whereClause = {};
        const authorFilter = author;
        const statusFilter = status;

        if(authorFilter !== undefined && typeof authorFilter !== "string"){
            return next(validationError([{ path: "author", message: "Author must be a string." }]));
        }

        if (statusFilter !== undefined && typeof statusFilter !== "string") {
            return next(validationError([{ path: "status", message: "Status must be a string." }]));
        }

        const validStatuses = ["in_analysis", "unsolved", "in_resolution", "solved", "rejected"]
        if (statusFilter && !validStatuses.includes(statusFilter.toLowerCase())) {
            return next(validationError([{ path: "status", message: "Invalid status value." }]));
        }

        if (statusFilter) {
            whereClause.status = statusFilter.toLowerCase();
        }

        if(authorFilter){
            const authorRecord = await User.findOne({ where: { username: authorFilter } });
            if (!authorRecord) {
                return next(validationError([{ path: "author", message: "This author was not found." }]));
            }
            whereClause.userId = authorRecord.id;
        }

        const incidents = await Incident.findAndCountAll({
            offset,
            limit: limitNumber,
            order,
            where: whereClause
        });

        const incidentsList = incidents.rows.map(incident => ({
            ...incident.toJSON(),
            links: {
                self: { href: `/incidents/${incident.id}` },
                comments: { href: `/incidents/${incident.id}/comments` }
            }
        }));

        const queryParams = `?page=${pageNumber}&limit=${limitNumber}${sort ? `&sort=${sort}` : ''}${authorFilter ? `&author=${encodeURIComponent(authorFilter)}` : ''}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}`;

        res.status(200).json({
            data: incidentsList,
            page: pageNumber,
            limit: limitNumber,
            totalItems: incidents.count,
            totalPages: Math.ceil(incidents.count / limitNumber),
            links: {
                self: { href: `/incidents${queryParams}` },
                next: { href: `/incidents${queryParams.replace(`page=${pageNumber}`, `page=${pageNumber + 1}`)}` },
                prev: { href: `/incidents${queryParams.replace(`page=${pageNumber}`, `page=${Math.max(pageNumber - 1, 1)}`)}` }
            }
        });

    } catch(error){
        next(genericError("Something went wrong. Please try again later"));
    }
}

export const getIncidentById = async(req, res, next)=>{
    try{
        const { id} = req.params
        if(isNaN(parseInt(id))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        // validate if the incident exists
        const incident = await Incident.findByPk(id)
        if (!incident) {
            return next(notFoundError("Incident", id))
        }

        // fetching the status, photo(s) and categor(ies) of the incident
        const [statuses, photos, categories] = await Promise.all([
            IncidentStatus.findAll({ where: { incidentId: id }, order: [['createdAt', 'ASC']] }),
            IncidentPhoto.findAll({ where: { incidentId: id } }),
            IncCategories.findAll({ where: { incidentId: id } })
        ]);

        res.status(200).json({
            ...incident.toJSON(),
            status: statuses.length ? statuses[statuses.length - 1].status : incident.status,
            photo: photos.map(p => p.photo),
            incCategories: categories.map(c => c.incCategoryId),
            links: {
                comments: { href: `/incidents/${incident.id}/comments` }
            }
        });


    } catch(error){
        next(genericError("Something went wrong. Please try again later"));
    }
}


// to-do tomorrow:
// - add a query filter for priority in getIncidents
// - improve author query param, letting the user filter himself by saying "author=me"
// - do the patch and delete /incidents pretty quickly zingas zingas
// - maybe start working on the /incidents/statistics function