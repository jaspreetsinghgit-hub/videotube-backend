import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utilities/requestHandler.js"
import { ApiError } from "../utilities/ApiError.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    let { page = 1, limit = 10 } = req.query

    // validating videoId
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, 'Video ID is required');
    }

    // assigning default values for page and limit if they are not valid numbers
    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);

    if (page <= 0) { page = 1; }
    if (limit <= 0) { limit = 10; }

    // Checking if video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    /* Fetching comments with pagination
    const options = {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: { path: 'owner', select: 'username avatar' }
    };

    const comments = await Comment.paginate({ video: videoId }, options);
    */

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(video._id) } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'commentOwner',
                pipeline: [
                    { $project: { username: 1, avatar: 1 } }
                ]
            }
        },
        {
            $unwind: '$commentOwner'
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                video: 1,
                commentOwner: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ]);

    return res.status(200).json(new ApiResponse(200, comments || [], 'Comments fetched successfully'));
});

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    // Validate input
    if (!content || content.trim() === '') {
        throw new ApiError(400, 'Comment content is required');
    }

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, 'Video ID is required');
    }

    // Checking if video exists
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }


    // Checking if user is authenticated
    if (!req.user || !req.user._id) {
        throw new ApiError(401, 'User not authenticated');
    }

    // comment creation
    const comment = await Comment.create({
        video: videoId,
        content,
        owner: req.user._id
    });

    if (!comment) {
        throw new ApiError(500, 'Failed to add comment');
    }

    return res.status(201).json(new ApiResponse(201, comment, 'Comment added successfully'));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const content = req.body?.content?.trim();

    // Validating commentId
    if (!commentId?.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Validating comment content
    if (!content) {
        throw new ApiError(400, "Comment content is required");
    }

    // Checking authentication
    if (!req.user?._id) {
        throw new ApiError(401, "User is not authenticated");
    }

    // Checking if comment exists
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Checking if logged-in user owns the comment
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this comment");
    }

    // Updating comment
    comment.content = content;

    const updatedComment = await comment.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedComment,
            "Comment updated successfully"
        )
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // validating commentId
    if (!commentId?.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid comment ID');
    }

    // Checking authentication
    if (!req.user?._id) {
        throw new ApiError(401, 'User is not authenticated');
    }

    // Checking if comment exists
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Checking if logged-in user owns the comment
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this comment");
    }

    // Deleting comment
    await Comment.findByIdAndDelete(commentId);

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};
