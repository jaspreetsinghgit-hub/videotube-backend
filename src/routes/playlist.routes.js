import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist)

router
    .route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

/* alternatively we can write the above code as below
router.get("/:playlistId", getPlaylistById);
router.patch("/:playlistId", updatePlaylist);
router.delete("/:playlistId", deletePlaylist);
*/

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

router.route("/user/:userId").get(getUserPlaylists);

export default router;
