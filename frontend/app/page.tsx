'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { Zap, MessageSquare, BookOpen, Camera, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/chat');
  }, [user, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
          <Zap size={14} />
          Gemini 2.5 Flash ile güçlendirildi
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="gradient-text">EEE</span>{' '}
          <span style={{ color: 'var(--text-primary)' }}>Chat</span>
        </h1>
        <p className="text-xl mb-4" style={{ color: '#94a3b8' }}>
          Elektrik-Elektronik Mühendisliği AI Asistanı
        </p>
        <p className="text-base mb-12 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
          Devre şemalarını analiz eder, formülleri çözer, sınav soruları üretir.
          Tüm geçmişini hatırlar.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Camera, title: 'Fotoğraf Analizi', desc: 'Devre şeması veya formül fotoğrafı yükle, AI analiz etsin' },
            { icon: MessageSquare, title: 'Akıllı Sohbet', desc: 'Geçmişi hatırlayan, LaTeX formüller render eden chat' },
            { icon: BookOpen, title: 'Sınav Modu', desc: 'Konu seçip otomatik çoktan seçmeli soru üret' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 text-left hover:border-indigo-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(99,102,241,0.2)' }}>
                <Icon size={20} style={{ color: '#a5b4fc' }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 24px rgba(99,102,241,0.4)' }}>
            Ücretsiz Başla <ArrowRight size={18} />
          </Link>
          <Link href="/login"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105 glass"
            style={{ color: 'var(--text-primary)' }}>
            Giriş Yap
          </Link>
        </div>
      </div>
    </main>
  );
}
