import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: [true, "Required!"]
    },
    videoPublicId:{
        type: String,
        required: [true, "Required!"]
    },
    thumbnail: {
        type: String,
        required: [true, "Required!"]
    },
    thumbnailPublicId: {
        type: String,
        required: [true, "Required!"]
    },
    title: {
        type: String,
        required: [true, "Required!"]
    },
    description: {
        type: String,
        required: [true, "Required!"]
    },
    duration: {
        type: Number,
        required: [true, "Required!"]
    },
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
