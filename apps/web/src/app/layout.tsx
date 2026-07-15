import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agenda',
  description: 'Plataforma de agendamento online',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
