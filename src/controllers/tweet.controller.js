import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { asyncHandler } from "../utilities/requestHandler.js";
import { User } from "../models/user.model.js";


const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    // Validating content
    if (!content?.trim()) throw new ApiError(400, "Content is required");

    // creating a new tweet
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    });

    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    let { page = 1, limit = 10 } = req.query;


    // validating page and limit
    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;


    // validating userId
    if (!userId || !isValidObjectId(userId)) throw new ApiError(400, "User ID is required");


    // checking if user exists
    const userExists = await User.findById(userId);
    if (!userExists) throw new ApiError(404, "User not found");


    // fetching tweets
    const tweets = await Tweet.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: { fullName: 1, avatar: 1 }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: limit
        },
    ]);


    return res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { tweetId } = req.params;

    // validating content and tweetId
    if (!content?.trim()) throw new ApiError(400, "Content is required");
    if (!tweetId?.trim() || !isValidObjectId(tweetId)) throw new ApiError(400, "Tweet ID is required");

    // checking if tweet exists
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");


    // checking if the user is the owner of the tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this tweet");
    }

    // updating the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    // validating tweetId
    if (!tweetId?.trim() || !isValidObjectId(tweetId)) throw new ApiError(400, "Tweet ID is required");

    // checking if tweet exists
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    // checking if the user is the owner of the tweet
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this tweet");
    }

    // deleting the tweet
    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(new ApiResponse(200, null, "Tweet deleted successfully"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
