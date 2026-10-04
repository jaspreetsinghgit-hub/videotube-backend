import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        let URI = process.env.MONGODB_URI;

        const connectionInstance = await mongoose.connect(`${URI}/${DB_NAME}`);

        // console.log("Connection Instance: \n");
        // console.log(connectionInstance)

        console.log(`\n MongoDB connected!! DB Host: ${connectionInstance.connection.host}`)

    } catch (error) {
        console.log(`MongoDB connection Error: ${error}`);
        process.exit(1);
    }
}

export default connectDB;
