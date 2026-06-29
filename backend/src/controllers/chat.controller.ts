import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { generateChatResponse, generateChatTitle } from '../services/gemini.service';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const getSingleParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

// GET /api/chats — Kullanıcının tüm sohbetleri
export const getChats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.userId! },
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
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Sohbetler alınamadı.' });
  }
};

// POST /api/chats — Yeni sohbet oluştur
export const createChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chat = await prisma.chat.create({
      data: { userId: req.userId!, title: 'Yeni Sohbet' },
    });
    res.status(201).json({ chat });
  } catch (error) {
    res.status(500).json({ error: 'Sohbet oluşturulamadı.' });
  }
};

// GET /api/chats/:id — Sohbet + tüm mesajlar
export const getChatById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = getSingleParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: 'Geçersiz sohbet kimliği.' });
      return;
    }

    const chat = await prisma.chat.findFirst({
      where: { id, userId: req.userId! },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!chat) {
      res.status(404).json({ error: 'Sohbet bulunamadı.' });
      return;
    }
    res.json({ chat });
  } catch (error) {
    res.status(500).json({ error: 'Sohbet alınamadı.' });
  }
};

// DELETE /api/chats/:id — Sohbeti sil
export const deleteChat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = getSingleParam(req.params.id);

    if (!id) {
      res.status(400).json({ error: 'Geçersiz sohbet kimliği.' });
      return;
    }

    const chat = await prisma.chat.findFirst({ where: { id, userId: req.userId! } });
    if (!chat) {
      res.status(404).json({ error: 'Sohbet bulunamadı.' });
      return;
    }
    await prisma.chat.delete({ where: { id } });
    res.json({ message: 'Sohbet silindi.' });
  } catch (error) {
    res.status(500).json({ error: 'Sohbet silinemedi.' });
  }
};

// PATCH /api/chats/:id — Sohbet başlığını güncelle
export const updateChatTitle = async (req: AuthRequest, res: Response): Promise<void> => {
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
  } catch (error) {
    res.status(500).json({ error: 'Başlık güncellenemedi.' });
  }
};

// POST /api/chats/:id/messages — Mesaj gönder (+ opsiyonel fotoğraf)
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
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
      where: { id, userId: req.userId! },
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
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }));

    // Gemini'den yanıt al
    const imagePath = file ? path.join(__dirname, '../../uploads', file.filename) : undefined;
    const aiResponse = await generateChatResponse(
      content || `Bu fotoğrafı analiz et: ${file?.originalname}`,
      history,
      imagePath
    );

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
      const title = await generateChatTitle(content || `Fotoğraf analizi: ${file?.originalname}`);
      await prisma.chat.update({ where: { id }, data: { title } });
    }

    // Sohbet updatedAt'i güncelle
    await prisma.chat.update({ where: { id }, data: { updatedAt: new Date() } });

    res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Mesaj gönderilemedi. Gemini API hatası olabilir.' });
  }
};
