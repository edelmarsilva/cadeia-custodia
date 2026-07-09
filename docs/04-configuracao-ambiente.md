# 04 — Configuração de Ambiente

## 📄 Arquivo `.env`

O arquivo `.env` fica na raiz do projeto e contém todas as variáveis de configuração.

> ⚠️ **Nunca versione o `.env` em repositórios públicos.** Use `.env.example` como template.

Para criar o arquivo a partir do template:

```bash
cp .env.example .env
```

---

## 🗂 Grupos de Variáveis

### 🗄 Banco de Dados (PostgreSQL)

```dotenv
POSTGRES_USER=cadeia
POSTGRES_PASSWORD=cadeia_secret        # ⚠️ ALTERE em produção
POSTGRES_DB=cadeia_custodia
POSTGRES_HOST=db                       # "db" no Docker, "localhost" em desenvolvimento local
POSTGRES_PORT=5432

# URL de conexão assíncrona (usada pelo FastAPI)
DATABASE_URL=postgresql+asyncpg://cadeia:cadeia_secret@db:5432/cadeia_custodia

# URL de conexão síncrona (usada pelo Alembic para migrações)
DATABASE_URL_SYNC=postgresql+psycopg2://cadeia:cadeia_secret@db:5432/cadeia_custodia
```

> **Importante**: Em desenvolvimento local (sem Docker), substitua `db` por `localhost` nas duas URLs.

---

### 🔑 Autenticação JWT

```dotenv
SECRET_KEY=TROQUE_POR_UMA_CHAVE_SEGURA_DE_64_CHARS_MINIMO
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60        # Validade do access token (1 hora)
REFRESH_TOKEN_EXPIRE_DAYS=7           # Validade do refresh token (7 dias)
```

Para gerar uma chave segura:

```bash
openssl rand -hex 32
```

---

### 🗃 MinIO — Armazenamento de Arquivos

```dotenv
# Endpoint interno (backend → MinIO via rede Docker)
MINIO_ENDPOINT=minio:9000

MINIO_ACCESS_KEY=minioadmin            # ⚠️ ALTERE em produção
MINIO_SECRET_KEY=minioadmin123         # ⚠️ ALTERE em produção

# Nomes dos buckets (criados automaticamente pelo minio_init)
MINIO_BUCKET_PHOTOS=photos
MINIO_BUCKET_REPORTS=reports
MINIO_BUCKET_DOCUMENTS=documents

MINIO_USE_SSL=false                    # true em produção com HTTPS

# Endpoint público (browser → MinIO para download de arquivos)
# Em dev: http://localhost:5173/storage (via proxy Nginx)
# Em produção: https://seu-dominio.com/storage ou URL de CDN
MINIO_PUBLIC_ENDPOINT=http://localhost:5173/storage
```

---

### ⚙️ Aplicação

```dotenv
APP_ENV=development           # "development" ou "production"
APP_NAME=Cadeia de Custódia
APP_VERSION=1.0.0
DEBUG=true                    # false em produção
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

### 👤 Usuário Administrador Inicial (Seed)

Essas variáveis criam o administrador inicial automaticamente na primeira execução do backend:

```dotenv
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@pericia.gov.br
ADMIN_PASSWORD=Admin@123!             # ⚠️ ALTERE em produção
ADMIN_FULL_NAME=Administrador do Sistema
```

---

## 📋 Tabela de Referência Completa

| Variável | Obrigatória | Padrão | Descrição |
|----------|:-----------:|--------|-----------|
| `POSTGRES_USER` | ✅ | `cadeia` | Usuário do banco de dados |
| `POSTGRES_PASSWORD` | ✅ | — | Senha do banco (**altere!**) |
| `POSTGRES_DB` | ✅ | `cadeia_custodia` | Nome do banco de dados |
| `POSTGRES_HOST` | ✅ | `db` | Host do PostgreSQL |
| `POSTGRES_PORT` | ❌ | `5432` | Porta do PostgreSQL |
| `DATABASE_URL` | ✅ | — | URL async para FastAPI |
| `DATABASE_URL_SYNC` | ✅ | — | URL sync para Alembic |
| `SECRET_KEY` | ✅ | — | Chave JWT (mín. 32 chars) |
| `ALGORITHM` | ❌ | `HS256` | Algoritmo de assinatura JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | `60` | Expiração do access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ❌ | `7` | Expiração do refresh token |
| `MINIO_ENDPOINT` | ✅ | — | Host:porta interno do MinIO |
| `MINIO_ACCESS_KEY` | ✅ | — | Usuário do MinIO |
| `MINIO_SECRET_KEY` | ✅ | — | Senha do MinIO (**altere!**) |
| `MINIO_BUCKET_PHOTOS` | ❌ | `photos` | Bucket para fotos |
| `MINIO_BUCKET_REPORTS` | ❌ | `reports` | Bucket para laudos PDF |
| `MINIO_BUCKET_DOCUMENTS` | ❌ | `documents` | Bucket para documentos |
| `MINIO_USE_SSL` | ❌ | `false` | HTTPS no MinIO |
| `MINIO_PUBLIC_ENDPOINT` | ✅ | — | URL pública para downloads |
| `APP_ENV` | ❌ | `development` | Ambiente de execução |
| `APP_NAME` | ❌ | `Cadeia de Custódia` | Nome da aplicação |
| `APP_VERSION` | ❌ | `1.0.0` | Versão da aplicação |
| `DEBUG` | ❌ | `true` | Modo debug (false em prod.) |
| `ALLOWED_ORIGINS` | ✅ | — | Origens CORS permitidas |
| `ADMIN_USERNAME` | ✅ | — | Login do admin inicial |
| `ADMIN_EMAIL` | ✅ | — | E-mail do admin inicial |
| `ADMIN_PASSWORD` | ✅ | — | Senha do admin inicial |
| `ADMIN_FULL_NAME` | ❌ | — | Nome completo do admin |

---

## 🔒 Checklist de Segurança para Produção

- [ ] `SECRET_KEY` gerada com `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` trocada por senha forte
- [ ] `MINIO_SECRET_KEY` trocada por senha forte
- [ ] `ADMIN_PASSWORD` trocada após o primeiro login
- [ ] `DEBUG=false`
- [ ] `APP_ENV=production`
- [ ] `MINIO_USE_SSL=true` (se usando HTTPS)
- [ ] `ALLOWED_ORIGINS` configurado apenas com o domínio de produção
- [ ] Arquivo `.env` **não versionado** (verificar `.gitignore`)
