'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { chatsApi } from '@/lib/api';
import { Send, ImagePlus, X, Loader2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDropzone } from 'react-dropzone';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  imageName?: string;
  createdAt: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
        <Zap size={14} className="text-white" />
      </div>
      <div className="message-ai px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="typing-dot w-2 h-2 rounded-full"
            style={{ background: '#6366f1' }} />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg, apiUrl }: { msg: Message; apiUrl: string }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-start gap-3 fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold`}
        style={{ background: isUser ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
        {isUser ? 'S' : <Zap size={14} />}
      </div>

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Image if present */}
        {msg.imageUrl && (
          <Image
            src={`${apiUrl}${msg.imageUrl}`}
            alt={msg.imageName || 'Yüklenen görsel'}
            width={320}
            height={240}
            unoptimized
            className="rounded-xl max-w-xs max-h-64 object-cover mb-1"
            style={{ border: '1px solid var(--border)' }}
          />
        )}
        {/* Content */}
        {msg.content && (
          <div className={`px-4 py-3 text-sm ${isUser ? 'message-user text-white' : 'message-ai'}`}>
            {isUser ? (
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
            ) : (
              <div className="prose-eee">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
        <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
          {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing chat
  useEffect(() => {
    if (!chatId) {
      return;
    }

    let cancelled = false;

    const loadChat = async () => {
      setLoadingChat(true);
      try {
        const res = await chatsApi.getById(chatId);
        if (!cancelled) {
          setMessages(res.data.chat.messages);
        }
      } catch {
        if (!cancelled) {
          router.push('/chat');
        }
      } finally {
        if (!cancelled) {
          setLoadingChat(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadChat();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [chatId, router]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Dropzone
  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noClick: true,
  });

  const removeImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !image) || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      imageUrl: undefined,
      imageName: image?.name,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const sentInput = input;
    const sentImage = image;
    setInput('');
    removeImage();
    setSending(true);

    try {
      const res = await chatsApi.sendMessage(chatId, sentInput, sentImage || undefined);
      const { userMessage, assistantMessage } = res.data;
      setMessages((prev) => [
        ...prev.slice(0, -1), // remove optimistic
        { ...userMessage },
        assistantMessage,
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '⚠️ Bir hata oluştu. Lütfen tekrar deneyin.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loadingChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: '#6366f1' }} size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.15)', border: '2px dashed #6366f1' }}>
          <div className="text-center">
            <ImagePlus size={48} style={{ color: '#6366f1' }} className="mx-auto mb-2" />
            <p className="text-lg font-semibold" style={{ color: '#a5b4fc' }}>Fotoğrafı bırak</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pt-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Zap size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 gradient-text">EEE Asistan</h2>
            <p className="text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
              Devre şeması, formül veya elektronik bileşen fotoğrafı yükle ya da sorunuzu yazın.
              LaTeX formüller desteklenir.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-8 max-w-lg">
              {[
                '📐 Kirchhoff yasalarını açıkla',
                '⚡ RC devresinin zaman sabitini hesapla',
                '🔧 Bu transistör devresi nasıl çalışır?',
                '📚 Fourier dönüşümü nedir?',
              ].map((s) => (
                <button key={s} onClick={() => setInput(s.slice(3))}
                  className="text-left px-4 py-3 rounded-xl text-sm glass hover:border-indigo-500/40 transition-all"
                  style={{ color: '#94a3b8' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} apiUrl={apiUrl} />
        ))}

        {sending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border)', background: 'rgba(15,23,42,0.9)' }}>
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <Image src={imagePreview} alt="preview" width={80} height={80} unoptimized
              className="h-20 w-20 rounded-lg object-cover"
              style={{ border: '1px solid var(--border)' }} />
            <button onClick={removeImage}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#ef4444' }}>
              <X size={10} className="text-white" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl p-3"
          style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid var(--border)' }}>
          {/* Image upload button */}
          <label className="cursor-pointer p-2 rounded-xl transition-colors hover:bg-white/10 flex-shrink-0"
            style={{ color: image ? '#a5b4fc' : 'var(--text-muted)' }}
            title="Fotoğraf yükle">
            <ImagePlus size={20} />
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setImage(f); setImagePreview(URL.createObjectURL(f)); }
              }} />
          </label>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sorunuzu yazın veya fotoğraf yükleyin... (Shift+Enter: yeni satır)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)', minHeight: '24px', maxHeight: '160px' }}
          />

          {/* Send button */}
          <button
            id="send-btn"
            onClick={sendMessage}
            disabled={(!input.trim() && !image) || sending}
            className="p-2 rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            {sending
              ? <Loader2 size={18} className="text-white animate-spin" />
              : <Send size={18} className="text-white" />}
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          EEE Asistan hata yapabilir. Önemli konularda ders notlarınızla doğrulayın.
        </p>
      </div>
    </div>
  );
}
