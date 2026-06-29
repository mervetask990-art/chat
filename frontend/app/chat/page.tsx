'use client';
import { useRouter } from 'next/navigation';
import { chatsApi } from '@/lib/api';
import { Zap, ArrowRight, Camera, Calculator, BookOpen, Cpu } from 'lucide-react';

const suggestions = [
  { icon: Calculator, text: 'Kirchhoff akım ve gerilim yasalarını açıkla', category: 'Devre' },
  { icon: Camera, text: 'Bu devre şemasını analiz et (fotoğraf yükle)', category: 'Görsel' },
  { icon: BookOpen, text: 'Fourier dönüşümünün temel özelliklerini listele', category: 'Sinyal' },
  { icon: Cpu, text: 'MOSFET ve BJT transistörlerin farkları nedir?', category: 'Elektronik' },
];

export default function NewChatPage() {
  const router = useRouter();

  const startChat = async (message?: string) => {
    try {
      const res = await chatsApi.create();
      const chatId = res.data.chat.id;
      if (message) {
        // Redirect to chat page, message will be in state
        router.push(`/chat/${chatId}?start=${encodeURIComponent(message)}`);
      } else {
        router.push(`/chat/${chatId}`);
      }
    } catch {
      console.error('Chat oluşturulamadı');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 h-screen"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl text-center">
        {/* Hero */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
          <Zap size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2 gradient-text">EEE Asistan</h1>
        <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
          Yeni bir sohbet başlatmak için aşağıdan seç veya direkt yaz
        </p>

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {suggestions.map(({ icon: Icon, text, category }) => (
            <button key={text} onClick={() => startChat(text)}
              className="glass rounded-xl p-4 text-left hover:border-indigo-500/50 transition-all group">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.2)' }}>
                  <Icon size={16} style={{ color: '#a5b4fc' }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#a5b4fc' }}>{category}</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>{text}</p>
                </div>
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                  style={{ color: '#6366f1' }} />
              </div>
            </button>
          ))}
        </div>

        <button onClick={() => startChat()}
          className="px-8 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
          Yeni Boş Sohbet Başlat
        </button>
      </div>
    </div>
  );
}
