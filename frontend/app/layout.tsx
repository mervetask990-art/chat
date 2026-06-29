import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EEE Chat — Elektrik Elektronik Mühendisliği AI Asistanı',
  description:
    'Gemini 2.5 Flash destekli, devre şeması analizi yapabilen, sınava hazırlık için EEE AI asistanı.',
  keywords: ['elektrik', 'elektronik', 'mühendislik', 'AI', 'chat', 'sınav'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
        />
      </head>
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
