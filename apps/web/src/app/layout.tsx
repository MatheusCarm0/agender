import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono, Inter, Poppins, Playfair_Display, DM_Sans, Montserrat, Raleway, Lora, Nunito, Space_Grotesk, Cormorant_Garamond } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';
import { SITE_URL } from '@/lib/site';

// Microsoft Clarity (heatmaps, scroll, dead/rage clicks, session replay).
// O Project ID é público (fica no HTML do cliente), mas vem por env para não
// ativar em dev/local sem querer. Definido no build do web (Dockerfile/compose).
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
});

const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
});

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
});

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: '--font-cormorant',
  weight: ['400', '500', '600'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Base para resolver URLs relativas (canonical, OpenGraph, sitemap).
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Agender — Agendamento online lindo e no automático',
    // Páginas internas viram "Título | Agender".
    template: '%s | Agender',
  },
  description:
    'Página de agendamento personalizada, lembretes automáticos que acabam com o no-show e pagamento no PIX. Monte sua agenda online em minutos.',
  applicationName: 'Agender',
  robots: { index: true, follow: true },
  openGraph: {
    siteName: 'Agender',
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} ${playfairDisplay.variable} ${dmSans.variable} ${montserrat.variable} ${raleway.variable} ${lora.variable} ${nunito.variable} ${spaceGrotesk.variable} ${cormorantGaramond.variable}`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
        {CLARITY_ID && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
          </Script>
        )}
      </body>
    </html>
  );
}
