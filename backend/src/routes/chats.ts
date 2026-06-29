import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import {
  getChats,
  createChat,
  getChatById,
  deleteChat,
  updateChatTitle,
  sendMessage,
} from '../controllers/chat.controller';

const router = Router();

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPEG, PNG, WebP ve GIF desteklenir.'));
    }
  },
});

// Tüm rotalar auth gerektirir
router.use(authMiddleware);

router.get('/', getChats);
router.post('/', createChat);
router.get('/:id', getChatById);
router.delete('/:id', deleteChat);
router.patch('/:id', updateChatTitle);
router.post('/:id/messages', upload.single('image'), sendMessage);

export default router;
