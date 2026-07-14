# 09 — Frontend

## 🖥 Visão Geral

O frontend é uma **Single Page Application (SPA)** construída com React 18 + TypeScript, servida via Nginx no ambiente Docker.

---

## 🗂 Estrutura de Diretórios

```
frontend/
├── index.html               # Entry point HTML
├── package.json             # Dependências e scripts
├── tsconfig.json            # Configuração TypeScript
├── vite.config.ts           # Configuração Vite (proxy + build)
├── Dockerfile               # Build: npm run build → Nginx
├── nginx.conf               # Configuração do Nginx
│
└── src/
    ├── main.tsx             # Entry point React
    ├── App.tsx              # Roteamento principal (React Router v6)
    ├── index.css            # Design system: CSS vars + componentes
    │
    ├── api/
    │   ├── client.ts        # Instância Axios + interceptors JWT
    │   └── endpoints.ts     # Funções de chamada de API por domínio
    │
    ├── store/
    │   └── index.ts         # Zustand: auth persistido + UI state
    │
    ├── types/
    │   └── index.ts         # Tipos TypeScript globais (DTOs)
    │
    ├── utils/
    │   ├── format.ts        # Formatação: datas, CPF, CNPJ, etc.
    │   └── labels.ts        # Labels e badges de enums
    │
    ├── hooks/               # Hooks customizados
    │
    ├── features/            # Lógica por domínio (feature-based)
    │
    ├── components/
    │   └── layout/
    │       ├── AppLayout.tsx   # Shell principal + Auth Guard
    │       └── Sidebar.tsx     # Navegação lateral com RBAC
    │
    └── pages/
        ├── LoginPage.tsx
        ├── DashboardPage.tsx
        ├── OperationsPage.tsx
        ├── OperationFormPage.tsx
        ├── OperationDetailPage.tsx
        ├── TargetDetailPage.tsx
        ├── TargetFormPage.tsx
        ├── DeviceDetailPage.tsx
        ├── DeviceFormPage.tsx
        ├── CustodyMovementFormPage.tsx
        ├── GenerateReportPage.tsx
        ├── GeneratedReportsPage.tsx
        ├── ReportTemplatesPage.tsx
        ├── AuditPage.tsx
        ├── UsersPage.tsx
        └── UserFormPage.tsx
```

---

## 📄 Páginas do Sistema

| Página | Rota | Papel Mínimo | Descrição |
|--------|------|:------------:|-----------|
| **Login** | `/login` | — | Autenticação com usuário e senha |
| **Dashboard** | `/` | `analyst` | Painel geral com métricas do sistema |
| **Operações** | `/operations` | `analyst` | Listagem e busca de operações |
| **Nova Operação** | `/operations/new` | `admin` | Formulário de criação de operação |
| **Detalhe da Operação** | `/operations/:id` | `analyst` | Dashboard da operação: alvos, métricas, documentos, equipes |
| **Detalhe do Alvo** | `/targets/:id` | `analyst` | Dados do alvo, suas fotos, histórico e seus dispositivos |
| **Novo Alvo** | `/operations/:id/targets/new` | `custody` | Formulário de cadastro de alvo |
| **Detalhe do Dispositivo** | `/devices/:id` | `analyst` | Ficha completa: custódia (com impressão PDF), fotos, documentos, hashes |
| **Novo Dispositivo** | `/targets/:id/devices/new` | `custody` | Formulário de cadastro de dispositivo |
| **Movimentação de Custódia** | `/devices/:id/custody/new` | `custody` | Registrar nova movimentação |
| **Gerar Documento** | `/devices/:id/gerar-documento`, `/operations/:id/gerar-documento`, `/targets/:id/gerar-documento` | `expert` | Geração de documento a partir de template (DOCX/PDF) |
| **Modelos de Documento** | `/pericia/templates` | `expert` | Gerenciar templates DOCX |
| **Histórico de Documentos** | `/pericia/historico` | `expert` | Lista de laudos e documentos gerados do sistema |
| **Relatórios Estatísticos** | `/relatorios/estatisticos` | `analyst` | Visualização estatística geral do sistema (com filtro por ano) e por operação |
| **Auditoria** | `/audit` | `auditor` | Log imutável de todas as ações |
| **Usuários** | `/users` | `admin` | Gerenciar usuários e papéis |
| **Novo/Editar Usuário** | `/users/new`, `/users/:id/edit` | `admin` | Formulário de usuário |

---

## 🎨 Design System

O arquivo [`index.css`](file:///Users/edelmarsilva/Documents/cadeia-custodia/frontend/src/index.css) contém o design system completo via CSS Custom Properties:

### Paleta de Cores

```css
:root {
  --color-primary: /* Cor principal institucional */
  --color-danger: /* Vermelho para ações destrutivas */
  --color-success: /* Verde para confirmações */
  --color-warning: /* Amarelo para alertas */
  --color-bg: /* Fundo da aplicação */
  --color-surface: /* Fundo de cards e painéis */
  --color-text: /* Texto principal */
  --color-muted: /* Texto secundário */
  --color-border: /* Bordas */
}
```

### Componentes CSS Globais

O design system inclui classes para:
- Cards e painéis (`card`, `card-header`)
- Badges de status (`badge-active`, `badge-closed`, etc.)
- Botões (`btn`, `btn-primary`, `btn-danger`)
- Tabelas (`table`, `table-row`)
- Formulários (`form-group`, `input`, `select`)
- Timeline de custódia (`timeline`, `timeline-item`)

---

## 🔑 Gerenciamento de Estado (Zustand)

O arquivo [`store/index.ts`](file:///Users/edelmarsilva/Documents/cadeia-custodia/frontend/src/store/index.ts) gerencia o estado global:

```typescript
interface AuthStore {
  user: User | null           // Dados do usuário logado
  accessToken: string | null  // JWT access token
  refreshToken: string | null // JWT refresh token
  
  login(tokens, user): void   // Persiste autenticação
  logout(): void              // Limpa estado e localStorage
  setTokens(tokens): void     // Atualiza tokens após refresh
}
```

O estado de autenticação é **persistido no localStorage**, permitindo que o usuário permaneça logado após recarregar a página.

---

## 🌐 Cliente HTTP (Axios)

O arquivo [`api/client.ts`](file:///Users/edelmarsilva/Documents/cadeia-custodia/frontend/src/api/client.ts) configura:

1. **Base URL**: `/api` (via proxy Vite em dev, via Nginx em prod)
2. **Interceptor de request**: Adiciona `Authorization: Bearer <token>` automaticamente
3. **Interceptor de response**:
   - Detecta `401 Unauthorized`
   - Tenta renovar o `access_token` usando o `refresh_token`
   - Repete a requisição original com o novo token
   - Se falhar → faz logout automático

---

## 🔧 Configuração do Vite

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',      // Proxy da API
      '/storage': 'http://localhost:9000'   // Proxy do MinIO
    }
  }
})
```

---

## 🐳 Build com Docker

O `Dockerfile` do frontend realiza um **build em duas etapas**:

```dockerfile
# Etapa 1: Build da aplicação
FROM node:18-alpine AS builder
RUN npm ci && npm run build

# Etapa 2: Nginx serve os arquivos estáticos
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

O `nginx.conf` também configura:
- Roteamento SPA (`try_files $uri /index.html`)
- Proxy reverso `/api` → backend
- Proxy reverso `/storage` → MinIO

---

## 📱 Responsividade

A interface é otimizada para uso em:
- **Desktop** (1280px+) — layout primário com sidebar expandida
- **Tablet** (768px+) — sidebar colapsável
- A aplicação não é otimizada para uso mobile, dado o contexto institucional de desktop

---

## 🔔 Notificações Toast

O sistema usa `react-hot-toast` para feedback visual:

```typescript
import toast from 'react-hot-toast';

toast.success('Dispositivo cadastrado com sucesso!');
toast.error('Erro ao registrar movimentação.');
toast.loading('Gerando laudo...');
```
