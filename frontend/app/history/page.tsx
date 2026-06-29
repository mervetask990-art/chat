'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';
import { chatsApi } from '@/lib/api';
import { MessageSquare, Trash2, Clock, Hash, Search } from 'lucide-react';
import Link from 'next/link';

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  _count: { messages: number };
  messages: Array<{ content: string; createdAt: string }>;
}

export default function HistoryPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    chatsApi.getAll()
      .then((res) => setChats(res.data.chats))
      .finally(() => setLoading(false));
  }, [user, router]);

  const deleteChat = async (id: string) => {
    await chatsApi.delete(id);
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Chat[]>>((acc, chat) => {
    const date = new Date(chat.updatedAt).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(chat);
    return acc;
  }, {});

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">Geçmiş Sohbetler</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {chats.length} sohbet • Tüm konuşmalarınız burada saklanır
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sohbet ara..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(30,41,59,0.6)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="glass rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" style={{ color: '#6366f1' }} />
              <p style={{ color: 'var(--text-muted)' }}>
                {search ? 'Arama sonucu bulunamadı' : 'Henüz sohbet yok'}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, dayChats]) => (
              <div key={date} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>{date}</p>
                </div>
                <div className="space-y-2">
                  {dayChats.map((chat) => (
                    <Link key={chat.id} href={`/chat/${chat.id}`}
                      className="group glass rounded-xl p-4 flex items-center gap-4 hover:border-indigo-500/40 transition-all block">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.2)' }}>
                        <MessageSquare size={18} style={{ color: '#a5b4fc' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm" style={{ color: 'var(--text-primary)' }}>
                          {chat.title}
                        </p>
                        {chat.messages?.[0] && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {chat.messages[0].content.slice(0, 100)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Hash size={12} />
                          {chat._count.messages}
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); deleteChat(chat.id); }}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:text-red-400 transition-all"
                          style={{ color: 'var(--text-muted)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
