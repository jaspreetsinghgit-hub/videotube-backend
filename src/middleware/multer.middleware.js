import multer from "multer";

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, './public/temp') // ----> defualt parameters cb(error, value)
    },

    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

// export const upload = multer({ storage: storage });
export const upload = multer({ storage }); // alternative

/* Middleware
Middleware is a function that sits between the request and response cycle. It is mainly used for authentication, authorization, logging, validation, error handling, and modifying requests or responses. It can either pass the request to the next middleware/handler or stop the request.
*/
