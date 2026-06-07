import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Incident, IncidentStatus, IncidentPhoto, IncCategories, User, Comment, Treatment, Category } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError, unauthorizedError} from "../utils/error.utils.js";

export const createIncident = async(req, res, next)=>{
    try{
        // body params: title, description, building, coordinates, priority, photo(s), categor(ies)
        const { title, description, building, coordinates, priority, photo, incCategoryId } = req.body

        if(!title || !building || !coordinates || !priority){
            return next(missingFieldsValidationError())
        }

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
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
            status: newIncident.status,
            photo: photo,
            incCategoryId: incCategoryId,
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
        const {page, limit, sort, author, status, priority} = req.query

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
        const priorityFilter = priority

        if(authorFilter !== undefined && typeof authorFilter !== "string"){
            return next(validationError([{ path: "author", message: "Author must be a string." }]));
        }

        if (statusFilter !== undefined && typeof statusFilter !== "string") {
            return next(validationError([{ path: "status", message: "Status must be a string." }]));
        }

        if (priorityFilter !== undefined && typeof priorityFilter !== "string") {
            return next(validationError([{ path: "priority", message: "Priority must be a string." }]));
        }

        const validStatuses = ["in_analysis", "unsolved", "in_resolution", "solved", "rejected"]
        if (statusFilter && !validStatuses.includes(statusFilter.toLowerCase())) {
            return next(validationError([{ path: "status", message: "Invalid status value." }]));
        }

        const validPriorities = ["low", "medium", "high"]
        if (priorityFilter && !validPriorities.includes(priorityFilter.toLowerCase())) {
            return next(validationError([{ path: "priority", message: "Invalid priority value." }]));
        }

        if (statusFilter) {
            whereClause.status = statusFilter.toLowerCase();
        }

        if (priorityFilter) {
            whereClause.priority = priorityFilter.toLowerCase();
        }

        if(authorFilter){
            // verify if the author filter is "me"
            // BUT FIRST: verify if the user is authenticated at all
            if (!req.user) {
                return next(unauthorizedError("You must be authenticated to do this request."));
            }
            if(authorFilter === "me"){
                whereClause.userId = req.user.id;
            } else {
                const authorRecord = await User.findOne({ where: { username: authorFilter } });
                // verify if the author exists
                if (!authorRecord) {
                    return next(validationError([{ path: "author", message: "This author was not found." }]));
                }
                whereClause.userId = authorRecord.id;
            }
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

        //construction of the response
        const queryParts = [`page=${pageNumber}`, `limit=${limitNumber}`];
        if (sort) queryParts.push(`sort=${encodeURIComponent(sort)}`);
        if (authorFilter !== undefined) queryParts.push(`userType=${encodeURIComponent(authorFilter)}`);
        if (statusFilter !== undefined) queryParts.push(`approval=${encodeURIComponent(statusFilter)}`);
        if (priorityFilter !== undefined) queryParts.push(`isBanned=${encodeURIComponent(priorityFilter)}`);

        const queryParams = `?${queryParts.join('&')}`;
        const nextQuery = `?${queryParts.map(part => part.replace(`page=${pageNumber}`, `page=${pageNumber + 1}`)).join('&')}`;
        const prevQuery = `?${queryParts.map(part => part.replace(`page=${pageNumber}`, `page=${Math.max(pageNumber - 1, 1)}`)).join('&')}`;

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
            noComments: await Comment.count({ where: { incidentId: id } }),
            links: {
                comments: { href: `/incidents/${incident.id}/comments` }
            }
        });


    } catch(error){
        next(genericError("Something went wrong. Please try again later"));
    }
}

export const deleteIncident = async(req,res, next)=>{
    try{
        const { id } = req.params

        // validate if id is a number
        if(isNaN(parseInt(id))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        // validate if user authenticated is an admin or the creator of the incident
        if (req.user.userType !== "admin" && req.user.id !== incident.userId) { 
            return next(forbiddenError("You are not allowed to do this request"))
        }
        

        // validate if the incident exists
        const incident = await Incident.findByPk(id)
        if (!incident) {
            return next(notFoundError("Incident", id))
        }

        await incident.destroy()
        // destroy also the associated photos, treatments, comments, incCategories and status records
        await IncidentPhoto.destroy({ where: { incidentId: id } })
        await IncCategories.destroy({ where: { incidentId: id } })
        await IncidentStatus.destroy({ where: { incidentId: id } })
        await Comment.destroy({ where: { incidentId: id } })
        await Treatment.destroy({ where: { incidentId: id } })
        res.status(200).json({ message: "Incident deleted successfully." })
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"))
    }
}

export const patchIncidentById = async(req, res, next)=>{
    try{
        const { id } = req.params
        const { title, description, building, coordinates, priority, status, photo, incCategoryId } = req.body
        const incident = await Incident.findByPk(id)

        // validate if id is a number
        if(isNaN(parseInt(id))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        // validate if the incident exists
        if (!incident) {
            return next(notFoundError("Incident", id))
        }

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        // validate if user authenticated is an admin, a janitor, or the creator of the incident 
        if (req.user.userType !== "admin" && req.user.userType !== "janitor" && req.user.id !== incident.userId) { 
            return next(forbiddenError("You are not allowed to do this request"))
        }

        //validate if at least one field was provided
        if (title === undefined 
            && description === undefined 
            && building === undefined && 
            coordinates === undefined && 
            priority === undefined && 
            status === undefined && 
            photo === undefined && 
            incCategoryId === undefined) {
            return next(missingFieldsValidationError())
         }

        // validate if the formats are correct
        const validationErrors = []

        if (title !== undefined && typeof title !== "string") {
            validationErrors.push({ path: "title", message: "Title must be a string." })
        }
        if (description !== undefined && typeof description !== "string") {
            validationErrors.push({ path: "description", message: "Description must be a string." })
        }
        if (building !== undefined && typeof building !== "string") {
            validationErrors.push({ path: "building", message: "Building must be a string." })
        }
        if (priority !== undefined && typeof priority !== "string") {
            validationErrors.push({ path: "priority", message: "Priority must be a string." })
        }
        if (status !== undefined && typeof status !== "string") {
            validationErrors.push({ path: "status", message: "Status must be a string." })
        }
        if (coordinates !== undefined && typeof coordinates !== "string") {
            validationErrors.push({ path: "coordinates", message: "Coordinates must be a string." })
        }
        if (Array.isArray(photo) && !photo.every(p => typeof p === "string")) {
            validationErrors.push({ path: "photo", message: "Photo must be a string." })
        }
        if (incCategoryId !== undefined && (!Array.isArray(incCategoryId) || incCategoryId.length === 0)) {
            validationErrors.push({ path: "incCategoryId", message: "You must provide at least one category." })
        }

        if (validationErrors.length) {
            return next(validationError(validationErrors))
        }

        // validate character length 
        if (title !== undefined && (title.length < 3 || title.length > 50)) {
            return next(validationError([{ path: "title", message: "Title must be between 3 and 50 characters long" }]))
        }
        if (building !== undefined && (building.length < 2 || building.length > 100)) {
            return next(validationError([{ path: "building", message: "Building must be between 2 and 100 characters long" }]))
        }
        if (coordinates !== undefined && (coordinates.length < 4 || coordinates.length > 50)) {
            return next(validationError([{ path: "coordinates", message: "Coordinates must be between 4 and 50 characters long" }]))
        }

        // validate priority and status value
        const validPriorities = ["low", "medium", "high"]
        if (priority && !validPriorities.includes(priority.toLowerCase())) {
            return next(validationError([{ path: "priority", message: "Invalid priority value. Priority must be either low, medium, or high." }]))
        }

        const validStatuses = ["in_analysis", "unsolved", "in_resolution", "solved", "rejected"]
        if (status && !validStatuses.includes(status.toLowerCase())) {
            return next(validationError([{ path: "status", message: "Invalid status value." }]));
        }

        // admins and janitors can only patch the status of the incident
        // the creator can patch everything else but the status
        if(status && (req.user.userType === "janitor" || req.user.userType === "admin")){
            if (status !== undefined) incident.status = status
            await incident.save()

            res.status(200).json({
                id: incident.id,
                status: incident.status,
                links: {
                    self: { href: `/incidents/${incident.id}`, method: "GET" }
                }
            })
        }
        else if (req.user.id === incident.userId){
            if (title !== undefined) incident.title = title
            if (description !== undefined) incident.description = description
            if (building !== undefined) incident.building = building
            if (coordinates !== undefined) incident.coordinates = coordinates
            if (priority !== undefined) incident.priority = priority
            if (incCategoryId !== undefined) {
                await IncCategories.destroy({ where: { incidentId: id } })
                for (const categoryId of incCategoryId) {
                    await IncCategories.create({
                        incidentId: id,
                        incCategoryId: categoryId
                    })
                }
            }
            if (photo !== undefined) {
                await IncidentPhoto.destroy({ where: { incidentId: id } })
                for (const p of photo) {
                    await IncidentPhoto.create({
                        photo: p,
                        incidentId: incident.id
                    })
                }
            }

            await incident.save()

            res.status(200).json({
                id: incident.id,
                title: incident.title,
                registrationDate: incident.registrationDate,
                building: incident.building,
                priority: incident.priority,
                photo: photo,
                incCategoryId: incCategoryId,
                links: {
                    self: { href: `/incidents/${incident.id}`, method: "GET" }
                }
            })
        }
        
            

    } catch(error){
        next(genericError("Something went wrong. Please try again later"))
    }
}

export const getStatistics = async(req, res, next)=>{
    try {
        const { metric = "incidents_by_category" } = req.query

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        // validate if user authenticated is an admin
        if (req.user.userType !== "admin") {
            return next(forbiddenError("You're not allowed to perform this request"))
        }

        const validMetrics = ["incidents_by_category", "incidents_by_status"]
        const selectedMetric = metric

        if (!validMetrics.includes(selectedMetric)) {
            return next(validationError([{ path: "metric", message: "Invalid metric. Pick one or more of these: incidents_by_category, incidents_by_status." }]))
        }

        // incidents_by_category
        if (selectedMetric === "incidents_by_category") {
            let order = [[Category.sequelize.literal('count'), 'DESC']]

            const categories = await Category.findAll({
                attributes: [
                    'incCategoryDesc',
                    [Category.sequelize.literal('COUNT(`incidents`.`id`)'), 'count']
                ],
                include: [{
                    model: Incident,
                    attributes: [],
                    through: { attributes: [] },
                    required: false
                }],
                group: ['categories.id', 'categories.incCategoryDesc'],
                order
            })
            
            const incidentsByCategory = {}
            categories.forEach(category => {
                incidentsByCategory[category.incCategoryDesc] = parseInt(category.get('count'), 10)
            })

            return res.status(200).json({
                metric: "incidents_by_category",
                data: incidentsByCategory
            })
        }

        // incidents_by_status
        if (selectedMetric === "incidents_by_status") {
            let order = [[IncidentStatus.sequelize.literal('count'), 'DESC']]

            const statuses = await IncidentStatus.findAll({
                attributes: [
                    'status',
                    [IncidentStatus.sequelize.literal('COUNT(*)'), 'count']
                ],
                group: ['status'],
                order
            })
            
            const incidentsByStatus = {}
            statuses.forEach(status => {
                incidentsByStatus[status.status] = parseInt(status.get('count'), 10)
            })

            return res.status(200).json({
                metric: "incidents_by_status",
                data: incidentsByStatus
            })
        }

        return res.status(200).json({
            metric: selectedMetric,
            data: {}
        })
    } catch (error) {
        console.error(error)
        next(genericError("Something went wrong. Please try again later"))
    }
}


// to-do tomorrow:
// - make at the very least 2 of the statistics query params
// - finish up the documentation with examples for both good and bad requests