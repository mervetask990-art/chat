"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
// Multer konfigürasyonu
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Sadece JPEG, PNG, WebP ve GIF desteklenir.'));
        }
    },
});
// Tüm rotalar auth gerektirir
router.use(auth_1.authMiddleware);
router.get('/', chat_controller_1.getChats);
router.post('/', chat_controller_1.createChat);
router.get('/:id', chat_controller_1.getChatById);
router.delete('/:id', chat_controller_1.deleteChat);
router.patch('/:id', chat_controller_1.updateChatTitle);
router.post('/:id/messages', upload.single('image'), chat_controller_1.sendMessage);
exports.default = router;
