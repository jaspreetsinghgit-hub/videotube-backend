import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { deleteFileFromCloudinary, uploadOnCloudinary } from "../utilities/cloudinary.js";
import { asyncHandler } from "../utilities/requestHandler.js"
import mongoose from "mongoose";

// register user
const registerUser = asyncHandler(async (req, res) => {

    // taking data from Frontend
    const { fullName, username, email, password } = req.body

    // validaiton
    {
        if (
            [fullName, username, email, password].some(field => !field?.trim())
        ) {
            throw new ApiError(400, "All fields are required!");
        }

    }

    // password strength validation
    {
        // if (password.length < 4) {
        //     throw new ApiError(400, "Password must be at least 4 characters long!");
        // }
        // if (!/[0-9]/.test(password)) {
        //     throw new ApiError(400, "Password must contain at least one number!");
        // }
        // if (!/[!@#$%^&*()-+]/.test(password)) {
        //     throw new ApiError(400, "Password must contain at least one special character!");
        // }
    }

    // already exist or not
    {
        const userExist = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (userExist) throw new ApiError(409, "Entered username or email already exists!");
    }

    // image upload & user DB & response send
    {
        // const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;

        // server upload path
        let avatarLocalPath;
        if (req.files && req.files.avatar && req.files.avatar[0]) {
            avatarLocalPath = req.files.avatar[0].path;
        }
        let coverImageLocalPath;
        if (req.files && req.files.coverImage && req.files.coverImage[0]) {
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        // { // console.log
        //     // console.log(`User.controller.js : Request Files \n ${JSON.stringify(req.files, null, 5)}\n`);
        //     console.log(`User.controller.js : Request Files Avatar :\n ${JSON.stringify(req.files.avatar, null, 5)}\n`);

        //     console.log(`User.controller.js : Request Files Avatar[0] :\n ${JSON.stringify(req.files.avatar[0], null, 5)}\n`);

        //     console.log(`User.controller.js : Request Files CoverImage :\n ${JSON.stringify(req.files.coverImage, null, 5)}\n`);

        //     console.log(`User.controller.js : Request Files CoverImage[0] :\n ${JSON.stringify(req.files.coverImage[0], null, 5)}\n`);
        // }

        if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required!");

        // cloudinary upload
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!avatar) throw new ApiError(400, "Problem in uploading avatar!");

        // user DB
        const user = await User.create({
            fullName: fullName,
            username: username.toLowerCase(),
            password,
            email,
            avatar: avatar.secure_url,
            avatarPublicId: avatar.public_id,
            coverImage: coverImage?.secure_url,
            coverImagePublicId: coverImage?.public_id,
        }
        )

        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if (!createdUser) throw new ApiError(500, "Something went wrong while registering user!");

        // final response
        // return res.status(201).json(new ApiResponse(201, createdUser, "User Registered Successfully!"));
        return res
            .status(201)
            .json
            (new ApiResponse(201, createdUser, "User Registered Successfully!"));
    }

});

// return access and refresh token 
const generateAccessAndGenerateRefreshTokens = async (userId) => {
    try {
        const userExist = await User.findById(userId);

        const accessToken = userExist.generateAccessToken();
        const refreshToken = userExist.generateRefreshToken();

        userExist.refreshToken = refreshToken;
        await userExist.save({ validateBeforeSave: false }); // whenever we try to save we need to give password for validaiton but here we dont wanna validate so we can make it false like this

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Error while generating access and refresh tokens");
    }
}

// login user
const loginUser = asyncHandler(async function (req, res) {

    // fetching data
    const { username, email, password } = req.body;

    // validating username/email and password
    if (!(username || email)) {
        throw new ApiError(
            400,
            "Username or email is required!"
        );
    }

    if (!password?.trim()) {
        throw new ApiError(
            400,
            "Password is required!"
        );
    }
    // account exist or not!
    let user = await User.findOne(
        {
            $or: [{ username }, { email }]
        }
    );

    if (!user) throw new ApiError(404, "No User found!")

    // password validation
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid Password!");

    const { accessToken, refreshToken } = await generateAccessAndGenerateRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // so that cookies can be modified only by the server and not by the client/frontend. This is a security measure to prevent cross-site scripting (XSS) attacks, where malicious scripts could potentially access cookies and steal sensitive information like authentication tokens. By setting the httpOnly flag, the cookie is inaccessible to JavaScript running in the browser, enhancing the security of the application.
    const options = {
        httpOnly: true,
        secure: true
    };

    // cookie(name: string, value: string, cookieOptions)
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser },
                "User Logged In Successfully!"
            )
        );

});

// logout user
const logoutUser = asyncHandler(async function (req, res) {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };
    res.
        status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User successfully logged out!")
        );
});

// Refreshing Access token
const refreshAccessToken = asyncHandler(async function (req, res) {
    // fetching token
    const refreshToken =
        req.cookies?.refreshToken ||
        req.headers?.authorization?.replace("Bearer ", "") ||
        req.body.refreshToken;

    if (!refreshToken) throw new ApiError(401, "Unauthorized request!");

    // verifying refreshToken
    const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) throw new ApiError(401, "Invalid Refresh Token!");

    // checking if the provided refresh token matches the one stored in the user's record
    if (refreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or already used!");
    }

    // generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndGenerateRefreshTokens(user._id);

    const options = {
        httpOnly: true,
        secure: true
    }

    // response
    return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "AccessToken refreshed successfully!")
        );
});

// change password
const changePassword = asyncHandler(async function (req, res) {
    const { oldPassword, newPassword } = req.body;

    // validating old and new password
    if (!oldPassword?.trim() || !newPassword?.trim()) {
        throw new ApiError(
            400,
            "Old password and new password are required"
        );
    }

    if (oldPassword === newPassword) {
        throw new ApiError(
            400,
            "New password must be different from old password"
        );
    }

    // checking if the old password is correct
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user?.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect)
        throw new ApiError(400, "Invalid old password");


    // updating the password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// current user
const getCurrentUser = asyncHandler(async function (req, res) {
    const user = await User.findById(req.user?._id).select("-password -refreshToken");
    if (!user) throw new ApiError(404, "User not found!");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User profile retrieved successfully"));
});

// updating account details
const updateAccountDetails = asyncHandler(async function (req, res) {
    const { fullName, email } = req.body; // we can change username if required

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            fullName: fullName, email
        }
    }, { new: true }).select("-password -refreshToken");

    if (!user) throw new ApiError(404, "User not found!");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// updating avatar
const updateAvatar = asyncHandler(async function (req, res) {
    // localPath
    const avatarLocalPath = req.file?.path // only file as there is only avatar
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing!");

    // getting user
    const user = await User.findById(req.user?._id);
    if (!user) throw new ApiError(404, "User not found!");

    // cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) throw new ApiError(400, "Error in uploading avatar");

    // previous Public Id
    const oldPublicId = user.avatarPublicId;

    // updating and saving in db
    user.avatar = avatar.secure_url;
    user.avatarPublicId = avatar.public_id;

    await user.save({ validateBeforeSave: false });

    // deleting file
    if (oldPublicId) await deleteFileFromCloudinary(oldPublicId);

    const updatedUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

// updating coverImage
const updateCoverImage = asyncHandler(async function (req, res) {
    // localPath
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) throw new ApiError(400, "Cover Image file is missing!");

    // getting user
    const user = await User.findById(req.user?._id);
    if (!user) throw new ApiError(404, "User not found!");

    // cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage || !coverImage.secure_url) throw new ApiError(400, "Error in uploading Cover Image");

    // previous Public Id
    const oldPublicId = user.coverImagePublicId;

    // updating and saving in db
    user.coverImage = coverImage.secure_url;
    user.coverImagePublicId = coverImage.public_id;

    await user.save({ validateBeforeSave: false });

    // deleting file
    if (oldPublicId) await deleteFileFromCloudinary(oldPublicId);

    const updatedUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "CoverImage updated successfully"));
});

// get user channel profile
const getUserChannelProfile = asyncHandler(async function (req, res) {
    const { username } = req.params;

    if (!username?.trim()) throw new ApiError(400, "Username is required!");

    // Aggregation pipeline
    const channel = await User.aggregate([
        // stage 1: Match the user by username
        { $match: { username: username.toLowerCase() } },

        // stage 2: Lookup subscribers and subscribed channels
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedChannels"
            }
        },

        // stage 3: Add fields for subscriber count, subscribed channel count, and subscription status
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedChannelCount: { $size: "$subscribedChannels" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // stage 4: Project the desired fields to return
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedChannelCount: 1,
                isSubscribed: 1
            }
        }
    ]);

    if (!channel?.length) throw new ApiError(404, "Channel not found!");

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"));
});

// getWatchHistory
const getWatchHistory = asyncHandler(async function (req, res) {
    const user = await User.aggregate([
        // 1. proper ObjectId for matching user
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user?._id) }
        },

        // 2. watchHistory lookup 
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                // 3. Owner for each video 
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",

                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },

                    // 4. owner array into a single object
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    // user exist or not
    if (!user?.length) {
        throw new ApiError(404, "User not found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
