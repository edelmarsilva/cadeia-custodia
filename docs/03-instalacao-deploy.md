# 03 — Instalação e Deploy

## Pré-requisitos

### Com Docker (Recomendado)

| Ferramenta | Versão Mínima |
|-----------|---------------|
| Docker Engine | 24+ |
| Docker Compose | v2.20+ |

### Desenvolvimento Local (sem Docker)

| Ferramenta | Versão Mínima |
|-----------|---------------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |
| MinIO | Qualquer (opcional) |

---

## 🐳 Deploy com Docker (Recomendado)

### Passo 1 — Clone o repositório

```bash
git clone <url-do-repositório>
cd cadeia-custodia
```

### Passo 2 — Configure as variáveis de ambiente

```bash
cp .env.example .env
```

> ⚠️ **Antes de subir em produção**, altere obrigatoriamente:

```dotenv
SECRET_KEY=<gere com: openssl rand -hex 32>
POSTGRES_PASSWORD=<senha forte>
MINIO_SECRET_KEY=<senha forte>
ADMIN_PASSWORD=<senha do administrador>
ADMIN_EMAIL=<e-mail do administrador>
```

### Passo 3 — Suba todos os serviços

```bash
docker compose up --build -d
```

A ordem de inicialização é garantida pelas condições de `healthcheck`:

```
PostgreSQL → MinIO → minio_init (configura buckets) → Backend → Frontend
```

### Passo 4 — Execute as migrações do banco

```bash
docker compose exec backend alembic upgrade head
```

> ✅ O usuário administrador inicial é criado automaticamente no primeiro startup, conforme as variáveis `ADMIN_*` do `.env`.

### Passo 5 — Acesse o sistema

| Serviço | URL |
|---------|-----|
| Interface Web | http://localhost:5173 |
| API — Swagger UI | http://localhost:8000/api/docs |
| API — ReDoc | http://localhost:8000/api/redoc |
| MinIO Console | http://localhost:9001 |

---

## 🛠 Comandos Docker Úteis

```bash
# Acompanhar logs de todos os serviços em tempo real
docker compose logs -f

# Acompanhar logs apenas do backend
docker compose logs -f backend

# Verificar status dos containers
docker compose ps

# Reiniciar apenas o backend após alterações
docker compose restart backend

# Parar todos os serviços (preserva dados)
docker compose down

# Parar e remover volumes — APAGA TODOS OS DADOS
docker compose down -v

# Abrir shell no container do backend
docker compose exec backend bash

# Executar migrações (após novo deployment)
docker compose exec backend alembic upgrade head

# Verificar health da API
curl http://localhost:8000/health
```

---

## 💻 Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend

# Criar e ativar ambiente virtual
python3 -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# Instalar dependências
pip install -r requirements.txt

# Exportar variáveis de ambiente (ajuste DATABASE_URL para localhost)
export $(cat ../.env | grep -v '^#' | xargs)

# Executar migrações
alembic upgrade head

# Iniciar servidor de desenvolvimento (com reload automático)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Acesse a API em: `http://localhost:8000`  
Documentação interativa: `http://localhost:8000/api/docs`

> **Nota**: Para uso local, o `DATABASE_URL` deve apontar para `localhost` (não `db`).
> ```
> DATABASE_URL=postgresql+asyncpg://cadeia:cadeia_secret@localhost:5432/cadeia_custodia
> ```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (com HMR)
npm run dev
```

A interface estará disponível em: `http://localhost:5173`

> O Vite está configurado para fazer **proxy** das chamadas `/api` → `http://localhost:8000`.  
> O backend deve estar rodando previamente.

### Build de Produção (Frontend)

```bash
cd frontend
npm run build
# Saída gerada em: frontend/dist/
```

---

## 🔄 Criando Novas Migrações (Desenvolvimento)

```bash
# Gerar nova migração automaticamente (detecta mudanças nos models)
docker compose exec backend alembic revision --autogenerate -m "descricao_da_migracao"

# Aplicar migrações pendentes
docker compose exec backend alembic upgrade head

# Reverter uma migração
docker compose exec backend alembic downgrade -1

# Ver histórico de migrações
docker compose exec backend alembic history
```

---

## 🚨 Solução de Problemas

| Sintoma | Causa Provável | Solução |
|---------|---------------|---------|
| Backend não sobe | PostgreSQL ainda não está pronto | Aguardar o healthcheck passar: `docker compose logs db` |
| Erro de migração | Banco novo sem tabelas | Executar `alembic upgrade head` |
| Bucket não encontrado | `minio_init` não rodou | Verificar `docker compose logs minio_init` |
| CORS bloqueando | `ALLOWED_ORIGINS` incorreto | Conferir variável no `.env` |
| Login falha | Admin não foi criado | Verificar `docker compose logs backend` no startup |

```bash
# Diagnóstico geral
docker compose ps          # status de todos os containers
docker compose logs -f     # logs em tempo real
curl http://localhost:8000/health  # health check da API
```
