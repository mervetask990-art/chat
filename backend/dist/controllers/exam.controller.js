"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamHistory = exports.finishExam = exports.submitAnswer = exports.startExam = exports.getTopics = void 0;
const client_1 = require("@prisma/client");
const gemini_service_1 = require("../services/gemini.service");
const prisma = new client_1.PrismaClient();
const getSingleParam = (value) => {
    if (Array.isArray(value))
        return value[0];
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
const getTopics = async (req, res) => {
    res.json({ topics: EEE_TOPICS });
};
exports.getTopics = getTopics;
// POST /api/exam/start — Yeni sınav oturumu başlat
const startExam = async (req, res) => {
    try {
        const { topic, count = 5, difficulty = 'orta' } = req.body;
        if (!topic) {
            res.status(400).json({ error: 'Konu seçimi zorunludur.' });
            return;
        }
        // Soruları Gemini ile üret
        const questions = await (0, gemini_service_1.generateExamQuestions)(topic, count, difficulty);
        // Sınav oturumu oluştur
        const session = await prisma.examSession.create({
            data: {
                userId: req.userId,
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
    }
    catch (error) {
        console.error('Start exam error:', error);
        res.status(500).json({ error: 'Sınav başlatılamadı.' });
    }
};
exports.startExam = startExam;
// POST /api/exam/:sessionId/answer — Cevap gönder
const submitAnswer = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Cevap kaydedilemedi.' });
    }
};
exports.submitAnswer = submitAnswer;
// POST /api/exam/:sessionId/finish — Sınavı bitir
const finishExam = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Sınav tamamlanamadı.' });
    }
};
exports.finishExam = finishExam;
// GET /api/exam/history — Geçmiş sınavlar
const getExamHistory = async (req, res) => {
    try {
        const sessions = await prisma.examSession.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
            include: { questions: true },
        });
        res.json({ sessions });
    }
    catch (error) {
        res.status(500).json({ error: 'Geçmiş sınavlar alınamadı.' });
    }
};
exports.getExamHistory = getExamHistory;
