import { Router } from 'express';
import { changePassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from '../controllers/user.controller.js';
import { upload } from '../middleware/multer.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();
const uploadMiddleware = upload.fields(
    [
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]
);

// router.route("/register").post(uploadMiddleware, registerUser);
router.post("/register", uploadMiddleware, registerUser);

router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);

router.post("/refresh-token", refreshAccessToken);

router.post("/change-password", verifyJWT, changePassword);
router.get("/current-user", verifyJWT, getCurrentUser);

router.patch("/update-account", verifyJWT, updateAccountDetails);
router.patch("/avatar", verifyJWT, upload.single("avatar"), updateAvatar);

router.patch("/cover-image", verifyJWT, upload.single("coverImage"), updateCoverImage);
router.get("/c/:username", verifyJWT, getUserChannelProfile);

router.get("/history", verifyJWT, getWatchHistory);

export default router;
