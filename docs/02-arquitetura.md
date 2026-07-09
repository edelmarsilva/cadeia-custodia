# 02 — Arquitetura do Sistema

## 🗺 Visão Geral da Arquitetura

O sistema é composto por quatro serviços principais, orquestrados via **Docker Compose**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Compose Network                       │
│                           (cadeia_net)                               │
│                                                                      │
│  ┌─────────────────┐        ┌─────────────────┐                     │
│  │    Frontend      │ ────▶ │     Backend      │                     │
│  │  React + Vite   │       │    FastAPI        │                     │
│  │   Nginx :80     │       │   Uvicorn :8000   │                     │
│  │  (porta 5173)   │       │                  │                     │
│  └─────────────────┘       └────────┬─────────┘                     │
│                                     │                                │
│                          ┌──────────┴──────────┐                    │
│                          │                     │                    │
│              ┌───────────▼──────────┐ ┌────────▼──────────┐        │
│              │     PostgreSQL 16    │ │   MinIO (S3)       │        │
│              │   (porta 5432)       │ │  API :9000         │        │
│              │   Dados relacionais  │ │  Console :9001     │        │
│              └──────────────────────┘ └────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Stack Tecnológico

### Frontend

| Tecnologia | Versão | Finalidade |
|-----------|--------|-----------|
| React | 18.3.x | Framework de UI |
| TypeScript | 5.6.x | Tipagem estática |
| Vite | 6.0.x | Build tool e dev server |
| React Router | v6.28.x | Roteamento SPA |
| Zustand | 5.0.x | Gerenciamento de estado global |
| Axios | 1.7.x | Cliente HTTP com interceptors JWT |
| Recharts | 2.14.x | Gráficos e dashboards |
| Lucide React | 0.469.x | Ícones |
| date-fns | 4.1.x | Manipulação de datas |
| react-hot-toast | 2.4.x | Notificações toast |
| qrcode | 1.5.x | Renderização de QR Code |

### Backend

| Tecnologia | Versão | Finalidade |
|-----------|--------|-----------|
| FastAPI | 0.115.x | Framework web assíncrono |
| Uvicorn | 0.32.x | Servidor ASGI |
| SQLAlchemy | 2.0.x | ORM com suporte async |
| Alembic | 1.14.x | Migrações de banco de dados |
| Pydantic | v2.10.x | Validação e serialização |
| pydantic-settings | 2.6.x | Configuração via variáveis de ambiente |
| python-jose | 3.3.x | Geração e validação de JWT |
| passlib + bcrypt | 1.7.x / 4.0.x | Hash de senhas |
| boto3 + minio | 1.35.x / 7.2.x | Integração com MinIO/S3 |
| qrcode + Pillow | 8.0.x / 11.1.x | Geração de QR Code |
| python-docx | 1.1.x | Processamento de templates DOCX |
| asyncpg | 0.30.x | Driver async para PostgreSQL |
| psycopg2-binary | 2.9.x | Driver sync (Alembic) |

### Infraestrutura

| Serviço | Imagem | Finalidade |
|---------|--------|-----------|
| PostgreSQL | `postgres:16-alpine` | Banco de dados relacional |
| MinIO | `minio/minio:latest` | Armazenamento de arquivos (S3-compatible) |
| MinIO Client | `minio/mc:latest` | Inicialização automática dos buckets |

---

## 📦 Serviços Docker

### `db` — PostgreSQL
- **Imagem**: `postgres:16-alpine`
- **Dados persistidos**: volume `postgres_data`
- **Health check**: `pg_isready` a cada 10s
- **Porta exposta**: `5432`

### `minio` — Object Storage
- **Imagem**: `minio/minio:latest`
- **Dados persistidos**: volume `minio_data`
- **Porta API**: `9000`
- **Porta Console**: `9001`
- **Health check**: `mc ready local` a cada 10s

### `minio_init` — Configuração Automática de Buckets
Executa uma única vez ao subir a stack, criando e configurando os buckets:

| Bucket | Acesso | Conteúdo |
|--------|--------|----------|
| `photos` | Público (download) | Fotos das evidências |
| `reports` | Privado | Laudos periciais em PDF |
| `documents` | Privado | Documentos das operações |
| `templates` | Privado | Templates DOCX de laudos |

### `backend` — FastAPI
- **Build**: `./backend/Dockerfile`
- **Hot reload**: volume mapeado `./backend:/app`
- **Porta**: `8000`
- **Dependências**: aguarda `db` e `minio` ficarem saudáveis

### `frontend` — React (Nginx)
- **Build**: `./frontend/Dockerfile` → Nginx serve o bundle estático
- **Porta**: `5173` (mapeada para `80` no container)
- **Dependências**: aguarda `backend`

---

## 🔄 Padrão de Comunicação

```
Usuário → Nginx (frontend :5173)
        → Axios (React)
        → FastAPI (backend :8000)
        → SQLAlchemy async → PostgreSQL :5432
        → MinIO client → MinIO :9000
```

**Proxy no Dev Local**: O Vite proxeia `/api` → `http://localhost:8000`, eliminando problemas de CORS no desenvolvimento.

---

## 🏗 Padrões Arquiteturais do Backend

### Camadas

```
app/
├── api/v1/endpoints/   ← Routers FastAPI (Controllers)
├── core/               ← Configuração, segurança, dependências
├── db/                 ← Engine, sessões, seed
├── models/             ← Modelos ORM SQLAlchemy (entidades)
├── schemas/            ← Schemas Pydantic (DTOs de request/response)
├── repositories/       ← Acesso ao banco (queries)
├── services/           ← Lógica de negócio e serviços externos
├── middleware/         ← Middlewares da aplicação
└── utils/              ← Utilitários gerais
```

### Banco de Dados: Dual Engine (Sync/Async)

O backend utiliza **duas engines SQLAlchemy**:

| Engine | Driver | Uso |
|--------|--------|-----|
| **Async** (`asyncpg`) | `postgresql+asyncpg` | Endpoints FastAPI (I/O assíncrono) |
| **Sync** (`psycopg2`) | `postgresql+psycopg2` | Alembic (migrações) |

### Modelo de Entidade Base

Todos os modelos principais herdam de três mixins:

| Mixin | Campos adicionados | Descrição |
|-------|-------------------|-----------|
| `UUIDMixin` | `id` (UUID v4) | Chave primária como UUID |
| `TimestampMixin` | `created_at`, `updated_at` | Timestamps automáticos |
| `SoftDeleteMixin` | `deleted_at` | Exclusão lógica (nunca física) |

---

## 🔐 Segurança na Arquitetura

- **JWT duplo**: `access_token` (60 min) + `refresh_token` (7 dias)
- **CORS**: Configurado com `ALLOWED_ORIGINS` no `.env`
- **Autenticação**: Middleware `Depends(get_current_user)` em todos os endpoints protegidos
- **RBAC**: Verificação de papéis via `Depends(require_role(...))` por endpoint
- **Senha**: Hash bcrypt com salt automático
