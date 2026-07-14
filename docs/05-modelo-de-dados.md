# 05 — Modelo de Dados

## 📐 Diagrama de Entidade-Relacionamento

```
users
 │
 ├──[responsible_user_id]──▶ operations ◀──[operation_id]── operation_users ◀──[user_id]── users
 │                               │
 │                         [operation_id]
 │                               │
 │                           targets ──[target_id]──┐
 │                                                   │
 │                                               devices ──[device_id]──┬── custody_movements
 │                                                   │                   ├── device_photos
 │                                                   │                   ├── expert_reports
 │                                                   │                   └── integrity_hashes
 │                               │
 │                         [operation_id]────────────┘
 │                               │
 │                           documents
 │
 └──[user_id]──▶ audit_logs
```

---

## 🏛 Mixins de Base

Todos os modelos principais herdam combinações dos seguintes mixins:

| Mixin | Campos | Descrição |
|-------|--------|-----------|
| `UUIDMixin` | `id` (UUID v4, PK) | Chave primária como UUID gerado automaticamente |
| `TimestampMixin` | `created_at`, `updated_at` | Timestamps gerenciados automaticamente pelo banco |
| `SoftDeleteMixin` | `deleted_at` | Exclusão lógica — registro nunca é apagado fisicamente |

---

## 📋 Entidades do Sistema

### `users` — Usuários

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `username` | String(100) | Login único do usuário |
| `email` | String(255) | E-mail único |
| `hashed_password` | String(255) | Senha com hash bcrypt |
| `full_name` | String(255) | Nome completo |
| `role` | Enum | Papel: `admin`, `custody`, `expert`, `analyst`, `auditor` |
| `badge_number` | String(50) | Número de matrícula/funcional |
| `unit` | String(255) | Unidade/setor do usuário |
| `is_active` | Boolean | Se o usuário está ativo |
| `created_at` | DateTime | Data de criação |
| `updated_at` | DateTime | Última atualização |
| `deleted_at` | DateTime | Data de exclusão lógica (null = ativo) |

---

### `operations` — Operações de Investigação

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `name` | String(255) | Nome da operação |
| `procedure_number` | String(100) | Número de procedimento (único) |
| `description` | Text | Descrição da operação |
| `responsible_unit` | String(255) | Unidade responsável |
| `responsible_user_id` | UUID (FK → users) | Usuário responsável |
| `start_date` | Date | Data de início |
| `end_date` | Date | Data de encerramento |
| `status` | Enum | `planning`, `active`, `closed`, `archived` |
| `created_by` | UUID (FK → users) | Usuário que criou |
| `created_at` | DateTime | Data de criação |
| `deleted_at` | DateTime | Exclusão lógica |

---

### `targets` — Alvos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `operation_id` | UUID (FK → operations) | Operação vinculada |
| `full_name` | String(255) | Nome completo |
| `social_name` | String(255) | Nome social |
| `nickname` | String(100) | Apelido |
| `cpf` | String(14) | CPF (indexado) |
| `rg` | String(30) | RG |
| `person_type` | Enum | `individual` ou `legal_entity` |
| `birth_date` | Date | Data de nascimento |
| `address` | Text | Endereço completo |
| `observations` | Text | Observações gerais |
| `created_by` | UUID (FK → users) | Usuário que criou |
| `deleted_at` | DateTime | Exclusão lógica |

---

### `devices` — Dispositivos (Evidências)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `target_id` | UUID (FK → targets) | Alvo associado (nullable) |
| `operation_id` | UUID (FK → operations) | Operação vinculada |
| `evidence_number` | String(100) | Número da evidência (único, indexado) |
| `seal_number` | String(100) | Número do lacre |
| `qr_code_url` | String(500) | URL do QR Code gerado |
| `device_type` | Enum | Tipo do dispositivo (ver tabela abaixo) |
| `brand` | String(100) | Marca |
| `model` | String(200) | Modelo |
| `serial_number` | String(200) | Número de série |
| `color` | String(50) | Cor |
| `seizure_date` | Date | Data de apreensão |
| `seizure_location` | String(500) | Local de apreensão |
| `seizure_observations` | Text | Observações da apreensão |
| `status` | Enum | Status do dispositivo (ver tabela abaixo) |
| `extra_data` | JSONB | Dados extras (IMEI, RAM, OS, etc.) |
| `created_by` | UUID (FK → users) | Usuário que cadastrou |
| `deleted_at` | DateTime | Exclusão lógica |

**Tipos de dispositivo (`device_type`):**

| Valor | Descrição |
|-------|-----------|
| `smartphone` | Telefone celular |
| `tablet` | Tablet |
| `notebook` | Notebook/laptop |
| `desktop` | Computador desktop |
| `server` | Servidor |
| `hd` | Disco rígido HD |
| `ssd` | Disco SSD |
| `pendrive` | Pendrive / USB |
| `memory_card` | Cartão de memória |
| `dvr` | DVR/câmera de vigilância |
| `network_equipment` | Equipamento de rede |
| `other` | Outros |

**Status do dispositivo (`status`):**

| Valor | Descrição |
|-------|-----------|
| `seized` | Recém apreendido |
| `in_custody` | Em custódia |
| `in_analysis` | Em análise pericial |
| `finished` | Análise concluída |
| `returned` | Devolvido ao proprietário |

---

### `custody_movements` — Movimentações de Custódia

> ⚠️ **Tabela imutável** — nenhum UPDATE ou DELETE é permitido.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `device_id` | UUID (FK → devices) | Dispositivo movimentado |
| `movement_date` | DateTime | Data/hora da movimentação |
| `responsible_user_id` | UUID (FK → users) | Usuário responsável |
| `responsible_name` | String(255) | Nome do responsável (texto livre) |
| `origin_sector` | String(255) | Setor de origem |
| `destination_sector` | String(255) | Setor de destino |
| `movement_type` | Enum | Tipo da movimentação (ver abaixo) |
| `reason` | Text | Motivo da movimentação |
| `observation` | Text | Observações adicionais |
| `created_by` | UUID (FK → users) | Usuário que registrou |
| `created_at` | DateTime | Timestamp de criação |

**Tipos de movimentação (`movement_type`):**

| Valor | Descrição |
|-------|-----------|
| `seizure` | Apreensão inicial |
| `reception` | Recepção na unidade |
| `transfer` | Transferência entre setores |
| `analysis_start` | Início de análise pericial |
| `analysis_end` | Fim de análise pericial |
| `report_issued` | Laudo emitido |
| `return` | Devolução ao proprietário |
| `archive` | Arquivamento |

---

### `device_photos` — Fotografias

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `device_id` | UUID (FK → devices) | Dispositivo fotografado |
| `file_key` | String | Chave do arquivo no MinIO |
| `file_url` | String | URL de acesso à foto |
| `description` | Text | Descrição da fotografia |
| `uploaded_by` | UUID (FK → users) | Usuário que fez o upload |
| `created_at` | DateTime | Data do upload |

---

### `expert_reports` — Documentos (Laudos Periciais)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `device_id` | UUID (FK → devices) | Dispositivo periciado |
| `report_number` | String(100) | Número do laudo/documento (único) |
| `title` | String(500) | Título do documento |
| `expert_user_id` | UUID (FK → users) | Perito responsável |
| `expert_name` | String(255) | Nome do perito |
| `emission_date` | Date | Data de emissão |
| `status` | Enum | `drafting`, `review`, `signed`, `cancelled` |
| `file_path` | String(1000) | Chave do PDF no MinIO (`reports` bucket) |
| `file_name` | String(500) | Nome original do arquivo PDF |
| `version` | Integer | Número da versão |
| `observations` | Text | Observações |
| `created_by` | UUID (FK → users) | Usuário que inseriu o documento |
| `created_at` | DateTime | Data de criação |
| `updated_at` | DateTime | Última atualização |
| `deleted_at` | DateTime | Exclusão lógica |

---

### `integrity_hashes` — Hashes de Integridade

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `device_id` | UUID (FK → devices) | Dispositivo verificado |
| `sha256` | String(64) | Hash SHA-256 (obrigatório) |
| `sha1` | String(40) | Hash SHA-1 |
| `md5` | String(32) | Hash MD5 |
| `hash_target` | String | Arquivo ou imagem verificada |
| `notes` | Text | Observações |
| `created_by` | UUID (FK → users) | Usuário que registrou |
| `created_at` | DateTime | Data do registro |

---

### `audit_logs` — Log de Auditoria

> ⚠️ **Tabela somente para inserção** — nunca modificada ou excluída.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `user_id` | UUID (FK → users) | Usuário que executou a ação |
| `action` | String | Ação realizada (ex: `CREATE_DEVICE`) |
| `resource_type` | String | Tipo de recurso (ex: `device`) |
| `resource_id` | String | ID do recurso afetado |
| `details` | JSONB | Detalhes adicionais (payload) |
| `ip_address` | String | IP do cliente |
| `created_at` | DateTime | Timestamp da ação |

---

### `documents` — Documentos da Operação

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `operation_id` | UUID (FK → operations) | Operação vinculada |
| `title` | String | Título do documento |
| `file_key` | String | Chave no MinIO |
| `file_url` | String | URL de acesso |
| `uploaded_by` | UUID (FK → users) | Usuário que enviou |
| `created_at` | DateTime | Data do upload |

---

### `operation_users` — Membros da Operação

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `operation_id` | UUID (FK → operations) | Operação |
| `user_id` | UUID (FK → users) | Usuário membro |
| `role_in_operation` | String | Papel na operação (ex: perito, delegado) |
| `added_at` | DateTime | Data de inclusão |

---

### `report_templates` — Templates de Laudo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `name` | String | Nome do template |
| `description` | Text | Descrição |
| `file_key` | String | Chave do DOCX no MinIO |
| `created_by` | UUID (FK → users) | Criador do template |
| `created_at` | DateTime | Data de criação |

---

### `generated_reports` — Documentos Gerados (v1.2.0)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `template_id` | UUID (FK → report_templates) | Template utilizado |
| `template_version` | String(50) | Versão do template |
| `device_id` | UUID (FK → devices) | Dispositivo analisado (nullable) |
| `target_id` | UUID (FK → targets) | Alvo analisado (nullable) |
| `source_type` | String(20) | Tipo de origem: `device`, `operation`, `target` |
| `operation_id` | UUID (FK → operations) | Operação vinculada (nullable) |
| `user_id` | UUID (FK → users) | Usuário que gerou |
| `report_number` | String(100) | Número do documento/relatório gerado |
| `expert_name` | String(255) | Nome do perito |
| `emission_date` | Date | Data de emissão |
| `observations` | Text | Observações |
| `docx_path` | String(1000) | Caminho do DOCX no MinIO |
| `pdf_path` | String(1000) | Caminho do PDF no MinIO |
| `docx_name` | String(500) | Nome original do DOCX |
| `pdf_name` | String(500) | Nome original do PDF |
| `placeholder_data` | JSONB | Dados/Placeholders preenchidos (snapshot) |
| `created_at` | DateTime | Data de criação |
| `updated_at` | DateTime | Última atualização |

---

## 🛡 Equipes de Deflagração (v1.1.0)

### deployment_teams

Equipes de Policiais responsáveis pela execução de uma Operação em campo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `operation_id` | UUID (FK → operations) | Operação vinculada |
| `name` | String(255) | Nome da equipe |
| `description` | Text | Descrição (opcional) |
| `leader_id` | UUID (FK → users, nullable) | Líder da equipe |
| `created_by` | UUID (FK → users, nullable) | Usuário que criou |
| `created_at` | DateTime | Data de criação |
| `updated_at` | DateTime | Data de atualização |
| `deleted_at` | DateTime | Soft delete |

---

### deployment_team_members

Associação de Policiais (Users) a Equipes de Deflagração.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `team_id` | UUID (FK → deployment_teams) | Equipe |
| `user_id` | UUID (FK → users) | Policial |
| `assigned_at` | DateTime | Data de atribuição |
| `assigned_by` | UUID (FK → users, nullable) | Atribuído por |

**Unique constraint**: (`team_id`, `user_id`)

---

### deployment_team_targets

Atribuição de Alvos a Equipes de Deflagração. Equipe e Alvo devem pertencer à mesma Operação (validado no backend).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `team_id` | UUID (FK → deployment_teams) | Equipe |
| `target_id` | UUID (FK → targets) | Alvo |
| `assigned_at` | DateTime | Data de atribuição |
| `assigned_by` | UUID (FK → users, nullable) | Atribuído por |

**Unique constraint**: (`team_id`, `target_id`)

---

### target_photos

Fotografias de identificação associadas a um Alvo (diferente de `device_photos`, que são fotos de evidências de dispositivos).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Chave primária |
| `target_id` | UUID (FK → targets) | Alvo |
| `file_path` | String(1000) | Chave do objeto no MinIO (`target-photos` bucket) |
| `file_name` | String(500) | Nome original do arquivo |
| `caption` | String(500) | Legenda (opcional) |
| `created_by` | UUID (FK → users, nullable) | Usuário que fez upload |
| `created_at` | DateTime | Data de upload |
| `updated_at` | DateTime | Data de atualização |
| `deleted_at` | DateTime | Soft delete |
