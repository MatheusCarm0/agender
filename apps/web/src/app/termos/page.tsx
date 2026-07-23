import { LegalDocPage } from '@/components/legal-doc';

export const metadata = {
  title: 'Termos de Uso — Agender',
  description: 'Termos de Uso da plataforma de agendamento Agender.',
};

export default function TermosPage() {
  return <LegalDocPage file="termos-de-uso.md" />;
}
