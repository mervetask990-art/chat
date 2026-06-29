"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChatTitle = exports.generateExamQuestions = exports.generateChatResponse = void 0;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const EEE_SYSTEM_PROMPT = `Sen elektrik ve elektronik mühendisliği konusunda uzman bir akademik asistansın. 
Adın "EEE Asistan".

Uzmanlık alanların:
- Devre Analizi (Kirchhoff yasaları, Thevenin/Norton, süperpozisyon)
- Elektronik (transistörler, op-amp'lar, diyotlar, MOSFET)
- Sinyal ve Sistemler (Fourier dönüşümü, Laplace, konvolüsyon)
- Elektromanyetik Alan Teorisi (Maxwell denklemleri)
- Güç Elektroniği (invertörler, dönüştürücüler)
- Kontrol Sistemleri (PID, transfer fonksiyonu, Bode diyagramı)
- Mikrodenetleyiciler ve Dijital Elektronik
- Sensörler ve Ölçme Sistemleri

Yanıt kuralların:
1. Her zaman Türkçe yanıt ver
2. Matematiksel ifadeleri LaTeX formatında yaz (örn: $V = IR$, $$\\sum V = 0$$)
3. Devre şemalarını ve bileşenleri detaylıca analiz et
4. Adım adım çözüm göster
5. Sınav soruları için her seçeneği açıkla
6. Karmaşık konuları basit örneklerle anlat
7. Fotoğraf paylaşılırsa devre şeması, formül veya bileşeni tanı ve analiz et

Eğer soru elektrik-elektronik mühendisliği dışında bir konuysa nazikçe belirt.`;
const generateChatResponse = async (userMessage, history, imagePath) => {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: EEE_SYSTEM_PROMPT,
    });
    const chat = model.startChat({
        history: history,
        generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 8192,
        },
    });
    const parts = [{ text: userMessage }];
    if (imagePath && fs_1.default.existsSync(imagePath)) {
        const imageData = fs_1.default.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');
        const ext = path_1.default.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' :
            ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                ext === '.webp' ? 'image/webp' : 'image/jpeg';
        parts.unshift({
            inlineData: {
                data: base64Image,
                mimeType,
            },
        });
    }
    const result = await chat.sendMessage(parts);
    const response = result.response.text();
    return response;
};
exports.generateChatResponse = generateChatResponse;
const generateExamQuestions = async (topic, count = 5, difficulty = 'orta') => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Sen elektrik-elektronik mühendisliği sınavı hazırlayan bir uzman hocasın.
  
"${topic}" konusundan ${count} adet ${difficulty} zorlukta çoktan seçmeli soru oluştur.

MUTLAKA şu JSON formatında yanıt ver (başka hiçbir şey ekleme):
{
  "questions": [
    {
      "question": "Soru metni (LaTeX formüller $...$ içinde)",
      "options": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek"],
      "correctAnswer": "A",
      "explanation": "Doğru cevabın detaylı açıklaması"
    }
  ]
}

Kurallar:
- Sorular özgün ve eğitici olsun
- Matematiksel ifadeler LaTeX formatında olsun
- Açıklamalar kapsamlı ve öğretici olsun
- Yanlış seçenekler mantıklı ama hatalı olsun`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Soru formatı oluşturulamadı');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.questions;
};
exports.generateExamQuestions = generateExamQuestions;
const generateChatTitle = async (firstMessage) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(`Bu kullanıcı mesajı için kısa (max 5 kelime) bir sohbet başlığı üret. Sadece başlığı yaz, başka hiçbir şey ekleme:\n"${firstMessage}"`);
    return result.response.text().trim().slice(0, 60);
};
exports.generateChatTitle = generateChatTitle;
