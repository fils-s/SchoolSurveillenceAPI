import jwt from 'jsonwebtoken'

export const validateToken = (req, res, next) => {
    try {
        // search token
        const authHeader = req.headers.authorization
        if(!authHeader){
            return res.status(401).json({msg: "No token provided."})
        }
        const [scheme, token] = authHeader.split(' ')
        if(scheme != "Bearer"|| !token){
            return res.status(401).json({msg: "Invalid authorization!"}) 
        }

        //verify token
        const decoded = jwt.verify(token, process.env.SECRET)
        req.user = decoded
        next()
    } catch (error) {
        if(error.name === "TokenExpiredError"){
            return res.status(401).json({msg: "Token expired!"})
        } else if (error.name === "JsonWebTokenError"){
            return res.status(401).json({msg: "Invalid token!"})
        } else{
            return res.status(401).json({msg: "Cannot verify token."})
        }
    }
}