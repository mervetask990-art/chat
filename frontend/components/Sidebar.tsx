'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { chatsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  MessageSquare, Plus, Trash2, History, BookOpen,
  Zap, LogOut, ChevronLeft, ChevronRight, User
} from 'lucide-react';

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      const res = await chatsApi.getAll();
      setChats(res.data.chats);
    } catch {}
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadChats();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadChats, pathname]);

  const createNewChat = async () => {
    setLoading(true);
    try {
      const res = await chatsApi.create();
      router.push(`/chat/${res.data.chat.id}`);
    } catch {}
    finally { setLoading(false); }
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await chatsApi.delete(id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (pathname === `/chat/${id}`) router.push('/chat');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 relative flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '260px',
        background: 'rgba(15,23,42,0.95)',
        borderRight: '1px solid var(--border)',
      }}>
      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: '#1e293b', border: '1px solid var(--border)', color: '#94a3b8' }}>
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Logo */}
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && <span className="font-bold gradient-text text-lg">EEE Chat</span>}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          id="new-chat-btn"
          onClick={createNewChat}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Plus size={16} className="flex-shrink-0" />
          {!collapsed && 'Yeni Sohbet'}
        </button>
      </div>

      {/* Nav Links */}
      <div className="px-3 mb-2">
        {[
          { href: '/history', icon: History, label: 'Geçmiş' },
          { href: '/exam', icon: BookOpen, label: 'Sınav Modu' },
        ].map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all
              ${pathname.startsWith(href)
                ? 'text-indigo-300'
                : 'hover:bg-white/5'}
            `}
            style={{
              color: pathname.startsWith(href) ? '#a5b4fc' : '#64748b',
              background: pathname.startsWith(href) ? 'rgba(99,102,241,0.15)' : 'transparent',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && label}
          </Link>
        ))}
      </div>

      {/* Chat List */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2"
            style={{ color: 'var(--text-muted)' }}>
            Son Sohbetler
          </p>
          {chats.length === 0 && (
            <p className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
              Henüz sohbet yok
            </p>
          )}
          {chats.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.id}`}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-1 transition-all
                ${pathname === `/chat/${chat.id}` ? 'text-indigo-300' : ''}`}
              style={{
                color: pathname === `/chat/${chat.id}` ? '#a5b4fc' : '#94a3b8',
                background: pathname === `/chat/${chat.id}` ? 'rgba(99,102,241,0.15)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (pathname !== `/chat/${chat.id}`)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (pathname !== `/chat/${chat.id}`)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}>
              <MessageSquare size={14} className="flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{chat.title}</span>
              <button onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* User + Logout */}
      <div className="p-3 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.2)' }}>
            <User size={14} style={{ color: '#a5b4fc' }} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Çıkış Yap">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
