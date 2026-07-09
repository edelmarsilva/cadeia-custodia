# 🔒 Sistema de Cadeia de Custódia de Evidências Digitais

> Sistema institucional de gerenciamento de cadeia de custódia de evidências digitais, voltado para operações de investigação, perícia forense e controle de dispositivos eletrônicos apreendidos.

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
  - [Com Docker (Recomendado)](#com-docker-recomendado)
  - [Desenvolvimento Local (sem Docker)](#desenvolvimento-local-sem-docker)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Acesso ao Sistema](#acesso-ao-sistema)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API REST](#api-rest)
- [Controle de Acesso (RBAC)](#controle-de-acesso-rbac)
- [Princípios de Segurança](#princípios-de-segurança)

---

## Visão Geral

O sistema permite o gerenciamento completo de:

- **Operações** de investigação (com dashboard de métricas)
- **Alvos** (pessoas físicas e jurídicas)
- **Dispositivos** eletrônicos apreendidos (smartphones, HDs, pendrives, etc.)
- **Cadeia de custódia** — histórico imutável e auditável de movimentações
- **Fotografias** das evidências (armazenadas no MinIO/S3)
- **Laudos periciais** (PDF, com versionamento)
- **Hashes de integridade** (MD5, SHA1, SHA256)
- **Log de auditoria** imutável de todas as ações do sistema

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🔐 Autenticação | Login JWT com access + refresh token |
| 📋 Operações | CRUD completo, dashboard com contadores, gestão de documentos |
| 👤 Alvos | Cadastro de pessoas físicas/jurídicas com dados completos |
| 📱 Dispositivos | Cadastro com campos específicos por tipo (IMEI, processador, capacidade, etc.) |
| 🔗 Custódia | Registro imutável de movimentações com timeline visual |
| 📷 Fotografias | Upload e galeria de fotos por evidência |
| 📄 Laudos | Criação, revisão, assinatura e versionamento de laudos periciais |
| #️⃣ Integridade | Registro de hashes SHA-256, SHA-1 e MD5 |
| 📚 Auditoria | Log imutável de todas as ações, com filtros e paginação |
| 🔑 Usuários | Gestão de usuários com papéis e permissões (somente admin) |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   Frontend   │───▶│   Backend    │───▶│ PostgreSQL│  │
│  │ React/Vite   │    │   FastAPI    │    │  (dados)  │  │
│  │ :5173        │    │   :8000      │    │  :5432    │  │
│  └──────────────┘    └──────┬───────┘    └───────────┘  │
│                             │                            │
│                       ┌─────▼──────┐                    │
│                       │   MinIO    │                    │
│                       │  (arquivos)│                    │
│                       │ :9000/:9001│                    │
│                       └────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**Stack tecnológico:**

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Zustand + React Router v6 |
| Backend | FastAPI + SQLAlchemy (async) + Alembic + Pydantic v2 |
| Banco de dados | PostgreSQL 16 |
| Armazenamento de arquivos | MinIO (compatível com S3) |
| Autenticação | JWT (python-jose) + Bcrypt (passlib) |
| Containerização | Docker + Docker Compose v2 |

---

## Pré-requisitos

### Para executar com Docker (Recomendado)

- [Docker Engine](https://docs.docker.com/engine/install/) v24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.20+

### Para desenvolvimento local (sem Docker)

- Python 3.11+
- Node.js 18+ e npm 9+
- PostgreSQL 14+ rodando localmente
- MinIO rodando localmente (opcional para teste)

---

## Instalação e Execução

### Com Docker (Recomendado)

#### 1. Clone o repositório

```bash
git clone <url-do-repositório>
cd cadeia-custodia
```

#### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e **altere obrigatoriamente** os seguintes campos antes de subir em produção:

```dotenv
SECRET_KEY=<gere uma chave segura com: openssl rand -hex 32>
POSTGRES_PASSWORD=<senha forte para o banco>
MINIO_SECRET_KEY=<senha forte para o MinIO>
ADMIN_PASSWORD=<senha do usuário administrador inicial>
ADMIN_EMAIL=<e-mail do administrador>
```

#### 3. Suba todos os serviços

```bash
docker compose up --build -d
```

Este comando inicia, em ordem:

1. **PostgreSQL** — banco de dados relacional
2. **MinIO** — armazenamento de arquivos (fotos, laudos, documentos)
3. **mc (MinIO Client)** — configura os buckets automaticamente e encerra
4. **Backend** FastAPI — aguarda o banco subir antes de iniciar
5. **Frontend** React — interface web

#### 4. Execute as migrações do banco

Na primeira execução, rode as migrações para criar todas as tabelas:

```bash
docker compose exec backend alembic upgrade head
```

> O usuário administrador inicial é criado automaticamente na primeira inicialização do backend, conforme as variáveis `ADMIN_*` do `.env`.

#### 5. Acesse o sistema

| Serviço | URL |
|---------|-----|
| Interface Web | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/api/docs |
| API (Redoc) | http://localhost:8000/api/redoc |
| MinIO Console | http://localhost:9001 |

#### Comandos úteis

```bash
# Ver logs de todos os serviços
docker compose logs -f

# Ver logs apenas do backend
docker compose logs -f backend

# Verificar status dos containers
docker compose ps

# Parar todos os serviços
docker compose down

# Parar e remover volumes (apaga dados do banco!)
docker compose down -v

# Reiniciar apenas o backend após alterações
docker compose restart backend
```

---

### Desenvolvimento Local (sem Docker)

Recomendado para quem deseja modificar o código e testar em tempo real.

#### Backend

```bash
cd backend

# Criar e ativar ambiente virtual
python3 -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
# Certifique-se que DATABASE_URL aponta para localhost:
# DATABASE_URL=postgresql+asyncpg://cadeia:cadeia_secret@localhost:5432/cadeia_custodia
export $(cat ../.env | grep -v '^#' | xargs)

# Executar migrações
alembic upgrade head

# Iniciar o servidor de desenvolvimento
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API estará disponível em: `http://localhost:8000`
Documentação interativa: `http://localhost:8000/api/docs`

#### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

A interface estará disponível em: `http://localhost:5173`

> O Vite está configurado para fazer proxy das chamadas `/api` para `http://localhost:8000`, então o backend precisa estar rodando.

#### Build para produção (frontend)

```bash
cd frontend
npm run build
# Saída em: frontend/dist/
```

---

## Configuração do Ambiente

### Arquivo `.env`

O arquivo `.env` fica na raiz do projeto e contém todas as variáveis de configuração. **Nunca versione este arquivo em repositórios públicos.**

A seguir, uma descrição de cada grupo de variáveis:

#### Banco de dados

```dotenv
POSTGRES_USER=cadeia              # Usuário do PostgreSQL
POSTGRES_PASSWORD=cadeia_secret   # Senha do PostgreSQL (ALTERE em produção)
POSTGRES_DB=cadeia_custodia       # Nome do banco de dados
POSTGRES_HOST=db                  # Host (use "db" no Docker, "localhost" local)
POSTGRES_PORT=5432                # Porta padrão do PostgreSQL

DATABASE_URL=postgresql+asyncpg://cadeia:cadeia_secret@db:5432/cadeia_custodia
DATABASE_URL_SYNC=postgresql+psycopg2://cadeia:cadeia_secret@db:5432/cadeia_custodia
```

#### Autenticação JWT

```dotenv
SECRET_KEY=TROQUE_POR_UMA_CHAVE_SEGURA   # Gere com: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60            # Validade do access token (1 hora)
REFRESH_TOKEN_EXPIRE_DAYS=7              # Validade do refresh token (7 dias)
```

#### MinIO (Armazenamento de Arquivos)

```dotenv
MINIO_ENDPOINT=minio:9000         # Host do MinIO (use "minio:9000" no Docker)
MINIO_ACCESS_KEY=minioadmin       # Usuário do MinIO
MINIO_SECRET_KEY=minioadmin123    # Senha do MinIO (ALTERE em produção)
MINIO_BUCKET_PHOTOS=photos        # Bucket para fotos de evidências
MINIO_BUCKET_REPORTS=reports      # Bucket para laudos periciais (PDF)
MINIO_BUCKET_DOCUMENTS=documents  # Bucket para documentos da operação
MINIO_USE_SSL=false               # true em produção com HTTPS
```

#### Aplicação

```dotenv
APP_ENV=development               # "development" ou "production"
APP_NAME=Cadeia de Custódia
APP_VERSION=1.0.0
DEBUG=true                        # false em produção
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Usuário Administrador Inicial

```dotenv
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@pericia.gov.br
ADMIN_PASSWORD=Admin@123!         # ALTERE em produção
ADMIN_FULL_NAME=Administrador do Sistema
```

---

## Variáveis de Ambiente

Tabela completa de referência:

| Variável | Obrigatória | Padrão | Descrição |
|----------|:-----------:|--------|-----------|
| `POSTGRES_USER` | ✅ | `cadeia` | Usuário do banco |
| `POSTGRES_PASSWORD` | ✅ | — | Senha do banco |
| `POSTGRES_DB` | ✅ | `cadeia_custodia` | Nome do banco |
| `DATABASE_URL` | ✅ | — | URL de conexão async |
| `DATABASE_URL_SYNC` | ✅ | — | URL de conexão sync (Alembic) |
| `SECRET_KEY` | ✅ | — | Chave JWT (mín. 32 chars) |
| `ALGORITHM` | ❌ | `HS256` | Algoritmo JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | `60` | Validade access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ❌ | `7` | Validade refresh token |
| `MINIO_ENDPOINT` | ✅ | — | Host:porta do MinIO |
| `MINIO_ACCESS_KEY` | ✅ | — | Usuário MinIO |
| `MINIO_SECRET_KEY` | ✅ | — | Senha MinIO |
| `MINIO_USE_SSL` | ❌ | `false` | Usar HTTPS no MinIO |
| `APP_ENV` | ❌ | `development` | Ambiente |
| `DEBUG` | ❌ | `true` | Modo debug |
| `ALLOWED_ORIGINS` | ✅ | — | Origens CORS permitidas |
| `ADMIN_USERNAME` | ✅ | — | Login do admin inicial |
| `ADMIN_EMAIL` | ✅ | — | E-mail do admin inicial |
| `ADMIN_PASSWORD` | ✅ | — | Senha do admin inicial |
| `ADMIN_FULL_NAME` | ❌ | — | Nome completo do admin |

---

## Acesso ao Sistema

### Login padrão (primeiro acesso)

| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `Admin@123!` |

> ⚠️ **Altere a senha imediatamente após o primeiro login em ambiente de produção.**

### Fluxo básico de uso

```
1. Login → 2. Criar Operação → 3. Cadastrar Alvo → 4. Cadastrar Dispositivo
→ 5. Registrar Movimentações de Custódia → 6. Anexar Fotos
→ 7. Registrar Hashes de Integridade → 8. Emitir Laudo Pericial
```

---

## Estrutura do Projeto

```
cadeia-custodia/
│
├── .env                          # Variáveis de ambiente (não versionar)
├── .env.example                  # Template de variáveis de ambiente
├── docker-compose.yml            # Definição de todos os serviços
│
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini               # Configuração do Alembic
│   ├── requirements.txt          # Dependências Python
│   └── app/
│       ├── main.py               # Entry point da API (FastAPI)
│       ├── api/
│       │   └── v1/
│       │       ├── router.py     # Agregador de todos os routers
│       │       └── endpoints/
│       │           ├── auth.py         # Login, refresh, me
│       │           ├── users.py        # CRUD de usuários (admin)
│       │           ├── operations.py   # CRUD de operações
│       │           ├── targets.py      # CRUD de alvos
│       │           ├── devices.py      # CRUD de dispositivos
│       │           ├── custody.py      # Cadeia de custódia + timeline
│       │           ├── media.py        # Fotos + laudos
│       │           └── integrity.py    # Hashes + auditoria
│       ├── core/
│       │   ├── config.py         # Configuração via Pydantic Settings
│       │   ├── deps.py           # Dependências FastAPI (auth, RBAC)
│       │   └── security.py       # JWT, bcrypt
│       ├── db/
│       │   ├── database.py       # Engine async/sync, sessões
│       │   └── seed.py           # Criação do admin inicial
│       ├── migrations/           # Migrações Alembic
│       │   ├── env.py
│       │   └── versions/
│       ├── models/               # Modelos ORM (SQLAlchemy)
│       │   ├── user_model.py
│       │   ├── operation_model.py
│       │   ├── target_model.py
│       │   ├── device_model.py
│       │   ├── custody_model.py
│       │   ├── photo_model.py
│       │   ├── report_model.py
│       │   ├── hash_model.py
│       │   ├── document_model.py
│       │   └── audit_model.py
│       ├── schemas/              # Schemas Pydantic (request/response)
│       └── services/
│           ├── audit_service.py  # Log de auditoria imutável
│           ├── storage_service.py # Upload/download MinIO
│           └── qrcode_service.py  # Geração de QR Code
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx              # Entry point React
        ├── App.tsx               # Roteamento (React Router v6)
        ├── index.css             # Design system (CSS vars + componentes)
        ├── api/
        │   ├── client.ts         # Axios + interceptors JWT
        │   └── endpoints.ts      # Chamadas de API por domínio
        ├── store/
        │   └── index.ts          # Zustand (auth persistido, UI)
        ├── types/
        │   └── index.ts          # Tipos TypeScript globais
        ├── utils/
        │   ├── format.ts         # Formatação de datas, CPF, etc.
        │   └── labels.ts         # Labels e badges de enums
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── OperationsPage.tsx
        │   ├── OperationFormPage.tsx
        │   ├── OperationDetailPage.tsx
        │   ├── TargetDetailPage.tsx
        │   ├── TargetFormPage.tsx
        │   ├── DeviceDetailPage.tsx
        │   ├── DeviceFormPage.tsx
        │   ├── CustodyMovementFormPage.tsx
        │   └── AuditPage.tsx
        └── components/
            └── layout/
                ├── AppLayout.tsx    # Shell principal + auth guard
                └── Sidebar.tsx      # Navegação lateral com RBAC
```

---

## API REST

A documentação interativa completa está disponível em:

- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

### Principais endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/v1/auth/login` | Autenticação (retorna JWT) |
| `POST` | `/api/v1/auth/refresh` | Renovar access token |
| `GET` | `/api/v1/auth/me` | Dados do usuário autenticado |
| `GET` | `/api/v1/operations` | Listar operações (filtros + paginação) |
| `POST` | `/api/v1/operations` | Criar operação |
| `GET` | `/api/v1/operations/{id}` | Dashboard da operação (com métricas) |
| `GET` | `/api/v1/operations/{id}/targets` | Alvos da operação |
| `POST` | `/api/v1/targets/{id}/devices` | Cadastrar dispositivo em alvo |
| `GET` | `/api/v1/devices/{id}/custody` | Histórico de custódia |
| `POST` | `/api/v1/devices/{id}/custody` | Registrar movimentação |
| `GET` | `/api/v1/devices/{id}/timeline` | Timeline visual de custódia |
| `POST` | `/api/v1/devices/{id}/photos` | Upload de fotografia |
| `POST` | `/api/v1/devices/{id}/reports` | Criar laudo pericial |
| `POST` | `/api/v1/devices/{id}/hashes` | Registrar hash de integridade |
| `GET` | `/api/v1/audit` | Log de auditoria (somente leitura) |
| `GET` | `/health` | Health check do serviço |

### Autenticação nas chamadas

Todas as rotas (exceto `/auth/login` e `/health`) exigem o header:

```
Authorization: Bearer <access_token>
```

---

## Controle de Acesso (RBAC)

O sistema possui 5 papéis hierárquicos:

| Papel | Identificador | Permissões |
|-------|--------------|-----------|
| **Administrador** | `admin` | Acesso total, gestão de usuários |
| **Custódia** | `custody` | Registrar movimentações, ver dispositivos |
| **Perito** | `expert` | Criar laudos, registrar hashes |
| **Analista** | `analyst` | Leitura completa, registrar hashes |
| **Auditor** | `auditor` | Somente log de auditoria |

---

## Princípios de Segurança

O sistema foi projetado com os seguintes princípios de integridade forense:

1. **Imutabilidade do Log de Auditoria** — Nenhum registro de auditoria pode ser alterado ou excluído. Todas as ações são persistidas com timestamp e identificação do usuário.

2. **Cadeia de Custódia Imutável** — Movimentações de custódia são append-only. O histórico completo é preservado integralmente.

3. **Soft Delete** — Registros de negócio (operações, alvos, dispositivos, etc.) nunca são deletados fisicamente. São marcados com `deleted_at` para preservar rastreabilidade.

4. **Hashes SHA-256 Obrigatórios** — O campo `sha256` é obrigatório no registro de integridade, garantindo a verificabilidade da evidência digital.

5. **QR Code por Evidência** — Cada dispositivo recebe um QR Code gerado automaticamente, vinculando o código físico ao registro digital no sistema.

6. **JWT com Renovação Automática** — O frontend renova o token automaticamente antes da expiração, sem interrupção do trabalho do perito.

---

## Suporte

Em caso de problemas, verifique:

1. **Logs do backend**: `docker compose logs -f backend`
2. **Logs do banco**: `docker compose logs -f db`
3. **Health check da API**: `curl http://localhost:8000/health`
4. **Console do MinIO**: `http://localhost:9001` (usuário: `minioadmin`)

---

> Sistema desenvolvido para uso institucional em perícia forense digital.  
> Todas as ações realizadas são registradas e auditáveis.
