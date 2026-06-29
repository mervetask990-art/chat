'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';
import { examApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  BookOpen, Play, CheckCircle2, XCircle,
  Trophy, RotateCcw, ChevronRight, Loader2, Star
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

interface Session {
  id: string;
  topic: string;
  questions: Question[];
}

type Difficulty = 'kolay' | 'orta' | 'zor';
type Phase = 'setup' | 'quiz' | 'result';

const DIFF_LABELS: Record<Difficulty, string> = {
  kolay: '🟢 Kolay',
  orta: '🟡 Orta',
  zor: '🔴 Zor',
};

export default function ExamPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('orta');
  const [phase, setPhase] = useState<Phase>('setup');
  const [session, setSession] = useState<Session | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    examApi.getTopics().then((res) => {
      setTopics(res.data.topics);
      setSelectedTopic(res.data.topics[0]);
    });
  }, [user, router]);

  const startExam = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    try {
      const res = await examApi.start({ topic: selectedTopic, count, difficulty });
      setSession(res.data.session);
      setCurrentQ(0);
      setSelected(null);
      setAnswered(false);
      setPhase('quiz');
    } catch {
      alert('Sınav başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selected || !session || answered) return;
    const question = session.questions[currentQ];
    await examApi.submitAnswer(session.id, { questionId: question.id, answer: selected });
    setAnswered(true);
    // Update local state
    setSession((prev) => prev ? {
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === currentQ ? { ...q, userAnswer: selected, isCorrect: selected === q.correctAnswer } : q
      ),
    } : prev);
  };

  const nextQuestion = () => {
    if (!session) return;
    if (currentQ < session.questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await examApi.finish(session.id);
      setResult(res.data);
      setPhase('result');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhase('setup');
    setSession(null);
    setResult(null);
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
  };

  if (!user) return null;

  const question = session?.questions[currentQ];
  const progress = session ? ((currentQ + (answered ? 1 : 0)) / session.questions.length) * 100 : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">

          {/* SETUP PHASE */}
          {phase === 'setup' && (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <BookOpen size={20} className="text-white" />
                  </div>
                  <h1 className="text-3xl font-bold gradient-text">Sınav Modu</h1>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Konu ve zorluk seç, Gemini AI sana özel sorular üretsin
                </p>
              </div>

              <div className="glass rounded-2xl p-6 space-y-6">
                {/* Topic */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>
                    Konu Seç
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {topics.map((t) => (
                      <button key={t} onClick={() => setSelectedTopic(t)}
                        className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left"
                        style={{
                          background: selectedTopic === t ? 'rgba(99,102,241,0.3)' : 'rgba(30,41,59,0.6)',
                          border: selectedTopic === t ? '1px solid #6366f1' : '1px solid var(--border)',
                          color: selectedTopic === t ? '#a5b4fc' : '#64748b',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>
                    Soru Sayısı: <span style={{ color: '#a5b4fc' }}>{count}</span>
                  </label>
                  <input type="range" min={3} max={15} step={1} value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>3</span><span>15</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>Zorluk</label>
                  <div className="flex gap-2">
                    {(['kolay', 'orta', 'zor'] as Difficulty[]).map((d) => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: difficulty === d ? 'rgba(99,102,241,0.3)' : 'rgba(30,41,59,0.6)',
                          border: difficulty === d ? '1px solid #6366f1' : '1px solid var(--border)',
                          color: difficulty === d ? '#a5b4fc' : '#64748b',
                        }}>
                        {DIFF_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={startExam} disabled={loading || !selectedTopic}
                  className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                  {loading ? 'Sorular hazırlanıyor...' : `${count} Soru ile Başla`}
                </button>
              </div>
            </>
          )}

          {/* QUIZ PHASE */}
          {phase === 'quiz' && question && session && (
            <>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2" style={{ color: '#94a3b8' }}>
                  <span>{session.topic}</span>
                  <span>{currentQ + 1} / {session.questions.length}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(99,102,241,0.2)' }}>
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                </div>
              </div>

              {/* Question Card */}
              <div className="glass rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                    Soru {currentQ + 1}
                  </span>
                </div>
                <div className="prose-eee text-sm mb-6">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {question.question}
                  </ReactMarkdown>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {question.options.map((opt) => {
                    const letter = opt[0]; // "A", "B", ...
                    const isSelected = selected === letter;
                    const isCorrect = answered && letter === question.correctAnswer;
                    const isWrong = answered && isSelected && letter !== question.correctAnswer;

                    return (
                      <button key={opt} onClick={() => !answered && setSelected(letter)}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          background: isCorrect ? 'rgba(16,185,129,0.2)' : isWrong ? 'rgba(239,68,68,0.2)' : isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(30,41,59,0.6)',
                          border: isCorrect ? '1px solid #10b981' : isWrong ? '1px solid #ef4444' : isSelected ? '1px solid #6366f1' : '1px solid var(--border)',
                          color: isCorrect ? '#6ee7b7' : isWrong ? '#fca5a5' : isSelected ? '#a5b4fc' : '#94a3b8',
                          cursor: answered ? 'default' : 'pointer',
                        }}>
                        <div className="flex items-center gap-2">
                          {answered && isCorrect && <CheckCircle2 size={16} style={{ color: '#10b981' }} />}
                          {answered && isWrong && <XCircle size={16} style={{ color: '#ef4444' }} />}
                          <span>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {answered && question.explanation && (
                  <div className="mt-4 p-4 rounded-xl fade-in"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#a5b4fc' }}>📖 Açıklama</p>
                    <div className="prose-eee text-sm">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {question.explanation}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {!answered ? (
                  <button onClick={submitAnswer} disabled={!selected}
                    className="flex-1 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    Cevapla
                  </button>
                ) : (
                  <button onClick={nextQuestion}
                    className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {currentQ < session.questions.length - 1 ? 'Sonraki Soru' : 'Sonuçları Gör'}
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </>
          )}

          {/* RESULT PHASE */}
          {phase === 'result' && result && session && (
            <div className="text-center">
              <div className="glass rounded-3xl p-8 mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: `radial-gradient(circle, ${getScoreColor(result.score)}33 0%, transparent 70%)`, border: `3px solid ${getScoreColor(result.score)}` }}>
                  <Trophy size={40} style={{ color: getScoreColor(result.score) }} />
                </div>
                <h2 className="text-4xl font-bold mb-1" style={{ color: getScoreColor(result.score) }}>
                  %{Math.round(result.score)}
                </h2>
                <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {result.correctCount} / {result.total} Doğru
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{session.topic}</p>

                {result.score >= 80 && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-yellow-400">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-semibold">Mükemmel! Bu konuya hakimsin.</span>
                    <Star size={16} fill="currentColor" />
                  </div>
                )}
                {result.score >= 60 && result.score < 80 && (
                  <p className="text-sm mb-4" style={{ color: '#f59e0b' }}>İyi gidiyorsun! Biraz daha pratik yapabilirsin.</p>
                )}
                {result.score < 60 && (
                  <p className="text-sm mb-4" style={{ color: '#ef4444' }}>Bu konuyu tekrar çalışmanı öneririm.</p>
                )}

                {/* Question review */}
                <div className="text-left space-y-2 mt-4">
                  {session.questions.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-3 px-4 py-2 rounded-xl"
                      style={{ background: q.isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                      {q.isCorrect
                        ? <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                        : <XCircle size={16} style={{ color: '#ef4444' }} />}
                      <span className="text-xs flex-1 truncate" style={{ color: '#94a3b8' }}>
                        Soru {i + 1}: {q.question.slice(0, 60)}...
                      </span>
                      <span className="text-xs font-bold" style={{ color: q.isCorrect ? '#10b981' : '#ef4444' }}>
                        {q.userAnswer || '—'} {!q.isCorrect && `(${q.correctAnswer})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 glass hover:border-indigo-500/40 transition-all"
                  style={{ color: 'var(--text-primary)' }}>
                  <RotateCcw size={16} /> Yeni Sınav
                </button>
                <button onClick={() => { reset(); setSelectedTopic(session.topic); setTimeout(startExam, 100); }}
                  className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Play size={16} /> Aynı Konuyu Tekrar
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
