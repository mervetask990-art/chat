import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { generateExamQuestions } from '../services/gemini.service';

const prisma = new PrismaClient();

const getSingleParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const EEE_TOPICS = [
  'Devre Analizi',
  'Kirchhoff Yasaları',
  'Thevenin ve Norton Teoremleri',
  'AC Devre Analizi',
  'Transistörler (BJT ve MOSFET)',
  'Op-Amp Devreleri',
  'Diyotlar ve Doğrultucular',
  'Fourier Dönüşümü',
  'Laplace Dönüşümü',
  'Sinyal ve Sistemler',
  'Kontrol Sistemleri',
  'Güç Elektroniği',
  'Elektromanyetik Alan Teorisi',
  'Maxwell Denklemleri',
  'Dijital Elektronik',
  'Mikrodenetleyiciler',
  'Sensörler ve Transdüserler',
];

// GET /api/exam/topics
export const getTopics = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ topics: EEE_TOPICS });
};

// POST /api/exam/start — Yeni sınav oturumu başlat
export const startExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topic, count = 5, difficulty = 'orta' } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'Konu seçimi zorunludur.' });
      return;
    }

    // Soruları Gemini ile üret
    const questions = await generateExamQuestions(topic, count, difficulty);

    // Sınav oturumu oluştur
    const session = await prisma.examSession.create({
      data: {
        userId: req.userId!,
        topic,
        totalQuestions: questions.length,
        questions: {
          create: questions.map((q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Sınav başlatılamadı.' });
  }
};

// POST /api/exam/:sessionId/answer — Cevap gönder
export const submitAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessionId = getSingleParam(req.params.sessionId);
    const questionId = getSingleParam(req.body?.questionId);
    const { answer } = req.body;

    if (!sessionId || !questionId) {
      res.status(400).json({ error: 'Geçersiz sınav veya soru kimliği.' });
      return;
    }

    const question = await prisma.examQuestion.findFirst({
      where: { id: questionId, sessionId },
    });

    if (!question) {
      res.status(404).json({ error: 'Soru bulunamadı.' });
      return;
    }

    const isCorrect = answer === question.correctAnswer;

    await prisma.examQuestion.update({
      where: { id: questionId },
      data: { userAnswer: answer, isCorrect },
    });

    res.json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    });
  } catch (error) {
    res.status(500).json({ error: 'Cevap kaydedilemedi.' });
  }
};

// POST /api/exam/:sessionId/finish — Sınavı bitir
export const finishExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessionId = getSingleParam(req.params.sessionId);

    if (!sessionId) {
      res.status(400).json({ error: 'Geçersiz sınav kimliği.' });
      return;
    }

    const questions = await prisma.examQuestion.findMany({ where: { sessionId } });
    const correctCount = questions.filter((q) => q.isCorrect === true).length;
    const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

    const session = await prisma.examSession.update({
      where: { id: sessionId },
      data: { correctAnswers: correctCount, score, completed: true },
      include: { questions: true },
    });

    res.json({ session, score, correctCount, total: questions.length });
  } catch (error) {
    res.status(500).json({ error: 'Sınav tamamlanamadı.' });
  }
};

// GET /api/exam/history — Geçmiş sınavlar
export const getExamHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessions = await prisma.examSession.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { questions: true },
    });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Geçmiş sınavlar alınamadı.' });
  }
};
