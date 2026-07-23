import { LegalDocPage } from '@/components/legal-doc';

export const metadata = {
  title: 'Política de Privacidade — Agender',
  description: 'Política de Privacidade (LGPD) da plataforma de agendamento Agender.',
};

export default function PrivacidadePage() {
  return <LegalDocPage file="politica-de-privacidade.md" />;
}
