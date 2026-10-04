import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { addComment, deleteComment, getVideoComments, updateComment } from '../controllers/comment.controller.js';

const router = Router();

router.use(verifyJWT);

router.get('/:videoId', getVideoComments);
router.post('/:videoId', addComment);

router.route('/c/:commentId')
    .patch(updateComment)
    .delete(deleteComment);

export default router;