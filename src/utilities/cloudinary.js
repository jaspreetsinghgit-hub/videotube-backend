import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// upload file
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
        // console.log(`File is uploaded on cloudinary: \n\n ${JSON.stringify(response, null, 5)} \n\n URL: ${response.url} \n\n`);

        fs.unlinkSync(localFilePath);
        return response;

    } catch (err) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload failed
        return null;
    }
};

// delete file
const deleteFileFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId);
        return response;

    }
    catch (error) {
        console.error(`Error while deleting file from Cloudinary :\n ${error}`);
        return null;
    }
}

export { uploadOnCloudinary, deleteFileFromCloudinary };
