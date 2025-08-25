## Melhoria sugeridas para AquaHub

Este documento consolida oportunidades de melhoria identificadas por leitura estática do código (sem execução). Priorize itens de Segurança e Bugs antes dos demais.

### 1) Segurança
- Ativar verificação de JWT nas Edge Functions do Supabase
  - No `supabase/config.toml`, trocar para `verify_jwt = true` e validar claims/roles no handler.
- Carregar URL e chave anon do Supabase via variáveis de ambiente
  - Evitar hardcode no cliente. Usar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e consumir em `src/integrations/supabase/client.ts`.
- Definir Content-Security-Policy (CSP) no `index.html`
  - Exemplo básico (ajustar domínios conforme uso real):
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'">
  ```
- Desabilitar tráfego claro no Capacitor
  - Em `capacitor.config.ts`, remover/definir `cleartext: false` em produção.
- Minimizar risco de XSS com tokens no `localStorage`
  - Manter CSP rigorosa; evitar `dangerouslySetInnerHTML` sem sanitização; considerar (futuro) fluxo com cookies httpOnly via backend próprio.

### 2) Bugs e inconsistências
- Corrigir `__dirname` em `vite.config.ts` (projeto é ESM)
  - Usar `fileURLToPath`:
  ```ts
  import { fileURLToPath } from 'url';
  import { dirname } from 'path';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  ```
- Proteger rotas sensíveis
  - Criar um wrapper `PrivateRoute` e usá-lo em `/dashboard`, `/farm`, etc.
  ```tsx
  const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? children : <Navigate to="/home" replace />;
  };
  ```
- Usar `<Link>` no 404 em vez de `<a>`
  - Evita full reload; melhora UX SPA.

### 3) Tipagem, Lint e Qualidade
- Ativar TypeScript estrito e regras que evitam esconder erros
  - Ajustes recomendados em `tsconfig.app.json`/`tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "strictNullChecks": true,
      "allowJs": false
    }
  }
  ```
- Reativar `@typescript-eslint/no-unused-vars` (com exceção a prefixo `_`)
- Adicionar `eslint-plugin-jsx-a11y` para acessibilidade básica
- Tipar consultas do Supabase com `Database[...]` nos hooks sempre que possível

### 4) Performance e UX
- Code-splitting por rota
  - Trocar imports diretos por `React.lazy`/`Suspense` em `src/App.tsx`.
  ```tsx
  const Dashboard = lazy(() => import('./pages/Dashboard'));
  // ...
  <Suspense fallback={<Skeleton/>}>
    <Route path="/dashboard" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
  </Suspense>
  ```
- Otimizar cálculos do Dashboard
  - Evitar `.sort()` a cada render; computar “latest” em O(n) ou retornar já ordenado do SQL; memorizar dados derivados por chave estável.
- Dividir arquivos muito grandes em subcomponentes/hooks
  - Ex.: `PondHistory.tsx`, `FeedingSchedule.tsx`, `HarvestTab.tsx`, etc.
- React Query: definir `defaultOptions` globais no `QueryClient`
  ```ts
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  ```
- Unificar sistema de toasts
  - Escolher entre `sonner` e `toaster` para evitar duplicidade e peso de bundle.
- Considerar `React.StrictMode` no `main.tsx` (apenas dev)

### 5) Tailwind e CSS
- Reduzir globs de conteúdo do Tailwind
  - Em `tailwind.config.ts`, manter apenas caminhos reais (p.ex. `./src/**/*.{ts,tsx}`) para acelerar build/purge.
- Avaliar necessidade de `safelist` e remover utilitários não usados

### 6) Build, Tooling e DX
- Padronizar gerenciador de pacotes
  - Remover lockfile que não será usado (`bun.lockb` ou `package-lock.json`), mantendo um único fluxo (npm/pnpm/bun).
- Controlar versões críticas
  - Confiar no lockfile é OK; para builds móveis (Capacitor), considerar travar versões de libs sensíveis.
- Prettier + Husky
  - Adicionar Prettier e hooks de `pre-commit` para `lint`, `type-check` e `format`.
- CI
  - Pipeline com `install`, `lint`, `type-check`, `build` e, se possível, testes e2e mínimos.

### 7) Supabase (Banco e chamadas)
- Migrar chaves para `.env` (`VITE_...`) e consumir via `import.meta.env`
- Revisar consultas que usam `!inner`/filtros aninhados
  - Selecionar apenas colunas necessárias; aplicar `order/limit` no SQL para reduzir payload.
- Padronizar nomes de migrations
  - Evitar nomes em branco (e.g., `-.sql`); usar nomes descritivos e agrupadores por feature.
- Sanitizar qualquer uso de `dangerouslySetInnerHTML`
  - Garantir sanitização prévia do HTML (se mantido) e CSP adequada.

### 8) PWA e SEO
- Manifesto mais completo
  - Adicionar ícones 192/512 (maskable), `id`, `scope` e `shortcuts`.
- `vite-plugin-pwa`
  - Se desejar offline/caching; definir estratégia de cache e atualização (`workbox`).
- Meta tags adicionais
  - `<meta name="theme-color">` coerente com manifest; checar `robots.txt` para ambientes.

### 9) Acessibilidade (a11y)
- Garantir labels e nomes acessíveis em botões/inputs
- Manter foco visível (não remover outline sem alternativa)
- Testar navegação por teclado e roles ARIA em componentes interativos

### 10) Observabilidade
- Error Boundaries
  - Envolver áreas críticas para capturar/renderizar falhas amigáveis.
- Logger centralizado
  - Padronizar logs; considerar Sentry/Bugsnag para captura de erros em produção.

---

#### Checklist rápido (prioridade)
1. Ativar `verify_jwt` nas funções do Supabase e validar roles.
2. Mover URL/anon key do Supabase para `VITE_*` e usar `import.meta.env`.
3. Adicionar meta CSP no `index.html` e revisar `dangerouslySetInnerHTML`.
4. Desabilitar `cleartext` no `capacitor.config.ts` em produção.
5. Corrigir `vite.config.ts` para ESM (sem `__dirname` nativo).
6. Criar `PrivateRoute` e proteger rotas.
7. Habilitar TS estrito e regras `noUnused*`; remover `allowJs`.
8. Code-splitting por rota e dividir páginas/componentes muito grandes.
9. Definir `QueryClient` com `defaultOptions` e unificar toasts.
10. Padronizar gerenciador de pacotes e lockfile; revisar Tailwind `content`.

