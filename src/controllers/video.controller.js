import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utilities/ApiError.js"
import { ApiResponse } from "../utilities/ApiResponse.js"
import { uploadOnCloudinary, deleteFileFromCloudinary } from "../utilities/cloudinary.js"
import { asyncHandler } from "../utilities/requestHandler.js"
import { User } from "../models/user.model.js"

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    // Validate and parse query parameters
    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);

    if (page <= 0) { page = 1 }
    if (limit <= 0) { limit = 10 }

    // match stage
    const matchStage = {
        isPublished: true // so that only published videos are fetched
    };

    if (query?.trim()) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }
    if (userId) {
        if (isValidObjectId(userId)) {
            matchStage.owner = new mongoose.Types.ObjectId(userId);
        }
        else {
            throw new ApiError(400, "Invalid userId");
        }
    }

    // owner lookup stage
    const ownerLookupStage = {
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                {
                    $project: {
                        username: 1,
                        fullName: 1,
                        avatar: 1
                    }
                }
            ]
        }
    };

    // extracting owner from array
    const gettingOwnerStage = {
        $addFields: {
            owner: { $first: "$owner" }
        }
    }

    // sort stage
    const sortStage = {};
    if (sortBy && sortType) {
        sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    }
    else {
        sortStage.createdAt = -1; // default sort by createdAt descending (means latest videos first)
    }

    // pagination stage
    const videos = await Video.aggregate([
        {
            $match: matchStage

        },
        ownerLookupStage,
        gettingOwnerStage,
        {
            $sort: sortStage

        },
        {
            $skip: (page - 1) * limit

        },
        {
            $limit: limit

        }
    ]);

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully!"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    // validate title and description
    if (!title?.trim()) throw new ApiError(400, "Title is required!");

    if (!description?.trim()) throw new ApiError(400, "Description is required!");

    // retrieve file paths
    const videoFilePath = req.files?.videoFile?.[0]?.path;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFilePath) throw new ApiError(400, "Video file is required!");
    if (!thumbnailPath) throw new ApiError(400, "Thumbnail is required!");

    // uploading video and thumbnail to cloudinary
    const uploadedVideoFile = await uploadOnCloudinary(videoFilePath);
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailPath);

    if (!uploadedVideoFile || !uploadedVideoFile.secure_url) {
        throw new ApiError(500, "Failed to upload video file!");
    }

    if (!uploadedThumbnail || !uploadedThumbnail.secure_url) {
        if (uploadedVideoFile?.public_id) {
            await deleteFileFromCloudinary(uploadedVideoFile.public_id);
        }

        throw new ApiError(500,"Failed to upload thumbnail!");
    }

    // check if user is authenticated
    if (!req.user || !req.user._id) {
        throw new ApiError(401, "Unauthorized! User not found.");
    }

    // creating a new video
    const publishedVideo = await Video.create({
        videoFile: uploadedVideoFile.secure_url,
        videoPublicId: uploadedVideoFile.public_id,

        thumbnail: uploadedThumbnail.secure_url,
        thumbnailPublicId: uploadedThumbnail.public_id,

        title: title.trim(),
        description: description.trim(),

        duration: Math.round(uploadedVideoFile.duration),
        owner: req.user._id
    });

    // if video is not published, deleting the uploaded files from cloudinary
    if (!publishedVideo) {
        await deleteFileFromCloudinary(uploadedVideoFile.public_id);
        await deleteFileFromCloudinary(uploadedThumbnail.public_id);
        throw new ApiError(500, "Failed to publish video!");
    }

    return res.status(201).json(new ApiResponse(201, publishedVideo, "Video published successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validating videoId
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId!");
    }

    // Finding video and getting required details
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
                likes: {
                    $size: "$likes",
                },
            },
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                owner: 1,
                likes: 1,
            },
        },
    ]);

    // Checking if video exists
    if (!video.length) {
        throw new ApiError(404, "Video not found!");
    }

    // Incrementing video views
    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1,
            },
        }
    );

    // Adding video to user's watch history
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $addToSet: {
                watchHistory: videoId, // Using $addToSet to avoid duplicates
            },
        }
    );

    // Updating the returned video's view count
    video[0].views += 1;

    return res.status(200).json(new ApiResponse(200, video[0], "Video fetched successfully!"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    // validate videoId
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!");
    }

    // checking if user is authenticated and is the owner of the video
    if (!req.user || !req.user._id || video.owner.toString() !== req.user._id.toString()) { // used tostring() because video.owner is an ObjectId and req.user._id might also be an ObjectId, and object === object is always false, we convert them to string to compare them
        throw new ApiError(403, "You are not authorized to update this video!");
    }

    // updating title and description if provided
    if (title !== undefined) {
        if (!title.trim()) {
            throw new ApiError(400, "Title cannot be empty!");
        }
        video.title = title.trim();
    }
    if (description !== undefined) {
        if (!description.trim()) {
            throw new ApiError(400, "Description cannot be empty!");
        }
        video.description = description.trim();
    }

    // uploading new thumbnail to cloudinary
    if (req.file && req.file.path) {
        const uploadedThumbnail = await uploadOnCloudinary(req.file.path);

        if (!uploadedThumbnail) {
            throw new ApiError(500, "Failed to upload thumbnail!");
        }

        // deleting old thumbnail from cloudinary
        if (video.thumbnailPublicId) {
            await deleteFileFromCloudinary(video.thumbnailPublicId);
        }

        video.thumbnail = uploadedThumbnail.secure_url;
        video.thumbnailPublicId = uploadedThumbnail.public_id;
    }

    const updatedVideo = await video.save();
    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // validate videoId
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    // retrieving the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!");
    }

    // checking if user is authenticated
    if (!req.user || !req.user._id || video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video!");
    }

    // deleting video and thumbnail from cloudinary
    if (video.videoPublicId) {
        await deleteFileFromCloudinary(video.videoPublicId);
    }
    if (video.thumbnailPublicId) {
        await deleteFileFromCloudinary(video.thumbnailPublicId);
    }

    // deleting the video from database
    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, null, "Video deleted successfully!"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // validate videoId
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    // retrieving the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found!");
    }

    // checking if user is authenticated
    if (!req.user || !req.user._id || video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to change the publish status of this video!");
    }

    // toggling the publish status
    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json(new ApiResponse(200, video, "Publish status updated!"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
