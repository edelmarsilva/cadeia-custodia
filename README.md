# 🔒 Sistema de Cadeia de Custódia de Evidências Digitais

> Sistema institucional de gerenciamento da cadeia de custódia de evidências digitais, voltado para operações de investigação policial, perícia forense e controle de dispositivos eletrônicos apreendidos.  
> Inclui **aplicativo Android** de coleta forense em campo — 100% offline, provisionado via QR Code.

**Versão:** 1.4.0 | **Plataforma:** Web + Android | **Licença:** Institucional

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
- [Fluxo Operacional Completo](#fluxo-operacional-completo)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API REST](#api-rest)
- [App Mobile — Coleta Offline com QR Code](#app-mobile--coleta-offline-com-qr-code)
- [Controle de Acesso (RBAC)](#controle-de-acesso-rbac)
- [Princípios de Segurança Forense](#princípios-de-segurança-forense)
- [Suporte](#suporte)

---

## Visão Geral

O sistema gerencia o ciclo de vida completo de evidências digitais — da apreensão em campo até a emissão do laudo pericial:

- **Operações** de investigação com dashboard de métricas
- **Equipes de Deflagração** com membros e alvos vinculados
- **Alvos** (pessoas físicas e jurídicas) com fotos e histórico
- **Dispositivos** eletrônicos apreendidos (smartphones, HDs, pendrives, DVRs, etc.)
- **Cadeia de custódia** — histórico imutável e auditável de movimentações
- **App Android offline** — provisionado via QR Code, coleta N dispositivos por missão
- **Exportação ZIP** — pacote portável de metadados + fotos para importar no sistema web
- **Documentos** técnicos e periciais (PDF, controle de exclusão por autor)
- **Hashes de integridade** (MD5, SHA-1, SHA-256) verificáveis
- **Relatórios estatísticos** por operação e anuais consolidados
- **Log de auditoria** imutável de todas as ações do sistema

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🔐 **Autenticação** | Login JWT com access + refresh token e proteção por papel (RBAC) |
| 📋 **Operações** | CRUD completo, dashboard com contadores, membros e documentos |
| 👥 **Equipes de Deflagração** | Criação de equipes com líder, membros e alvos; geração de QR Code de missão |
| 👤 **Alvos** | Cadastro PF/PJ com dados completos, fotos e dispositivos vinculados |
| 📱 **Dispositivos** | Cadastro por tipo com campos específicos (IMEI, serial, lacre, QR Code único) |
| 🔗 **Custódia** | Registro imutável append-only com timeline visual e impressão em PDF |
| 📷 **Coleta de Campo** | App Android 100% offline: QR Code → N dispositivos → 8 etapas → ZIP |
| 📤 **Importação ZIP** | Upload do pacote de campo — cria sessão, dispositivos e fotos no sistema |
| 📄 **Documentos** | Upload de arquivos técnicos, controle de exclusão por autor |
| 🔨 **Laudos Periciais** | Geração automática em PDF via templates configuráveis |
| #️⃣ **Integridade** | Registro e verificação de hashes SHA-256 por evidência |
| 📊 **Estatísticas** | Relatórios por operação e gerais com filtro por ano |
| 📚 **Auditoria** | Log imutável de todas as ações com filtros e paginação |
| 🔑 **Usuários** | Gestão com papéis hierárquicos (somente admin) |

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
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  App Mobile Flutter (Android) — 100% OFFLINE                                │
│                                                                              │
│  QR Code ──scan──▶ Session Confirm ──▶ Device List ──▶ Add Device (N vezes) │
│                                              │                              │
│                                         PhotoWizard (8 etapas por device)  │
│                                              │                              │
│                                         Export ZIP ──share──▶ Sistema Web  │
│                                                                              │
│  Armazenamento local: SQLite (metadados) + FileSystem (fotos)               │
│  Transferência: USB / WhatsApp / E-mail / Google Drive                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fluxo de Provisionamento QR Code

```
[Web — Admin]                         [Campo — Agente]
     │                                       │
     ├── Acessa Operação → Equipe → Alvo     │
     ├── Clica "Gerar QR Code de Campo"      │
     ├── Sistema gera payload Base64 + PNG   │
     └── Envia QR (WhatsApp/impresso) ──────▶│
                                             ├── Abre app Android
                                             ├── Toca "Nova Missão"
                                             ├── Escaneia QR Code
                                             ├── Confirma dados + informa nome
                                             ├── Adiciona N dispositivos
                                             ├── Percorre 8 etapas por dispositivo
                                             ├── Exporta ZIP
                                             └── Compartilha ──────▶ [Web Import]
```

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + TypeScript + Vite + Zustand + React Router v6 | 18.x |
| **Backend** | FastAPI + SQLAlchemy (async) + Alembic + Pydantic v2 | 0.115.x |
| **Banco de dados** | PostgreSQL | 16 |
| **Armazenamento** | MinIO (compatível S3) — buckets: `evidencias`, `field-photos` | Latest |
| **Autenticação** | JWT (python-jose) + Bcrypt (passlib) | — |
| **QR Code** | qrcode[pil] (geração servidor) + mobile_scanner (leitura offline) | 8.x / 5.x |
| **Containerização** | Docker + Docker Compose v2 | 24+ / 2.20+ |
| **App Mobile** | Flutter + Dart | 3.22+ |
| **OCR Mobile** | Google ML Kit Text Recognition (offline) | 0.14.x |
| **DB Offline** | SQLite via sqflite | 2.x |
| **Export ZIP** | archive (Dart) + share_plus | 3.x / 9.x |

---

## Pré-requisitos

### Para executar com Docker (Recomendado)

- [Docker Engine](https://docs.docker.com/engine/install/) v24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2.20+

### Para o App Mobile Android

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.22+
- [Android Studio](https://developer.android.com/studio) com Android SDK 21+
- Dispositivo físico Android (recomendado) ou emulador Android

---

## Instalação e Execução

### Com Docker (Recomendado)

```bash
# 1. Clonar o repositório
git clone https://github.com/edelmarsilva/cadeia-custodia.git
cd cadeia-custodia

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações antes de prosseguir

# 3. Construir e iniciar todos os serviços
docker compose up -d --build

# 4. Verificar saúde dos serviços
docker compose ps
curl http://localhost:8000/health
```

### Rebuild sem Cache (após mudanças no backend/frontend)

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Verificar Logs

```bash
docker compose logs -f backend    # API FastAPI
docker compose logs -f frontend   # React
docker compose logs -f db         # PostgreSQL
```

---

## Variáveis de Ambiente

Copie `.env.example` → `.env` e configure:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | String de conexão PostgreSQL async | `postgresql+asyncpg://...` |
| `SECRET_KEY` | Chave secreta JWT (mín. 32 chars aleatórios) | **Alterar obrigatoriamente** |
| `MINIO_ENDPOINT` | Endereço interno do MinIO | `minio:9000` |
| `MINIO_ACCESS_KEY` | Chave de acesso MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Chave secreta MinIO | **Alterar obrigatoriamente** |
| `MINIO_PUBLIC_ENDPOINT` | Endereço público MinIO (para URLs assinadas) | `http://localhost:5173/storage` |

> ⚠️ **Nunca versione o arquivo `.env`.**

---

## Acesso ao Sistema

Após inicialização:

| Serviço | URL | Credenciais padrão |
|---------|-----|-------------------|
| **Sistema Web** | http://localhost:5173 | admin / Admin@123! |
| **API Swagger** | http://localhost:8000/api/docs | — |
| **API ReDoc** | http://localhost:8000/api/redoc | — |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |

> ⚠️ **Altere a senha do admin no primeiro login em produção.**

---

## Fluxo Operacional Completo

```
PRÉ-OPERAÇÃO (Sistema Web)
══════════════════════════
1. Admin cria Operação (nome, nº procedimento, status)
2. Admin cadastra Alvos (PF/PJ)
3. Admin cria Equipes de Deflagração + adiciona membros
4. Admin vincula Alvos às Equipes
5. Para cada Equipe+Alvo: Admin clica "Gerar QR Code"
   → Sistema gera PNG imprimível + payload Base64
   → Admin envia o QR para o agente (WhatsApp, e-mail, impresso)

DEFLAGRAÇÃO (App Android — 100% offline)
═════════════════════════════════════════
6.  Agente abre o app "Cadeia de Custódia — Campo"
7.  Toca em "Nova Missão" → câmera abre para escanear QR Code
8.  App decodifica o QR e exibe: Operação, Equipe, Alvo, CPF
9.  Agente confirma e informa seu nome
10. Para cada dispositivo encontrado:
    a. Toca em "Novo Dispositivo"
    b. Seleciona tipo + informa marca, modelo, cor, local
    c. Percorre as 8 etapas fotográficas guiadas
       (câmera abre automaticamente para cada etapa)
    d. OCR detecta IMEI/Serial na etapa 6 automaticamente
    e. GPS registrado em cada foto
    f. SHA-256 calculado localmente
    g. Volta para a lista → pode adicionar mais dispositivos ← N DISPOSITIVOS
11. Ao terminar: toca "Exportar ZIP"
    → app gera manifest.json + photos/ e abre Share Sheet
    → agente compartilha por USB, WhatsApp, e-mail ou Drive

PÓS-OPERAÇÃO (Sistema Web)
══════════════════════════
12. Usuário acessa "Importar Coleta" no menu lateral
13. Faz upload do arquivo ZIP
14. Sistema cria: FieldPhotoSession, FieldDeviceRecord, DevicePhoto
    → fotos armazenadas no MinIO (bucket field-photos)
    → verifica SHA-256 de cada foto
    → vincula aos registros de Operação e Alvo
15. Perito cadastra Dispositivos definitivos com custódia
16. Registra movimentações de custódia
17. Registra Hashes de Integridade (SHA-256)
18. Faz upload de Documentos técnicos
19. Gera Laudos Periciais (PDF automático via templates)
20. Emite Relatório Estatístico da Operação
21. Admin encerra a Operação
```

---

## Estrutura do Projeto

```
cadeia-custodia/
│
├── .env                              # Variáveis de ambiente (NÃO versionar)
├── .env.example                      # Template de variáveis
├── docker-compose.yml
├── README.md
├── manual-do-usuario.md              # Manual de uso detalhado
├── projeto_tecnologias.txt           # Documentação técnica oficial
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
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
│       │       └── field_sessions.py    ← QR Code + importação ZIP
│       ├── core/
│       │   ├── config.py
│       │   ├── deps.py
│       │   └── security.py
│       ├── db/
│       │   ├── database.py
│       │   └── seed.py
│       ├── migrations/versions/
│       ├── models/
│       │   ├── base.py                  # UUIDMixin, TimestampMixin, SoftDeleteMixin
│       │   ├── user_model.py
│       │   ├── operation_model.py
│       │   ├── target_model.py
│       │   ├── device_model.py
│       │   ├── custody_model.py
│       │   ├── photo_model.py           # + metadados forenses (GPS, SHA-256, step)
│       │   ├── document_model.py
│       │   ├── report_model.py
│       │   ├── hash_model.py
│       │   ├── audit_model.py
│       │   ├── deployment_team_model.py
│       │   ├── field_photo_session_model.py   ← sessão de campo
│       │   └── field_device_record_model.py   ← rascunho de dispositivo
│       ├── schemas/
│       │   ├── schemas.py
│       │   └── field_session_schemas.py
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
│       ├── App.tsx                    # Rotas (inclui /campo/importar)
│       ├── index.css
│       ├── api/
│       │   ├── client.ts              # Axios + interceptors JWT
│       │   └── endpoints.ts           # Todas as chamadas de API
│       ├── store/
│       ├── types/
│       ├── utils/
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── OperationsPage.tsx
│       │   ├── OperationDetailPage.tsx  # ← botão "Gerar QR Code de Campo"
│       │   ├── TargetDetailPage.tsx
│       │   ├── DeviceDetailPage.tsx
│       │   ├── StatisticsPage.tsx
│       │   ├── AuditPage.tsx
│       │   └── FieldImportPage.tsx    ← importação do ZIP
│       └── components/layout/
│           ├── AppLayout.tsx
│           └── Sidebar.tsx            # ← item "Importar Coleta"
│
└── mobile/                            ← App Flutter Android — 100% offline
    ├── pubspec.yaml
    └── lib/
        ├── main.dart                  # MaterialApp + SQLite init
        ├── core/
        │   ├── db/local_db.dart       # SQLite v2 (sessions, devices, photos)
        │   └── services/
        │       ├── hash_service.dart  # SHA-256
        │       ├── gps_service.dart   # Coordenadas
        │       ├── ocr_service.dart   # ML Kit — IMEI/Serial offline
        │       └── export_service.dart # Geração do ZIP
        └── features/
            ├── home/home_screen.dart           # Lista de sessões
            ├── qr/qr_scan_screen.dart          # Scanner QR Code
            ├── session/session_confirm_screen.dart  # Confirmação + nome agente
            ├── devices/
            │   ├── device_list_screen.dart     # N dispositivos + botão exportar
            │   └── add_device_screen.dart      # Cadastro de dispositivo
            ├── wizard/photo_wizard_screen.dart # Assistente 8 etapas
            └── export/export_screen.dart       # Exportação + Share Sheet
```

---

## API REST

Documentação interativa:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Autenticação

Todas as rotas (exceto `/auth/login` e `/health`) exigem:

```http
Authorization: Bearer <access_token>
```

### Principais Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/v1/auth/login` | Login (retorna JWT) |
| `POST` | `/api/v1/auth/refresh` | Renovar access token |
| `GET/POST` | `/api/v1/operations` | Listar / Criar operações |
| `GET` | `/api/v1/operations/{id}` | Dashboard da operação |
| `GET/POST` | `/api/v1/targets` | Alvos (com filtro por operação) |
| `GET/POST` | `/api/v1/devices` | Dispositivos |
| `GET/POST` | `/api/v1/devices/{id}/custody` | Histórico / Registrar movimentação |
| `GET` | `/api/v1/devices/{id}/timeline` | Timeline visual de custódia |
| `POST` | `/api/v1/devices/{id}/photos` | Upload de fotografia |
| `GET/POST` | `/api/v1/operations/{id}/teams` | Equipes de deflagração |
| `GET` | `/api/v1/field-sessions/qrcode` | **Gerar QR Code de missão** ← novo |
| `POST` | `/api/v1/field-sessions/import` | **Importar ZIP do app mobile** ← novo |
| `GET` | `/api/v1/field-sessions` | Listar sessões de campo |
| `GET` | `/api/v1/statistics/general` | Relatório estatístico geral |
| `GET` | `/api/v1/statistics/operation/{id}` | Relatório por operação |
| `GET` | `/api/v1/audit` | Log de auditoria |
| `GET` | `/health` | Health check |

### Geração do QR Code

```
GET /api/v1/field-sessions/qrcode?operation_id=<uuid>&team_id=<uuid>&target_id=<uuid>
```

Resposta:
```json
{
  "qr_payload_b64": "eyJ2IjoxLCJvbiI6Ik9wZXJh...",
  "qr_image_base64": "iVBORw0KGgoAAAA...",
  "operation_name": "Operação Alvorada",
  "team_name": "Equipe Alpha",
  "target_name": "João Silva"
}
```

### Importação ZIP

```
POST /api/v1/field-sessions/import
Content-Type: multipart/form-data
Body: file=<arquivo.zip>
```

Resposta:
```json
{
  "session_id": "uuid",
  "operation_name": "Operação Alvorada",
  "target_name": "João Silva",
  "devices_imported": 3,
  "photos_imported": 24,
  "photos_failed": 0,
  "errors": [],
  "warnings": [],
  "success": true
}
```

---

## App Mobile — Coleta Offline com QR Code

### Fluxo da Sessão

```
Nova Missão → [Escanear QR Code] → [Confirmar dados + Nome do Agente]
     │
     ▼
Lista de Dispositivos (vazia inicialmente)
     │
     ├── [Novo Dispositivo] ──▶ Cadastrar tipo/marca/modelo/cor/local
     │                               │
     │                          [Iniciar Fotografias]
     │                               │
     │                          Assistente 8 Etapas:
     │                          1. Contexto (obrigatório)
     │                          2. Ambiente Amplo (obrigatório)
     │                          3. Frente (obrigatório)
     │                          4. Traseira (obrigatório)
     │                          5. Laterais (opcional)
     │                          6. Serial/IMEI + OCR (obrigatório)
     │                          7. Lacrado (obrigatório)
     │                          8. Adicionais (opcional)
     │                               │
     │                          [Concluir] ──▶ volta para Lista
     │
     ├── [Novo Dispositivo] ← pode adicionar quantos precisar
     │
     └── [Exportar ZIP] ──▶ Gera pacote + Android Share Sheet
```

> **N dispositivos por missão.** Após concluir as fotos de um dispositivo,
> o agente retorna à lista e pode adicionar quantos dispositivos necessários.

### Estrutura do Pacote ZIP Exportado

```
cadeia_campo_Alvorada_JoaoSilva_20260715.zip
├── manifest.json          ← metadados completos (IDs, nomes, hashes, GPS)
└── photos/
    ├── tmp-001/           ← smartphone Apple iPhone 13
    │   ├── context_1721041200000.jpg
    │   ├── environment_1721041300000.jpg
    │   ├── front_1721041400000.jpg
    │   ├── back_1721041500000.jpg
    │   ├── serial_imei_1721041600000.jpg
    │   └── seal_1721041700000.jpg
    ├── tmp-002/           ← HD Externo Seagate
    │   └── ...
    └── tmp-003/           ← Pendrive Kingston
        └── ...
```

### Instalação do App

```bash
cd mobile
flutter pub get
flutter run                    # Emulador Android
flutter run --device-id <id>   # Dispositivo físico
```

### Permissões Android necessárias (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### Dependências do App

| Pacote | Função |
|--------|--------|
| `sqflite` | Banco de dados local SQLite |
| `camera` | Captura de fotos forenses |
| `mobile_scanner` | Leitura de QR Code (offline, sem Play Services) |
| `google_mlkit_text_recognition` | OCR offline para IMEI/Serial |
| `geolocator` | Coordenadas GPS por foto |
| `crypto` | Hash SHA-256 por foto |
| `image` | Compressão das fotos (qualidade 82%) |
| `archive` | Geração do arquivo ZIP |
| `share_plus` | Android Share Sheet (USB, WhatsApp, e-mail...) |
| `permission_handler` | Solicitar permissões de câmera e GPS |

---

## Controle de Acesso (RBAC)

| Papel | Código | Permissões |
|-------|--------|-----------|
| **Administrador** | `admin` | Acesso total — usuários, operações, QR Code, importação |
| **Custódia** | `custody` | Registrar movimentações, ver dispositivos, importar ZIP |
| **Perito** | `expert` | Criar documentos, laudos, hashes; importar ZIP |
| **Analista** | `analyst` | Leitura completa; registrar hashes; importar ZIP |
| **Auditor** | `auditor` | Somente log de auditoria (leitura) |

---

## Princípios de Segurança Forense

1. **Imutabilidade da Auditoria** — Todo log é append-only, sem edição ou exclusão.
2. **Cadeia de Custódia Append-Only** — Movimentações são imutáveis; histórico integral preservado.
3. **Soft Delete** — Registros nunca deletados fisicamente (`deleted_at`), rastreabilidade garantida.
4. **Hash SHA-256 por Foto** — Calculado no app antes da exportação; verificado pelo servidor na importação.
5. **GPS por Foto** — Coordenadas geográficas registradas com cada imagem forense.
6. **QR Code de Missão** — Payload compacto (Base64) — sem credenciais, apenas metadados da missão.
7. **Verificação de Integridade na Importação** — SHA-256 de cada foto verificado antes de armazenar no MinIO.
8. **QR Code por Dispositivo** — Cada dispositivo registrado no sistema recebe QR Code único vinculando o item físico ao registro digital.
9. **JWT com Refresh Automático** — Sessão renovada sem interrupção do trabalho pericial.
10. **Controle de Documentos por Autor** — Apenas o autor ou admin pode excluir documentos periciais.

---

## Suporte

```bash
# Logs dos serviços
docker compose logs -f backend
docker compose logs -f frontend

# Health check da API
curl http://localhost:8000/health

# Console MinIO
open http://localhost:9001

# Migração manual do banco de dados
docker exec cadeia_backend alembic upgrade head

# Reiniciar serviços sem cache
docker compose down && docker compose build --no-cache && docker compose up -d
```

---

> **Sistema desenvolvido para uso institucional em perícia forense digital.**  
> Versão 1.4.0 — Toda ação é registrada e auditável.
