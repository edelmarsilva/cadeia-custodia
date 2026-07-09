# 08 — Segurança e Integridade Forense

## 🛡 Visão Geral

O sistema foi projetado com princípios de **integridade forense** como fundamento, não como adição posterior. Cada decisão arquitetural garante a admissibilidade das evidências digitais tratadas.

---

## 🔐 Autenticação JWT

### Arquitetura de Token Duplo

```
Login ──▶ access_token  (60 min)  → usado em todas as requisições
      └─▶ refresh_token (7 dias)  → usado para renovar o access_token
```

| Token | Duração | Uso |
|-------|---------|-----|
| `access_token` | 60 minutos | Header `Authorization: Bearer <token>` |
| `refresh_token` | 7 dias | Renovação silenciosa no frontend |

### Algoritmo e Segurança

- **Algoritmo**: `HS256` (HMAC-SHA256)
- **Chave**: `SECRET_KEY` — deve ter no mínimo 32 caracteres (recomendado 64+)
- **Hash de senha**: `bcrypt` com salt automático via `passlib`
- **Renovação automática**: O frontend (Axios interceptor) renova o `access_token` automaticamente antes da expiração, sem interromper o trabalho do perito

### Fluxo de Renovação (Frontend)

```typescript
// axios interceptor em api/client.ts
// Quando recebe 401 com access_token expirado:
// 1. Usa o refresh_token para obter novo access_token
// 2. Repete a requisição original com o novo token
// 3. Se o refresh_token também expirou → redireciona para Login
```

---

## 🔒 Imutabilidade da Cadeia de Custódia

### Garantia em Nível de Banco de Dados

A tabela `custody_movements` é **append-only** por design:

```python
class CustodyMovement(Base, UUIDMixin):
    """Imutável — nenhum UPDATE ou DELETE é permitido nesta tabela."""
```

- **Nenhum endpoint** de `PUT`, `PATCH` ou `DELETE` existe para movimentações de custódia
- A API aceita apenas `POST` (inserção) e `GET` (consulta)
- O `created_at` é definido pelo servidor (`server_default=func.now()`), não pelo cliente

---

## 📚 Log de Auditoria Imutável

### O que é Registrado

Toda ação no sistema gera uma entrada no `audit_log`:

| Ação | Trigger |
|------|---------|
| `LOGIN` | Autenticação bem-sucedida |
| `CREATE_*` | Criação de qualquer recurso |
| `UPDATE_*` | Atualização de qualquer recurso |
| `DELETE_*` | Exclusão lógica de qualquer recurso |
| `UPLOAD_*` | Upload de arquivo |
| `DOWNLOAD_*` | Download de arquivo |
| `SIGN_REPORT` | Assinatura de laudo |

### Campos Auditados

```json
{
  "user_id": "uuid-do-usuario",
  "action": "CREATE_DEVICE",
  "resource_type": "device",
  "resource_id": "uuid-do-dispositivo",
  "details": { "evidence_number": "EV-2026-001" },
  "ip_address": "192.168.1.10",
  "created_at": "2026-01-01T10:00:00Z"
}
```

### Garantias

- Nenhum endpoint de edição ou exclusão existe para `audit_logs`
- O acesso de leitura é restrito ao papel `auditor` e `admin`
- O `created_at` é definido pelo servidor

---

## 🗑 Soft Delete (Exclusão Lógica)

Registros de negócio **nunca são deletados fisicamente** do banco:

```python
class SoftDeleteMixin:
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
```

Entidades com soft delete:

| Entidade | Tabela |
|----------|--------|
| Usuários | `users` |
| Operações | `operations` |
| Alvos | `targets` |
| Dispositivos | `devices` |

Isso garante que a **rastreabilidade histórica** seja preservada mesmo após a "exclusão" lógica de um item.

---

## #️⃣ Hashes de Integridade

### Padrão Forense

O campo `sha256` é **obrigatório** no registro de qualquer hash de integridade:

```json
{
  "sha256": "e3b0c44298fc1c149afb...",  // OBRIGATÓRIO
  "sha1": "da39a3ee5e6b4b0d3255...",    // Opcional
  "md5": "d41d8cd98f00b204e980...",     // Opcional
  "hash_target": "imagem_forensica.E01",
  "notes": "Coletado com FTK Imager v4.7"
}
```

### Por Que SHA-256 é Obrigatório

O SHA-256 é o padrão mínimo aceito nos laudos periciais digitais. MD5 e SHA-1 são aceitos como auxiliares, mas SHA-256 é o único que garante a admissibilidade da evidência digital como prova pericial no contexto atual.

---

## 🏷 QR Code por Evidência

Cada dispositivo cadastrado recebe automaticamente um **QR Code** único:

1. No momento do cadastro do dispositivo, o serviço `qrcode_service.py` gera uma imagem PNG com o QR Code
2. O QR Code é armazenado no bucket `photos` do MinIO
3. A URL é salva no campo `qr_code_url` do dispositivo
4. O QR Code pode ser impresso e colado na embalagem física da evidência
5. A leitura do QR Code leva diretamente ao registro digital do dispositivo

---

## 🔑 CORS e Proteção de Origem

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,  # Lida do .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Em produção, configure `ALLOWED_ORIGINS` com **apenas** o domínio oficial da aplicação:

```dotenv
ALLOWED_ORIGINS=https://cadeia.pericia.gov.br
```

---

## 🗃 Segurança do MinIO (Buckets)

| Bucket | Política | Justificativa |
|--------|----------|---------------|
| `photos` | Público (download) | Fotos de evidências — acesso visual rápido |
| `reports` | **Privado** | Laudos periciais — acesso apenas via URL assinada |
| `documents` | **Privado** | Documentos de operações — restritos |
| `templates` | **Privado** | Templates DOCX — restritos a peritos |

---

## 🔒 Checklist de Segurança Operacional

### Antes de Cada Período Investigativo

- [ ] Verificar se logs de auditoria estão sendo gravados
- [ ] Confirmar que backup do PostgreSQL está ativo
- [ ] Verificar integridade dos volumes do MinIO

### Após Incidente ou Suspeita de Violação

```bash
# Verificar últimas ações no sistema
GET /api/v1/audit?limit=100&order=desc

# Verificar logs do backend
docker compose logs --since=1h backend

# Verificar tentativas de login
docker compose logs --since=1h backend | grep "login"
```

### Rotação de Credenciais

Para rotacionar a `SECRET_KEY` (invalida todos os tokens ativos):

1. Gerar nova chave: `openssl rand -hex 32`
2. Atualizar no `.env`
3. Reiniciar o backend: `docker compose restart backend`
4. Todos os usuários deverão fazer login novamente
