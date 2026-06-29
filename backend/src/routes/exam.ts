import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getTopics,
  startExam,
  submitAnswer,
  finishExam,
  getExamHistory,
} from '../controllers/exam.controller';

const router = Router();

router.use(authMiddleware);

router.get('/topics', getTopics);
router.get('/history', getExamHistory);
router.post('/start', startExam);
router.post('/:sessionId/answer', submitAnswer);
router.post('/:sessionId/finish', finishExam);

export default router;
