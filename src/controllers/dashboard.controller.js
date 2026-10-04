import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { asyncHandler } from "../utilities/requestHandler.js";


const getChannelStats = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user?._id);

    const data = await Video.aggregate([
        // 1. Geting only videos uploaded by logged-in user
        {
            $match: {
                owner: userId
            }
        },

        // 2. Finding likes for each video
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },

        // 3. Convert likes array into number
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                }
            }
        },

        // 4. Calculating total views, videos and likes
        {
            $group: {
                _id: null,

                totalViews: {
                    $sum: "$views"
                },

                totalVideos: {
                    $sum: 1
                },

                totalLikes: {
                    $sum: "$likes"
                }
            }
        },

        // 5. current user's ID
        {
            $addFields: {
                owner: userId
            }
        },

        // 6. subscribers of current user's channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "totalSubscribers"
            }
        },

        // 7. Converting subscribers array into count
        {
            $addFields: {
                totalSubscribers: {
                    $size: "$totalSubscribers"
                }
            }
        },

        // 8. Removing unnecessary fields
        {
            $project: {
                _id: 0,
                owner: 0
            }
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                data[0] || {
                    totalViews: 0,
                    totalVideos: 0,
                    totalLikes: 0,
                    totalSubscribers: 0
                },
                "Channel fetched successfully"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    let {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc"
    } = req.query;

    // Validating page and limit
    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    // sortBy and sortType
    if (!sortBy) sortBy = "createdAt";
    if (!sortType) sortType = "desc";

    let sortOptions = {};
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $sort: sortOptions
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "Channel videos fetched successfully"
            )
        );
})

export {
    getChannelStats,
    getChannelVideos
};
