import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, "Need to be filled!"],
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: [true, "Need to be filled!"],
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: [true, "Need to be filled!"],
        index: true
    },
    avatar: {
        type: String, // cloudinary image url
        required: [true, "Need to be filled!"]
    },
    avatarPublicId: {
        type: String, // cloudinary image public id
        required: true
    },
    coverImage: {
        type: String
    },
    coverImagePublicId: {
        type: String,
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
    ],
    password: {
        type: String,
        required: [true, "Need to be filled!"]
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true });

// hashing
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    
    this.password = await bcrypt.hash(this.password, 10);
    // next(); // we dont need next() here because we are using async function, it will automatically call next() after the function is completed, this is a mongoose middleware function, so it will automatically call next() after the function is completed
});

// password = stored password?
userSchema.methods.isPasswordCorrect = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
}

// JWT token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);
