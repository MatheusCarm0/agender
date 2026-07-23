import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgenderLogo } from '@/components/logo';

/**
 * Página de documento legal (Termos / Privacidade). Server component: lê o
 * markdown de docs/legal/ (fonte única, revisada juridicamente lá) e renderiza
 * com os tokens do design system. Em build de produção a página é estática —
 * o arquivo só precisa existir em build time.
 */

function readLegalDoc(file: string): string {
  const candidates = [
    path.join(process.cwd(), 'docs', 'legal', file),
    path.join(process.cwd(), '..', '..', 'docs', 'legal', file),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return (
        fs
          .readFileSync(p, 'utf-8')
          // O comentário de rascunho no topo é nota interna de engenharia —
          // não deve aparecer na página pública (react-markdown renderiza
          // HTML cru como texto literal).
          .replace(/<!--[\s\S]*?-->/g, '')
          // Links entre os documentos apontam para os .md no repo; na web
          // viram as rotas publicadas.
          .replace(/\.\/politica-de-privacidade\.md/g, '/privacidade')
          .replace(/\.\/termos-de-uso\.md/g, '/termos')
          .trim()
      );
    }
  }
  throw new Error(`Documento legal não encontrado: ${file}`);
}

const mdComponents = {
  h1: (props: React.ComponentProps<'h1'>) => (
    <h1 className="text-3xl font-semibold text-text-strong mt-2 mb-4" {...props} />
  ),
  h2: (props: React.ComponentProps<'h2'>) => (
    <h2 className="text-xl font-semibold text-text-strong mt-8 mb-3" {...props} />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3 className="text-base font-semibold text-text-strong mt-6 mb-2" {...props} />
  ),
  p: (props: React.ComponentProps<'p'>) => (
    <p className="text-sm text-text-default leading-relaxed mb-3" {...props} />
  ),
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul className="list-disc pl-5 space-y-1 text-sm text-text-default mb-3" {...props} />
  ),
  ol: (props: React.ComponentProps<'ol'>) => (
    <ol className="list-decimal pl-5 space-y-1 text-sm text-text-default mb-3" {...props} />
  ),
  a: (props: React.ComponentProps<'a'>) => (
    <a className="text-primary-default hover:text-primary-hover font-medium" {...props} />
  ),
  strong: (props: React.ComponentProps<'strong'>) => (
    <strong className="font-semibold text-text-strong" {...props} />
  ),
  blockquote: (props: React.ComponentProps<'blockquote'>) => (
    <blockquote
      className="border-l-2 border-border-strong pl-3 text-sm text-text-muted mb-3"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border-default" />,
  table: (props: React.ComponentProps<'table'>) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<'th'>) => (
    <th
      className="text-left font-semibold text-text-strong border border-border-default px-3 py-2 bg-surface-subtle"
      {...props}
    />
  ),
  td: (props: React.ComponentProps<'td'>) => (
    <td className="text-text-default border border-border-default px-3 py-2 align-top" {...props} />
  ),
  code: (props: React.ComponentProps<'code'>) => (
    <code className="font-mono text-xs bg-surface-subtle px-1 py-0.5 rounded" {...props} />
  ),
};

export function LegalDocPage({ file }: { file: string }) {
  const markdown = readLegalDoc(file);

  return (
    <div className="min-h-screen bg-surface-app">
      <header className="border-b border-border-default bg-surface-card">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" aria-label="Agender">
            <AgenderLogo />
          </Link>
          <Link
            href="/login"
            className="text-sm text-primary-default hover:text-primary-hover font-medium"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6 bg-info-bg border border-info-fg/20 rounded-[var(--radius-md)] px-4 py-3">
          <p className="text-xs text-info-text">
            Versão em fase de testes: os campos entre chaves (ex.:{' '}
            <code className="font-mono">{'{{RAZAO_SOCIAL}}'}</code>) serão preenchidos com os
            dados finais da empresa antes do lançamento.
          </p>
        </div>

        <article>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {markdown}
          </ReactMarkdown>
        </article>

        <footer className="mt-12 pt-6 border-t border-border-default flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-subtle">
          <Link href="/termos" className="hover:text-text-muted">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-text-muted">Política de Privacidade</Link>
          <Link href="/faq" className="hover:text-text-muted">Perguntas frequentes</Link>
          <span className="ml-auto">© {new Date().getFullYear()} Agender</span>
        </footer>
      </main>
    </div>
  );
}
