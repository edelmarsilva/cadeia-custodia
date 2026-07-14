# 🔒 Sistema de Cadeia de Custódia de Evidências Digitais

> Sistema institucional de gerenciamento da cadeia de custódia de evidências digitais, voltado para operações de investigação policial, perícia forense e controle de dispositivos eletrônicos apreendidos. Inclui módulo mobile de coleta guiada de fotografias em campo.

**Versão:** 1.3.0 | **Plataforma:** Web + Android | **Licença:** Institucional

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack Tecnológico](#stack-tecnológico)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Acesso ao Sistema](#acesso-ao-sistema)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API REST](#api-rest)
- [App Mobile (Flutter)](#app-mobile-flutter)
- [Controle de Acesso (RBAC)](#controle-de-acesso-rbac)
- [Princípios de Segurança Forense](#princípios-de-segurança-forense)
- [Suporte](#suporte)

---

## Visão Geral

O sistema permite o gerenciamento completo do ciclo de vida de evidências digitais, desde a apreensão em campo até a geração de relatórios periciais oficiais:

- **Operações** de investigação com dashboard de métricas
- **Equipes de Deflagração** com membros e alvos vinculados
- **Alvos** (pessoas físicas e jurídicas)
- **Dispositivos** eletrônicos apreendidos (smartphones, HDs, pendrives, DVRs, etc.)
- **Cadeia de custódia** — histórico imutável e auditável de movimentações
- **Coleta guiada de fotografias** via app Android (assistente de 8 etapas com OCR e GPS)
- **Documentos** técnicos e periciais (PDF, com controle de acesso por autor)
- **Hashes de integridade** (MD5, SHA-1, SHA-256)
- **Relatórios estatísticos** (por operação e consolidados por ano)
- **Log de auditoria** imutável de todas as ações do sistema

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🔐 **Autenticação** | Login JWT com access + refresh token e proteção por papel (RBAC) |
| 📋 **Operações** | CRUD completo, dashboard com contadores, gestão de membros e documentos |
| 👥 **Equipes de Deflagração** | Criação de equipes por operação com líder e membros, vinculação a alvos |
| 👤 **Alvos** | Cadastro de PF/PJ com dados completos, fotos e dispositivos vinculados |
| 📱 **Dispositivos** | Cadastro por tipo com campos específicos (IMEI, serial, lacre, QR Code) |
| 🔗 **Custódia** | Registro imutável de movimentações com timeline visual e impressão em PDF |
| 📸 **Coleta de Campo** | App mobile Android com assistente de 8 etapas guiadas, OCR e GPS |
| 📄 **Documentos** | Upload de arquivos técnicos, controle de exclusão por autor |
| 🔨 **Laudos Periciais** | Geração automática de laudos em PDF via templates configuráveis |
| #️⃣ **Integridade** | Registro e verificação de hashes criptográficos por evidência |
| 📊 **Estatísticas** | Relatórios por operação e gerais do sistema com filtro por ano |
| 📚 **Auditoria** | Log imutável de todas as ações, com filtros, paginação e exportação |
| 🔑 **Usuários** | Gestão de usuários com papéis hierárquicos (somente admin) |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Docker Compose                                  │
│                                                                              │
│  ┌───────────────┐     ┌──────────────────┐     ┌────────────────────────┐  │
│  │   Frontend    │────▶│     Backend      │────▶│  PostgreSQL 16         │  │
│  │ React + Vite  │     │  FastAPI (async) │     │  (dados relacionais)   │  │
│  │  Port: 5173   │     │   Port: 8000     │     │    Port: 5432          │  │
│  └───────────────┘     └────────┬─────────┘     └────────────────────────┘  │
│                                 │                                            │
│                         ┌───────▼────────┐                                  │
│                         │     MinIO      │                                  │
│                         │ (armazenamento)│                                  │
│                         │ Port: 9000/9001│                                  │
│                         └────────────────┘                                  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  App Mobile Flutter (Android)  ──────▶  Backend API /api/v1          │  │
│  │  • Offline SQLite + Câmera + GPS + OCR (ML Kit)                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
Campo (Mobile) ──[coleta offline]──▶ SQLite local
                                         │
                                    [sincronização]
                                         │
                                         ▼
Web API ◀──── FastAPI ──── PostgreSQL + MinIO
  │
  └──── Frontend React (navegador)
```

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + TypeScript + Vite + Zustand + React Router v6 | 18.x |
| **Backend** | FastAPI + SQLAlchemy (async) + Alembic + Pydantic v2 | 0.115.x |
| **Banco de dados** | PostgreSQL | 16 |
| **Armazenamento** | MinIO (compatível com S3) | Latest |
| **Autenticação** | JWT (python-jose) + Bcrypt (passlib) | — |
| **Containerização** | Docker + Docker Compose v2 | 24+ / 2.20+ |
| **App Mobile** | Flutter + Dart | 3.22+ |
| **OCR Mobile** | Google ML Kit Text Recognition (offline) | 0.14.x |
| **DB Offline** | SQLite via sqflite | 2.x |

---

## Pré-requisitos

### Para executar com Docker (Recomendado)

- [Docker Engine](https://docs.docker.com/engine/install/) v24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.20+

### Para o App Mobile Android

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.22+
- [Android Studio](https://developer.android.com/studio) com Android SDK 21+
- Dispositivo físico Android ou emulador

---

## Instalação e Execução

### Com Docker (Recomendado)

```bash
# 1. Clonar o repositório
git clone https://github.com/edelmarsilva/cadeia-custodia.git
cd cadeia-custodia

# 2. Copiar e ajustar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações antes de prosseguir

# 3. Construir e iniciar todos os serviços
docker compose up -d --build

# 4. Verificar se todos os serviços estão saudáveis
docker compose ps
curl http://localhost:8000/health
```

### Rebuild sem Cache (após mudanças no backend)

```bash
docker compose down && docker compose build --no-cache && docker compose up -d
```

### Verificar logs

```bash
docker compose logs -f backend    # Backend
docker compose logs -f frontend   # Frontend
docker compose logs -f db         # PostgreSQL
```

---

## Variáveis de Ambiente

Copie `.env.example` → `.env` e configure:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql+asyncpg://...` |
| `SECRET_KEY` | Chave secreta JWT (32+ chars aleatórios) | **Alterar em produção** |
| `MINIO_ENDPOINT` | Endereço interno do MinIO | `minio:9000` |
| `MINIO_ACCESS_KEY` | Chave de acesso MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Chave secreta MinIO | **Alterar em produção** |
| `MINIO_PUBLIC_ENDPOINT` | Endereço público MinIO (para URLs assinadas) | `http://localhost:5173/storage` |

> ⚠️ **Nunca comite o arquivo `.env` no repositório.**

---

## Acesso ao Sistema

Após a inicialização, acesse:

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Sistema Web** | http://localhost:5173 | admin / Admin@123! |
| **API Swagger** | http://localhost:8000/api/docs | — |
| **API ReDoc** | http://localhost:8000/api/redoc | — |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |

> ⚠️ **Altere a senha do admin imediatamente após o primeiro login em produção.**

### Fluxo básico de uso

```
1. Login
2. Criar Operação
3. Cadastrar Equipe de Deflagração + Membros
4. Cadastrar Alvos
5. Sair a campo → App Mobile → Coletar fotografias guiadas
6. Sincronizar fotos com o servidor
7. Cadastrar Dispositivos definitivos
8. Registrar Movimentações de Custódia
9. Anexar Documentos e Hashes de Integridade
10. Gerar Laudo Pericial
11. Emitir Relatório Estatístico
```

---

## Estrutura do Projeto

```
cadeia-custodia/
│
├── .env                          # Variáveis de ambiente (NÃO versionar)
├── .env.example                  # Template de variáveis
├── docker-compose.yml            # Definição de todos os serviços
├── README.md                     # Este arquivo
├── manual-do-usuario.md          # Manual de uso detalhado
├── projeto_tecnologias.txt       # Documentação técnica oficial
│
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── api/v1/
│       │   ├── router.py
│       │   └── endpoints/
│       │       ├── auth.py
│       │       ├── users.py
│       │       ├── operations.py
│       │       ├── targets.py
│       │       ├── devices.py
│       │       ├── custody.py
│       │       ├── media.py
│       │       ├── integrity.py
│       │       ├── deployment_teams.py
│       │       ├── target_media.py
│       │       ├── report_generation.py
│       │       ├── report_templates.py
│       │       ├── statistics.py
│       │       └── field_sessions.py   ← Módulo Mobile
│       ├── core/
│       │   ├── config.py
│       │   ├── deps.py           # RBAC + Auth dependencies
│       │   └── security.py       # JWT + bcrypt
│       ├── db/
│       │   ├── database.py
│       │   └── seed.py
│       ├── migrations/versions/  # Migrações Alembic
│       ├── models/
│       │   ├── base.py                       # UUIDMixin, TimestampMixin, SoftDeleteMixin
│       │   ├── user_model.py
│       │   ├── operation_model.py
│       │   ├── operation_user_model.py
│       │   ├── target_model.py
│       │   ├── target_photo_model.py
│       │   ├── device_model.py
│       │   ├── custody_model.py
│       │   ├── photo_model.py                # + metadados forenses do app mobile
│       │   ├── document_model.py
│       │   ├── report_model.py
│       │   ├── report_template_model.py
│       │   ├── generated_report_model.py
│       │   ├── hash_model.py
│       │   ├── audit_model.py
│       │   ├── deployment_team_model.py
│       │   ├── deployment_team_member_model.py
│       │   ├── deployment_team_target_model.py
│       │   ├── field_photo_session_model.py   ← Módulo Mobile
│       │   └── field_device_record_model.py   ← Módulo Mobile
│       ├── schemas/
│       │   ├── schemas.py
│       │   ├── common_schema.py
│       │   └── field_session_schemas.py       ← Módulo Mobile
│       └── services/
│           ├── audit_service.py
│           ├── storage_service.py
│           ├── qrcode_service.py
│           └── report_generation_service.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── api/
│       ├── store/
│       ├── types/
│       ├── utils/
│       ├── pages/
│       └── components/
│
└── mobile/                       ← App Flutter Android
    ├── pubspec.yaml
    └── lib/
        ├── main.dart
        ├── app/
        │   ├── router.dart
        │   └── theme.dart
        ├── core/
        │   ├── api/client.dart
        │   ├── db/local_db.dart
        │   └── services/
        │       ├── hash_service.dart
        │       ├── gps_service.dart
        │       ├── ocr_service.dart
        │       └── sync_service.dart
        └── features/
            ├── auth/login_screen.dart
            ├── session/
            ├── devices/
            ├── wizard/photo_wizard_screen.dart
            └── sync/sync_screen.dart
```

---

## API REST

A documentação interativa completa está disponível em:

- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

### Autenticação

Todas as rotas (exceto `/auth/login` e `/health`) exigem:

```http
Authorization: Bearer <access_token>
```

### Principais Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/v1/auth/login` | Autenticação (retorna JWT) |
| `POST` | `/api/v1/auth/refresh` | Renovar access token |
| `GET` | `/api/v1/auth/me` | Dados do usuário autenticado |
| `GET/POST` | `/api/v1/operations` | Listar / Criar operações |
| `GET` | `/api/v1/operations/{id}` | Dashboard da operação |
| `GET/POST` | `/api/v1/targets` | Alvos (com filtro por operação) |
| `GET/POST` | `/api/v1/devices` | Dispositivos |
| `GET/POST` | `/api/v1/devices/{id}/custody` | Histórico / Registrar movimentação |
| `GET` | `/api/v1/devices/{id}/timeline` | Timeline visual de custódia |
| `POST` | `/api/v1/devices/{id}/photos` | Upload de fotografia |
| `GET/POST` | `/api/v1/operations/{id}/teams` | Equipes de deflagração |
| `POST` | `/api/v1/field-sessions` | Criar sessão de coleta (mobile) |
| `POST` | `/api/v1/field-sessions/{id}/sync` | Sincronizar fotos do app mobile |
| `GET` | `/api/v1/statistics/general` | Relatório estatístico geral |
| `GET` | `/api/v1/statistics/operation/{id}` | Relatório estatístico por operação |
| `GET` | `/api/v1/audit` | Log de auditoria |
| `GET` | `/health` | Health check |

---

## App Mobile (Flutter)

O aplicativo Android para coleta guiada de fotografias forenses em campo.

### Instalação

```bash
cd mobile
flutter pub get
flutter run                    # Emulador Android
flutter run --device-id <id>   # Dispositivo físico
```

### Configuração de Rede

Edite `lib/core/api/client.dart`:

```dart
// Para emulador Android (aponta para o host):
static const String _baseUrl = 'http://10.0.2.2:8000/api/v1';

// Para dispositivo físico (usar IP da máquina na rede local):
static const String _baseUrl = 'http://192.168.0.X:8000/api/v1';
```

### Funcionalidades do App

| Feature | Tecnologia |
|---------|-----------|
| Autenticação JWT | flutter_secure_storage + Dio interceptor |
| Banco offline | SQLite (sqflite) |
| Câmera | camera plugin |
| GPS por foto | geolocator |
| OCR IMEI/Serial | Google ML Kit (offline) |
| Hash SHA-256 | crypto package |
| Sincronização | Batch upload via `/field-sessions/{id}/sync` |

### As 8 Etapas Guiadas

| # | Etapa | Obrigatória |
|---|-------|:-----------:|
| 1 | Contexto (evidência como encontrada) | ✅ |
| 2 | Ambiente amplo | ✅ |
| 3 | Frente do dispositivo | ✅ |
| 4 | Traseira do dispositivo | ✅ |
| 5 | Laterais | ❌ |
| 6 | Número de série / IMEI (com OCR) | ✅ |
| 7 | Dispositivo lacrado | ✅ |
| 8 | Fotos adicionais | ❌ |

---

## Controle de Acesso (RBAC)

| Papel | Código | Permissões |
|-------|--------|-----------|
| **Administrador** | `admin` | Acesso total, gestão de usuários e operações |
| **Custódia** | `custody` | Registrar movimentações, visualizar dispositivos |
| **Perito** | `expert` | Criar documentos e laudos, registrar hashes |
| **Analista** | `analyst` | Leitura completa, registrar hashes, usar app mobile |
| **Auditor** | `auditor` | Somente visualizar log de auditoria |

---

## Princípios de Segurança Forense

1. **Imutabilidade da Auditoria** — Todo log de auditoria é append-only, sem possibilidade de edição ou exclusão.

2. **Cadeia de Custódia Append-Only** — Movimentações de custódia são imutáveis. O histórico integral é preservado.

3. **Soft Delete** — Nenhum registro de negócio é deletado fisicamente. São marcados com `deleted_at`, preservando rastreabilidade.

4. **Integridade por Hash** — SHA-256 obrigatório nos hashes de integridade; verificável a qualquer momento.

5. **Hash das Fotografias Forenses** — O app mobile calcula SHA-256 de cada foto antes do envio. O servidor verifica o hash ao receber, garantindo integridade da imagem.

6. **GPS nas Fotos** — Coordenadas GPS são capturadas e registradas com cada fotografia coletada em campo.

7. **QR Code por Evidência** — Cada dispositivo recebe QR Code único vinculando o item físico ao registro digital.

8. **JWT com Refresh Automático** — Sessão renovada automaticamente sem interrupção do trabalho pericial.

9. **Controle de Acesso a Documentos** — Apenas o autor ou administrador pode remover documentos periciais.

---

## Suporte

Em caso de problemas, verifique:

```bash
# Logs dos serviços
docker compose logs -f backend
docker compose logs -f db

# Health check
curl http://localhost:8000/health

# Console MinIO
open http://localhost:9001
# Usuário: minioadmin

# Migração manual do banco
docker exec cadeia_backend alembic upgrade head
```

---

> Sistema desenvolvido para uso institucional em perícia forense digital.  
> Versão 1.3.0 — Todas as ações são registradas e auditáveis.
