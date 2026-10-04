import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utilities/ApiError.js";
import { asyncHandler } from "../utilities/requestHandler.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { User } from "../models/user.model.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // validating channelId
    if (!channelId || !isValidObjectId(channelId)) throw new ApiError(400, "Invalid Channel ID");

    // checking if channel exists
    const channel = await User.findById(channelId);
    if (!channel) throw new ApiError(404, "Channel not found");

    // checking if user is trying to subscribe to itself
    if (channelId === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const isSubscribed = await Subscription.findOne({ channel: channelId, subscriber: req.user._id });

    // if already subscribed then unsubscribe else subscribe
    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed._id);
        return res.status(200).json(new ApiResponse(200, null, "Unsubscribed successfully"));
    }

    await Subscription.create({ channel: channelId, subscriber: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "Subscribed successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // validating channelId
    if (!channelId || !isValidObjectId(channelId)) throw new ApiError(400, "Invalid Channel ID");

    // checking if channel exists
    const channel = await User.findById(channelId);
    if (!channel) throw new ApiError(404, "Channel not found");

    // fetching subscribers
    const subscribers = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo"
            }
        },
        {
            $unwind: "$subscriberInfo"
        },
        {
            $project: {
                _id: 0,
                subscriberId: "$subscriberInfo._id",
                fullName: "$subscriberInfo.fullName",
                avatar: "$subscriberInfo.avatar"
            }
        }
        /* Another way to return but less efficient because we are using $replaceRoot which will replace the root document with the subscriberInfo document and then we are projecting the required fields from the subscriberInfo document. So, we are doing extra work here which is not required. So, we will use the above method which is more efficient.
        {
            $project: {
                _id: 0,
                subscriberId: "$subscriberInfo",
            }
        },
        {
            $replaceRoot: { newRoot: "$subscriberId" }
        }
        */
    ]);

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    // validating subscriberId
    if (!subscriberId || !isValidObjectId(subscriberId)) throw new ApiError(400, "Invalid Subscriber ID");

    // checking if user exists
    const user = await User.findById(subscriberId);
    if (!user) throw new ApiError(404, "User not found");

    // fetching subscribed channels
    const subscribedChannels = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelInfo"
            }
        },
        {
            $unwind: "$channelInfo"
        },
        {
            $project: {
                _id: 0,
                channelId: "$channelInfo._id",
                fullName: "$channelInfo.fullName",
                avatar: "$channelInfo.avatar"
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};
