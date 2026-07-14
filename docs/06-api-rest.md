# 06 — API REST

## 📡 Visão Geral

A API segue o padrão **REST** com prefixo `/api/v1` em todos os endpoints.

### Documentação Interativa

| Interface | URL |
|-----------|-----|
| **Swagger UI** | http://localhost:8000/api/docs |
| **ReDoc** | http://localhost:8000/api/redoc |
| **OpenAPI JSON** | http://localhost:8000/api/openapi.json |

---

## 🔐 Autenticação

Todas as rotas (exceto `/auth/login` e `/health`) exigem o header:

```http
Authorization: Bearer <access_token>
```

### Fluxo de Autenticação

```
1. POST /api/v1/auth/login
   → Retorna access_token (60 min) + refresh_token (7 dias)

2. Usar access_token no header Authorization: Bearer <token>

3. Quando expirar: POST /api/v1/auth/refresh
   → Renova o access_token sem novo login

4. GET /api/v1/auth/me
   → Retorna dados do usuário autenticado
```

---

## 🛣 Endpoints por Módulo

### 🔑 Autenticação — `/api/v1/auth`

| Método | Rota | Autenticação | Descrição |
|--------|------|:------------:|-----------|
| `POST` | `/auth/login` | ❌ | Login com usuário/senha; retorna JWT |
| `POST` | `/auth/refresh` | ❌ | Renova access token com refresh token |
| `GET` | `/auth/me` | ✅ | Retorna perfil do usuário autenticado |

**Exemplo — Login:**
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=Admin@123!
```

**Resposta:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

### 👤 Usuários — `/api/v1/users`

> **Papel mínimo**: `admin`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/users` | Listar todos os usuários (paginado) |
| `POST` | `/users` | Criar novo usuário |
| `GET` | `/users/{id}` | Detalhar usuário |
| `PUT` | `/users/{id}` | Atualizar dados do usuário |
| `DELETE` | `/users/{id}` | Desativar usuário (soft delete) |

---

### 📋 Operações — `/api/v1/operations`

> **Papel mínimo**: `analyst` (leitura), `admin` (criação/edição)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/operations` | Listar operações (filtros + paginação) |
| `POST` | `/operations` | Criar nova operação |
| `GET` | `/operations/{id}` | Dashboard da operação (com métricas) |
| `PUT` | `/operations/{id}` | Atualizar operação |
| `DELETE` | `/operations/{id}` | Arquivar operação (soft delete) |
| `GET` | `/operations/{id}/targets` | Listar alvos da operação |
| `GET` | `/operations/{id}/documents` | Listar documentos da operação |
| `POST` | `/operations/{id}/documents` | Fazer upload de documento |
| `GET` | `/operations/{id}/members` | Listar membros da operação |
| `POST` | `/operations/{id}/members` | Adicionar membro à operação |
| `DELETE` | `/operations/{id}/members/{user_id}` | Remover membro |

**Parâmetros de filtro (GET /operations):**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | Filtrar por status: `planning`, `active`, `closed`, `archived` |
| `search` | string | Busca por nome ou número de procedimento |
| `page` | int | Página (padrão: 1) |
| `limit` | int | Itens por página (padrão: 20) |

---

### 👥 Alvos — `/api/v1/targets`

> **Papel mínimo**: `analyst` (leitura), `custody` (criação)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/operations/{op_id}/targets` | Criar alvo em uma operação |
| `GET` | `/targets/{id}` | Detalhar alvo |
| `PUT` | `/targets/{id}` | Atualizar alvo |
| `DELETE` | `/targets/{id}` | Remover alvo (soft delete) |
| `GET` | `/targets/{id}/devices` | Listar dispositivos do alvo |

---

### 📱 Dispositivos — `/api/v1/devices`

> **Papel mínimo**: `analyst` (leitura), `custody` (criação/edição)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/targets/{target_id}/devices` | Cadastrar dispositivo em um alvo |
| `POST` | `/operations/{op_id}/devices` | Cadastrar dispositivo sem alvo específico |
| `GET` | `/devices/{id}` | Detalhar dispositivo |
| `PUT` | `/devices/{id}` | Atualizar dispositivo |
| `DELETE` | `/devices/{id}` | Remover dispositivo (soft delete) |
| `GET` | `/devices/{id}/qrcode` | Baixar QR Code do dispositivo |

---

### 🔗 Cadeia de Custódia — `/api/v1/devices/{id}/custody`

> **Papel mínimo**: `custody`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/devices/{id}/custody` | Histórico completo de movimentações |
| `POST` | `/devices/{id}/custody` | Registrar nova movimentação (imutável) |
| `GET` | `/devices/{id}/timeline` | Timeline visual da cadeia de custódia |

**Payload — Registrar Movimentação:**
```json
{
  "movement_type": "transfer",
  "responsible_name": "João Silva",
  "origin_sector": "Delegacia Central",
  "destination_sector": "Laboratório de Perícia",
  "reason": "Análise forense de dados",
  "observation": "Lacre n.º 12345 preservado"
}
```

---

### 📷 Fotografias e Laudos — `/api/v1/devices/{id}/...`

> **Papel mínimo**: `custody` (fotos), `expert` (laudos)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/devices/{id}/photos` | Listar fotos do dispositivo |
| `POST` | `/devices/{id}/photos` | Upload de fotografia (multipart/form-data) |
| `DELETE` | `/devices/{id}/photos/{photo_id}` | Remover fotografia |
| `GET` | `/devices/{id}/reports` | Listar laudos periciais |
| `POST` | `/devices/{id}/reports` | Criar laudo pericial |
| `GET` | `/devices/{id}/reports/{report_id}` | Detalhar laudo |
| `PUT` | `/devices/{id}/reports/{report_id}` | Atualizar laudo |
| `POST` | `/devices/{id}/reports/{report_id}/sign` | Assinar laudo |

---

### #️⃣ Integridade — `/api/v1/devices/{id}/hashes`

> **Papel mínimo**: `analyst`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/devices/{id}/hashes` | Listar hashes registrados |
| `POST` | `/devices/{id}/hashes` | Registrar hash de integridade |

**Payload — Registrar Hash:**
```json
{
  "sha256": "e3b0c44298fc1c149afb...",
  "sha1": "da39a3ee5e6b4b0d3255...",
  "md5": "d41d8cd98f00b204e980...",
  "hash_target": "imagem_forensica.E01",
  "notes": "Hash coletado com FTK Imager v4.7"
}
```

---

### 📄 Templates de Laudo — `/api/v1/report-templates`

> **Papel mínimo**: `expert`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/report-templates` | Listar templates disponíveis |
| `POST` | `/report-templates` | Upload de template DOCX |
| `GET` | `/report-templates/{id}` | Detalhar template |
| `DELETE` | `/report-templates/{id}` | Remover template |

---

### 🖨 Geração de Laudos — `/api/v1/report-generation`

> **Papel mínimo**: `expert`

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/report-generation/generate` | Gerar laudo PDF a partir de template |
| `GET` | `/report-generation/{device_id}` | Listar laudos gerados de um dispositivo |
| `GET` | `/report-generation/download/{id}` | Download do laudo gerado |

---

### 📚 Auditoria — `/api/v1/audit`

> **Papel mínimo**: `auditor`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/audit` | Listar log de auditoria (filtros + paginação) |

**Parâmetros de filtro:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `user_id` | UUID | Filtrar por usuário |
| `action` | string | Filtrar por tipo de ação |
| `resource_type` | string | Filtrar por tipo de recurso |
| `start_date` | datetime | Data de início |
| `end_date` | datetime | Data de fim |
| `page` | int | Página |
| `limit` | int | Itens por página |

---

### ✅ Health Check

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| `GET` | `/health` | ❌ | Verifica se a API está no ar |

**Resposta:**
```json
{
  "status": "ok",
  "service": "Cadeia de Custódia",
  "version": "1.0.0"
}
```

---

## 📝 Padrões de Resposta

### Sucesso (200/201)

```json
{
  "id": "uuid",
  "field": "value",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### Erro de Validação (422)

```json
{
  "detail": [
    {
      "loc": ["body", "field"],
      "msg": "field required",
      "type": "missing"
    }
  ]
}
```

### Erro de Autenticação (401)

```json
{
  "detail": "Could not validate credentials"
}
```

### Erro de Autorização (403)

```json
{
  "detail": "Permissão insuficiente"
}
```

### Não Encontrado (404)

```json
{
  "detail": "Recurso não encontrado"
}
```

---

### 🛡 Equipes de Deflagração — `/api/v1/operations/{op_id}/teams`

> **Papel mínimo**: `analyst` (leitura), `custody` (criação/edição), `admin` (exclusão)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/operations/{op_id}/teams` | Listar equipes da operação |
| `POST` | `/operations/{op_id}/teams` | Criar equipe |
| `GET` | `/operations/{op_id}/teams/{team_id}` | Detalhar equipe |
| `PATCH` | `/operations/{op_id}/teams/{team_id}` | Atualizar equipe |
| `DELETE` | `/operations/{op_id}/teams/{team_id}` | Remover equipe (soft delete — admin) |
| `POST` | `/operations/{op_id}/teams/{team_id}/members` | Adicionar policial à equipe |
| `DELETE` | `/operations/{op_id}/teams/{team_id}/members/{user_id}` | Remover policial |
| `POST` | `/operations/{op_id}/teams/{team_id}/targets` | Atribuir alvo à equipe |
| `DELETE` | `/operations/{op_id}/teams/{team_id}/targets/{target_id}` | Remover alvo da equipe |

**Validação de negócio**: ao atribuir um Alvo a uma Equipe, o sistema verifica que ambos pertencem à mesma Operação. Violação retorna HTTP 422.

---

### 📷 Fotografias de Alvos — `/api/v1/targets/{id}/photos`

> **Papel mínimo**: `analyst` (leitura), `custody` (upload), `admin` (exclusão)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/targets/{id}/photos` | Listar fotografias do alvo |
| `POST` | `/targets/{id}/photos` | Upload de fotografia (multipart/form-data) |
| `DELETE` | `/target-photos/{photo_id}` | Remover fotografia (admin) |

Formatos aceitos: `image/jpeg`, `image/png`, `image/webp` · Tamanho máximo: 10 MB

---

### 🔍 Histórico de Alvos — `/api/v1/targets/history`

> **Papel mínimo**: `analyst`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/targets/history/search` | Busca cross-operação por nome, CPF, RG ou apelido |
| `GET` | `/targets/{id}/history` | Aparições históricas de um alvo específico |

**Parâmetros (GET /targets/history/search)**:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | string | Busca ampla: nome, nome social ou apelido |
| `cpf` | string | Filtro por CPF (parcial) |
| `rg` | string | Filtro por RG (parcial) |
| `nickname` | string | Filtro por apelido/vulgo |
| `limit` | int | Máx. de resultados (padrão: 50) |

---

### 📊 Estatísticas — `/api/v1/stats` e `/api/v1/operations/{id}/stats`

> **Papel mínimo**: `admin`, `auditor` (para estatísticas gerais) ou membros da operação (para estatísticas por operação)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/stats/system` | Obter estatísticas do sistema completo (operações por status, dispositivos, logs) |
| `GET` | `/operations/{operation_id}/stats` | Obter estatísticas de uma operação específica |

**Parâmetros (GET /stats/system)**:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `year` | int | Filtra dados de operações iniciadas no ano especificado |

---

### 🗑 Exclusão de Documentos — `/api/v1/reports/{report_id}`

> **Papel mínimo**: `expert` (apenas se for o criador do laudo/documento) ou `admin`

| Método | Rota | Descrição |
|--------|------|-----------|
| `DELETE` | `/reports/{report_id}` | Realiza soft delete do laudo e remove o arquivo no MinIO |

