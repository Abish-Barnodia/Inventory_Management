import { UI_CONTENT } from './../lib/content';
import './global.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: UI_CONTENT.metadata.title,
  description: UI_CONTENT.metadata.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="relative flex min-h-screen flex-col">
          <div className="flex-1 flex-grow">{children}</div>
        </main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
