import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/db.config.js'
import { missingFieldsValidationError, notFoundError, genericError, validationError, conflictError, forbiddenError} from "../utils/error.utils.js";

export const register = async(req, res, next)=>{
    try{
        // body params: email, username, password, userType (must be student, professor or janitor).
        const { email, password, username, userType } = req.body
        if(!email || !password || !username || !userType){
            return next(missingFieldsValidationError())
        }

        // validate if the formats are correct
        if (typeof password !== "string" || typeof username !== "string" || typeof email !== "string" || typeof userType !== "string") {
            return next(validationError([
                { path: "password", message: "Password must be a string." }, 
                { path: "username", message: "Username must be a string." }, 
                { path: "email", message: "Email must be a string." }, 
                { path: "userType", message: "User type must be a string." }
            ]))
        }

        // validate character length 
        if(username.length < 4){
            return next(validationError([{ path: "username", message: "Username must be at least 4 characters long" }]))
        }
        if(password.length < 10){
            return next(validationError([{ path: "password", message: "Password must be at least 10 characters long" }]))
        }

        // validate if email and/or username already exists 
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } })
        if(existingUser){
            return next(conflictError(`The email address ${email} is already associated with an account.`));
        }

        const existingUsername = await User.findOne({ where: { username } })
        if(existingUsername){
            return next(conflictError(`User ${username} already exists.`));
        }

        // validate if email ends with 'ipp.pt'
        if (!email.endsWith('ipp.pt')) {
            return next(validationError([{ path: "email", message: "Invalid email domain. Please use a valid P.PORTO email address." }]))
        }

        //validate userType
        const validUserTypes = ["student", "professor", "janitor"]
        if (!validUserTypes.includes(userType.toLowerCase())) {
            return next(validationError([{ path: "userType", message: "Invalid user type. User type must be either student, professor, or janitor." }]))
        }

        const hashedPassword = await bcrypt.hash(password, 10); //hash user’s password

        const newUser = await User.create({ 
            email: email.toLowerCase(),
            password: hashedPassword, 
            username, 
            userType: userType.toLowerCase() 
        });
        res.status(201).json({ 
            id: newUser.id,
            links: {
                login: { href: "/users/login", method: "POST" }
            }
        });
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}

export const login = async(req, res, next)=>{
    // 403 forbidden if the account is banned (isBanned = true)
    // 404 not found if the user does not exist
    try{
        const { username, password } = req.body
        if(!username || !password){
            return next(missingFieldsValidationError(["username", "password"]))
        }
        const user = await User.findOne({ where: { username } })

        //validation if user exists
        if(!user){
            return next(notFoundError("User", username))
        }
        // validation if the user is banned or not
        if (user.isBanned) {
            return next(forbiddenError("You are not allowed to do this request"))
        }


        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, userType: user.userType }, 
            process.env.SECRET,
            { expiresIn: '30m' }
        );

        res.status(200).json({ success: true, accessToken: token });
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
        
    }
}

export const patchUserById = async(req, res, next)=>{
    try {
        const { id } = req.params
        const { approval, isBanned } = req.body
        const user = await User.findByPk(id)

        // validate if user authenticated is an admin
        if (req.user.userType !== "admin") { 
            return next(forbiddenError("You are not allowed to do this request"))
        }

        // validate if user exists
        if (!user && user.id !== "me") {
            return next(notFoundError("User", id))
        }

        // validate if approval or isBanned were provided
        if (approval === undefined && isBanned === undefined) {
            return next(missingFieldsValidationError(["approval", "isBanned"]))
        }

        // validate provided fields individually
        const validationErrors = []
        if (approval !== undefined && typeof approval !== "boolean") {
            validationErrors.push({ path: "approval", message: "Approval must be a boolean value." })
        }
        if (isBanned !== undefined && typeof isBanned !== "boolean") {
            validationErrors.push({ path: "isBanned", message: "Is Banned must be a boolean value." })
        }
        if (validationErrors.length) {
            return next(validationError(validationErrors))
        }

        // validate if the user is trying to ban themselves or get approval for themselves
        if (user.id === req.user.id) {
            return next(forbiddenError("You are not allowed to do this request on yourself."))
        }

        // patch user fields that were provided
        if (approval !== undefined) user.approval = approval
        if (isBanned !== undefined) user.isBanned = isBanned
        await user.save()

        res.status(200).json({
            id: user.id,
            username: user.username,
            approval: user.approval,
            isBanned: user.isBanned
         })

    } catch(error){
        next(genericError("Something went wrong. Please try again later"));
    }
}

// PATCH /users/me
export const patchMe = async(req, res, next)=>{
    try {
        const { password } = req.body
        // find the ID of the authenticated user in the database, with the valid token provided in the request header
        const user = await User.findByPk(req.user.id)

        // validate if password was provided
        if (!password) {
            return next(missingFieldsValidationError(["password"]))
        }

        // validate if password is a string
        if (typeof password !== "string") {
            return next(validationError([{ path: "password", message: "Password must be a string." }]))
        }

        // validate character length
        if(password.length < 10){
            return next(validationError([{ path: "password", message: "Password must be at least 10 characters long" }]))
        }

        // hash new password and update user
        const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword
            await user.save()

            res.status(200).json({msg: "Password updated successfully."})
        
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
    }
}

// to do tomorrow: