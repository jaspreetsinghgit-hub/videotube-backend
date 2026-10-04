import "dotenv/config";

import connectDB from "./db/dbIndex.js";
import { app } from "./app.js";



connectDB()
    .then(() => {
        let port = process.env.PORT || 3000;

        app.listen(port, () => {
            console.log(`Listening on the port : ${port}`);
        });
    })
    .catch(err => console.log(`Mongo Db connection failed : \n\n ${err}`));


/* connection process with mongoose
; (async () => {
    try {
        let URI = process.env.MONGODB_URI;
 
        await mongoose.connect(`${URI}/${DB_NAME}`);
        app.on("error", (err) => {
            console.log(`ERR: ${err}`);
        })
 
        
        app.listen(port, () => {
            console.log(`Listening on port : ${port}`);
        })
        
    } catch (error) {
        console.log("Err: ", error);
    }
})()
*/