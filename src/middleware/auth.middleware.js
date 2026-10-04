import { User } from "../models/user.model.js";
import { ApiError } from "../utilities/ApiError.js";
import { asyncHandler } from "../utilities/requestHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async function (req, _, next) {
    const token =
        req.cookies?.accessToken ||
        req.headers?.authorization?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "Unauthorized request!");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id)?.select("-password -refreshToken ");

    if (!user) throw new ApiError(401, "Unauthorized request!");

    req.user = user;
    next(); // here we use next() but not in async middleware of mongoose as express middleware is different from mongoose middleware, in express we need to call next() to move to the next middleware but in mongoose we dont need to call next() as it will automatically call next() after the function is completed
})
