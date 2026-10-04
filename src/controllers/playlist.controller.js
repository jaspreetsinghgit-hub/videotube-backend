import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { asyncHandler } from "../utilities/requestHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    // Validating name and description
    if (!name?.trim()) throw new ApiError(400, "Playlist name is required");
    if (!description?.trim()) throw new ApiError(400, "Playlist description is required");

    // Checking if the user is authenticated
    if (!req.user?._id) throw new ApiError(401, "User is not authenticated");

    // Creating the playlist
    const newPlaylist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user._id,
    });

    return res.status(201).json(new ApiResponse(201, newPlaylist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // validating userId
    if (!userId?.trim() || !isValidObjectId(userId)) throw new ApiError(400, "User ID is required");

    // Fetching playlists
    const playlists = await Playlist.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        { $project: { _id: 1, name: 1, description: 1 } }
    ]);

    return res.status(200).json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // validating playlistId
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) throw new ApiError(400, "Playlist ID is required");

    // Fetching playlist
    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwner",
                            pipeline: [
                                { $project: { fullName: 1, avatar: 1 } }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            videoOwner: { $first: "$videoOwner" }
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            videoFile: 1,
                            duration: 1,
                            videoOwner: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "playlistOwner",
                pipeline: [
                    { $project: { fullName: 1, avatar: 1 } }
                ]
            }
        },
        {
            $addFields: {
                playlistOwner: { $first: "$playlistOwner" }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                videos: 1,
                playlistOwner: 1
            }
        }
    ]);

    // if playlist is not found
    if (!playlist.length) throw new ApiError(404, "Playlist not found");

    return res.status(200).json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // validating playlistId and videoId
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) throw new ApiError(400, "Playlist ID is required");
    if (!videoId?.trim() || !isValidObjectId(videoId)) throw new ApiError(400, "Video ID is required");

    // checking if the user is authenticated
    if (!req.user?._id) throw new ApiError(401, "User is not authenticated");

    // playlist exist or not
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    // checking if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not authorized to add videos to this playlist");

    // video exist or not  
    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    // adding video to playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $addToSet: { videos: videoId } }, // addToSet will only add the video if it doesn't already exist in the array
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // validating playlistId and videoId
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) throw new ApiError(400, "Playlist ID is required");
    if (!videoId?.trim() || !isValidObjectId(videoId)) throw new ApiError(400, "Video ID is required");

    // checking if the user is authenticated
    if (!req.user?._id) throw new ApiError(401, "User is not authenticated");

    // playlist exist or not
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    // checking if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not authorized to remove videos from this playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // validating playlistId
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) throw new ApiError(400, "Playlist ID is required");

    // checking if the user is authenticated
    if (!req.user?._id) throw new ApiError(401, "User is not authenticated");

    // playlist exist or not
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    // checking if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not authorized to delete this playlist");

    // deleting playlist
    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(new ApiResponse(200, null, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    // Validating playlistId
    if (!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is required");
    }

    // Checking if the user is authenticated
    if (!req.user?._id) {
        throw new ApiError(401, "User is not authenticated");
    }

    // Checking if playlist exists
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Checking if the user owns the playlist
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    // At least one field must be provided
    if (name === undefined && description === undefined) {
        throw new ApiError(400, "Name or description is required");
    }

    // If name is provided, it should not be empty
    if (name !== undefined && !name.trim()) {
        throw new ApiError(400, "Playlist name cannot be empty");
    }

    // If description is provided, it should not be empty
    if (description !== undefined && !description.trim()) {
        throw new ApiError(400, "Playlist description cannot be empty");
    }

    // Preparing only the fields that need to be updated
    const updateData = {};

    if (name !== undefined) {
        updateData.name = name.trim();
    }

    if (description !== undefined) {
        updateData.description = description.trim();
    }

    // Updating playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        updateData,
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};
