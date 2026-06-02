import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/db.config.js'

export const register = async(req, res, next)=>{
    try{
        // body params: email, username, password, userType (must be student, professor or janitor).
        const { email, password, username, userType } = req.body
        if(!email || !password || !username || !userType){
            next(missingFieldsValidationError())
        }

        // validade character length 
        if(username.length < 4){
            return res.status(400).json({msg: "Username must be at least 4 characters long"})
            next(validationError([{ path: "username", message: "Username must be at least 4 characters long" }]))
        }
        if(password.length < 10){
            next(validationError([{ path: "password", message: "Password must be at least 10 characters long" }]))
        }

        // validate if email and/or username already exists 
        const existingUser = await User.findOne({ where: { email: email.toLowerCase() } })
        if(existingUser){
            next(conflictError(`The email address ${email} is already associated with an account.`));
        }

        const existingUsername = await User.findOne({ where: { username } })
        if(existingUsername){
            next(conflictError(`User ${username} already exists.`));
        }

        // validate if email ends with 'ipp.pt'
        if (!email.endsWith('ipp.pt')) {
            next(validationError([{ path: "email", message: "Invalid email domain. Please use a valid P.PORTO email address." }]))
        }

        //validate userType
        const validUserTypes = ["student", "professor", "janitor"]
        if (!validUserTypes.includes(userType.toLowerCase())) {
            next(validationError([{ path: "userType", message: "Invalid user type. User type must be either student, professor, or janitor." }]))
        }

        const hashedPassword = await bcrypt.hash(password, 10); //hash user’s password

        const newUser = await User.create({ email: email.toLowerCase(), password: hashedPassword, username, userType });
        return res.status(201).json({ 
            id: newUser.id,
            links: {
                login: { href: "/users/login" }
            }
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, msg: error.message });
        }  else {
            next(genericError("Something went wrong. Please try again later"));
        }
    }
}

export const login = async(req, res, next)=>{
    // 403 forbidden if the account is banned (isBanned = true)
    // 404 not found if the user does not exist
    try{
        const { username, password } = req.body
        if(!username || !password){
            next(missingFieldsValidationError(["username", "password"]))
        }
        const user = await User.findOne({ where: { username } })

        //validation
        if(!user || !await bcrypt.compare(password, user.password)){
            next(unauthorizedError("Invalid credentials!"))
        } else if (user.isBanned) {
            next(forbiddenError("You are not allowed to do this request"))
        } else if( username != user.username){
            next(notFoundError("User", username))
        }


        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, userType: user.userType }, 
            process.env.SECRET,
            { expiresIn: '30m' }
        );

        return res.status(200).json({ success: true, accessToken: token });
    } catch (error) {
        next(genericError("Something went wrong. Please try again later"));
        
    }
}


// to do tomorrow:
// fix error handler so you receive a 404 if you try to log in with a username that does not exist, instead of a 401 with "Invalid credentials". 
// move on to other routes i guess :p