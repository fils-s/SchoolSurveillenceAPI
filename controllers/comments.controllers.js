import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Incident, User, Comment } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError, unauthorizedError} from "../utils/error.utils.js";

export const createComment = async(req, res, next)=>{
    try{
        const { incidentId } = req.params
        
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

export const deleteComment = async(req, res, next)=>{
    try {
        const { incidentId, commentId } = req.params

        if (!incidentId || !commentId) {
            return next(validationError([
                { path: "id", message: "Incident ID must be provided." },
                { path: "commentId", message: "Comment ID must be provided." }
            ]))
        }

        if(isNaN(parseInt(incidentId))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }
        if(isNaN(parseInt(commentId))){
            return next(validationError([{ path: "commentId", message: "Comment ID must be a number." }]));
        }

        const incident = await Incident.findByPk(incidentId)
        const comment = await Comment.findByPk(commentId)

        // validate if the incident (or the comment) exists
        if (!incident) {
            return next(notFoundError("Incident", incidentId))
        }
        if (!comment) {
            return next(notFoundError("Comment", commentId))
        }

        // validate if the comment belongs to that incident
        if (comment.incidentId !== incident.id) {
            return next(notFoundError("Comment", commentId))
        }

        // validate if the user is not banned
        if(req.user.isBanned){
            return next(forbiddenError("You're not allowed to perform this request."))
        }

        //validate if the user authenticated is the comment's creator or an admin
        if (req.user.userType !== "admin" && req.user.id !== comment.userId) { 
            return next(forbiddenError("You are not allowed to do this request"))
        }

        await comment.destroy()
        res.status(200).json({ message: "Comment deleted successfully." })
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}

export const getCommentsByIncident = async(req, res, next)=>{
    try {
        const { incidentId } = req.params

       // query params
        const {page, limit, sort, author} = req.query

        if(isNaN(parseInt(incidentId))){
            return next(validationError([{ path: "id", message: "Incident ID must be a number." }]));
        }

        const incident = await Incident.findByPk(incidentId)
        if (!incident) {
            return next(notFoundError("Incident", incidentId))
        }

        // validate query parameters
        // pagination
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 5;
        const offset = (pageNumber - 1) * limitNumber;

        // sort
        let order = [['createdAt', 'DESC']];
        if (sort) {
            const [field, direction] = sort.split(':');
            const sortField = field === 'commentId' ? 'id' : field;
            const sortDir = direction ? direction.toUpperCase() : null;

            if (!['commentId', 'createdAt'].includes(field) || !['ASC', 'DESC'].includes(sortDir)) {
                return next(validationError([{ path: "sort", message: "Sort must be 'commentId:asc', 'commentId:desc', 'createdAt:asc' or 'createdAt:desc'." }]));
            }

            order = [[sortField, sortDir]];
        }

        const whereClause = { incidentId: incident.id };
        const authorFilter = author;

        if(authorFilter !== undefined && typeof authorFilter !== "string"){
            return next(validationError([{ path: "author", message: "Author must be a string." }]));
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

        const comments = await Comment.findAndCountAll({
            offset,
            limit: limitNumber,
            order,
            where: whereClause
        });

        const commentsList = comments.rows.map(comment => ({
            ...comment.toJSON(),
            links: {
                incident: { href: `/incidents/${incident.id}` },
                user: { href: `/users/${comment.userId}` }
            }
        }));

        const basePath = `/incidents/${incident.id}/comments`
        const queryParams = `?page=${pageNumber}&limit=${limitNumber}${sort ? `&sort=${sort}` : ''}${authorFilter ? `&author=${encodeURIComponent(authorFilter)}` : ''}`

        res.status(200).json({
            data: commentsList,
            page: pageNumber,
            limit: limitNumber,
            totalItems: comments.count,
            totalPages: Math.ceil(comments.count / limitNumber),
            links: {
                next: { href: `${basePath}${queryParams.replace(`page=${pageNumber}`, `page=${pageNumber + 1}`)}` },
                prev: { href: `${basePath}${queryParams.replace(`page=${pageNumber}`, `page=${Math.max(pageNumber - 1, 1)}`)}` }
            }
        });

    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}