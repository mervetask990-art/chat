"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.updateChatTitle = exports.deleteChat = exports.getChatById = exports.createChat = exports.getChats = void 0;
const client_1 = require("@prisma/client");
const gemini_service_1 = require("../services/gemini.service");
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
const getSingleParam = (value) => {
    if (Array.isArray(value))
        return value[0];
    return value;
};
// GET /api/chats — Kullanıcının tüm sohbetleri
const getChats = async (req, res) => {
    try {
        const chats = await prisma.chat.findMany({
            where: { userId: req.userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { content: true, createdAt: true },
                },
                _count: { select: { messages: true } },
            },
        });
        res.json({ chats });
    }
    catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Sohbetler alınamadı.' });
    }
};
exports.getChats = getChats;
// POST /api/chats — Yeni sohbet oluştur
const createChat = async (req, res) => {
    try {
        const chat = await prisma.chat.create({
            data: { userId: req.userId, title: 'Yeni Sohbet' },
        });
        res.status(201).json({ chat });
    }
    catch (error) {
        res.status(500).json({ error: 'Sohbet oluşturulamadı.' });
    }
};
exports.createChat = createChat;
// GET /api/chats/:id — Sohbet + tüm mesajlar
const getChatById = async (req, res) => {
    try {
        const id = getSingleParam(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Geçersiz sohbet kimliği.' });
            return;
        }
        const chat = await prisma.chat.findFirst({
            where: { id, userId: req.userId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!chat) {
            res.status(404).json({ error: 'Sohbet bulunamadı.' });
            return;
        }
        res.json({ chat });
    }
    catch (error) {
        res.status(500).json({ error: 'Sohbet alınamadı.' });
    }
};
exports.getChatById = getChatById;
// DELETE /api/chats/:id — Sohbeti sil
const deleteChat = async (req, res) => {
    try {
        const id = getSingleParam(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Geçersiz sohbet kimliği.' });
            return;
        }
        const chat = await prisma.chat.findFirst({ where: { id, userId: req.userId } });
        if (!chat) {
            res.status(404).json({ error: 'Sohbet bulunamadı.' });
            return;
        }
        await prisma.chat.delete({ where: { id } });
        res.json({ message: 'Sohbet silindi.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Sohbet silinemedi.' });
    }
};
exports.deleteChat = deleteChat;
// PATCH /api/chats/:id — Sohbet başlığını güncelle
const updateChatTitle = async (req, res) => {
    try {
        const id = getSingleParam(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Geçersiz sohbet kimliği.' });
            return;
        }
        const { title } = req.body;
        const chat = await prisma.chat.update({
            where: { id },
            data: { title },
        });
        res.json({ chat });
    }
    catch (error) {
        res.status(500).json({ error: 'Başlık güncellenemedi.' });
    }
};
exports.updateChatTitle = updateChatTitle;
// POST /api/chats/:id/messages — Mesaj gönder (+ opsiyonel fotoğraf)
const sendMessage = async (req, res) => {
    try {
        const id = getSingleParam(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'Geçersiz sohbet kimliği.' });
            return;
        }
        const { content } = req.body;
        const file = req.file;
        if (!content && !file) {
            res.status(400).json({ error: 'Mesaj veya fotoğraf gereklidir.' });
            return;
        }
        // Sohbet var mı kontrol et
        const chat = await prisma.chat.findFirst({
            where: { id, userId: req.userId },
        });
        if (!chat) {
            res.status(404).json({ error: 'Sohbet bulunamadı.' });
            return;
        }
        // Önceki mesajları al (context için)
        const previousMessages = await prisma.message.findMany({
            where: { chatId: id },
            orderBy: { createdAt: 'asc' },
            take: 20, // Son 20 mesaj context
        });
        // Kullanıcı mesajını kaydet
        const imageUrl = file ? `/uploads/${file.filename}` : undefined;
        const imageName = file ? file.originalname : undefined;
        const userMessage = await prisma.message.create({
            data: {
                chatId: id,
                role: 'user',
                content: content || (file ? `[Fotoğraf paylaşıldı: ${file.originalname}]` : ''),
                imageUrl,
                imageName,
            },
        });
        // Geçmiş mesajları Gemini formatına çevir
        const history = previousMessages.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));
        // Gemini'den yanıt al
        const imagePath = file ? path_1.default.join(__dirname, '../../uploads', file.filename) : undefined;
        const aiResponse = await (0, gemini_service_1.generateChatResponse)(content || `Bu fotoğrafı analiz et: ${file?.originalname}`, history, imagePath);
        // AI yanıtını kaydet
        const assistantMessage = await prisma.message.create({
            data: {
                chatId: id,
                role: 'assistant',
                content: aiResponse,
            },
        });
        // İlk mesajsa sohbet başlığını güncelle
        if (previousMessages.length === 0) {
            const title = await (0, gemini_service_1.generateChatTitle)(content || `Fotoğraf analizi: ${file?.originalname}`);
            await prisma.chat.update({ where: { id }, data: { title } });
        }
        // Sohbet updatedAt'i güncelle
        await prisma.chat.update({ where: { id }, data: { updatedAt: new Date() } });
        res.json({
            userMessage,
            assistantMessage,
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Mesaj gönderilemedi. Gemini API hatası olabilir.' });
    }
};
exports.sendMessage = sendMessage;
