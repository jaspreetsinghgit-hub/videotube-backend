import { ApiError } from "../utilities/ApiError.js"
import { asyncHandler } from "../utilities/requestHandler.js"
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // validating videoId
    if (!videoId?.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, 'Video ID is required');
    }

    // user authentication check
    if (!req.user?._id) {
        throw new ApiError(401, "User is not authenticated");
    }

    // video exist or not
    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found!");

    const like = await Like.findOne({ video: videoId, likedBy: req.user._id });


    // If the like doesn't exist, creating a new like
    if (!like) {
        const newLike = await Like.create({ video: videoId, likedBy: req.user._id });
        if (!newLike) throw new ApiError(500, 'Failed to like the video');

        return res.status(201).json(new ApiResponse(201, newLike, 'Video liked successfully'));
    }

    // If the like exists, removing it (unlike)
    await Like.findByIdAndDelete(like._id);
    return res.status(200).json(new ApiResponse(200, null, 'Video unliked successfully'));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    // validating commentId
    if (!commentId?.trim() || !isValidObjectId(commentId))
        throw new ApiError(400, "Invalid Comment ID");

    // checking if comment exist
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found!");

    if (!req.user?._id) throw new ApiError(401, "User is not authenticated!");

    const like = await Like.findOne({ comment: commentId, likedBy: req.user._id });

    // Like does not exist 
    if (!like) {

        const commentLike = await Like.create({ likedBy: req.user._id, comment: commentId });
        if (!commentLike) throw new ApiError(500, "Failed to like the comment");

        return res.status(201).json(new ApiResponse(201, commentLike, "Comment liked successfully"));
    }
    else {
        await Like.findByIdAndDelete(like._id);
        return res.status(200).json(new ApiResponse(200, null, "Comment unliked successfully"));
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    // validating tweetId
    if (!tweetId?.trim() || !isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid Tweet ID");

    // checking if tweet exist
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found!");

    if (!req.user?._id) throw new ApiError(401, "User is not authenticated!");

    const like = await Like.findOne({ tweet: tweetId, likedBy: req.user._id });

    // Like does not exist 
    if (!like) {

        const tweetLike = await Like.create({ likedBy: req.user._id, tweet: tweetId });
        if (!tweetLike) throw new ApiError(500, "Failed to like the tweet");

        return res.status(201).json(new ApiResponse(201, tweetLike, "Tweet liked successfully"));
    }
    
    await Like.findByIdAndDelete(like._id);
    return res.status(200).json(new ApiResponse(200, null, "Tweet unliked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    if (!req.user?._id) throw new ApiError(401, "User is not authenticated!");

    // const likedVideos = await Like
    // .find({ likedBy: req.user._id, video: { $ne: null } })
    // .populate('video', 'title description videoFile thumbnail duration');

    const likedVideos = await Like.aggregate([
        { $match: { likedBy: req.user._id, video: { $ne: null } } }, // no need for mongoose.Types.ObjectId conversion, as req.user._id is already an ObjectId by verifyJWT middleware, also ne: not equal to null, so that we only get likes that are associated with videos
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'videoDetails',
                pipeline: [
                    { $project: { title: 1, description: 1, videoFile: 1, thumbnail: 1, duration: 1 } }
                ]
            }
        },
        { $unwind: '$videoDetails' }
    ]);

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
};
