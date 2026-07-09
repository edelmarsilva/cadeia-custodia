# CHANGELOG — Cadeia de Custódia

## [1.1.0] — 2026-07-08

### ✨ Novas Funcionalidades

#### Equipes de Deflagração
- Cadastro de Equipes de Deflagração vinculadas a Operações
- Adição e remoção de Policiais (membros) por equipe
- Atribuição de Alvos a Equipes (validação de mesma Operação no backend)
- Aba "Equipes de Deflagração" na página de detalhe da Operação
- Auditoria completa de todas as operações de equipes

#### Fotografias de Alvos
- Upload de fotografias de identificação por Alvo
- Galeria com lightbox na aba "Fotografias" do detalhe do Alvo
- Suporte a JPG, JPEG, PNG, WEBP (máx. 10 MB)
- Armazenamento em bucket MinIO isolado (`target-photos`)
- URLs presigned geradas dinamicamente (2h de validade)

#### Busca Histórica de Alvos
- Endpoint e página `/targets/history` para busca cross-operação
- Busca por nome, nome social, apelido/vulgo, CPF e RG
- Resultados exibem Operação de origem com link direto
- Endpoint `/targets/{id}/history` para histórico de um alvo específico
- Aba "Histórico" no detalhe do Alvo com carregamento lazy

### 🔧 Melhorias

- TargetDetailPage reimplementado com sistema de abas (Info, Fotos, Equipes, Histórico)
- Indexes de busca adicionados em `targets.nickname` e `targets.rg`
- Novo bucket MinIO `MINIO_BUCKET_TARGET_PHOTOS` configurável via `.env`

### 🗃️ Banco de Dados

Nova migração: `b1c2d3e4f5a6`

Tabelas criadas:
- `deployment_teams`
- `deployment_team_members` (unique constraint: team_id + user_id)
- `deployment_team_targets` (unique constraint: team_id + target_id)
- `target_photos`

Índices adicionados:
- `ix_targets_nickname`
- `ix_targets_rg`

### 🌐 API

Novos endpoints — Equipes de Deflagração:
- `GET /api/v1/operations/{op_id}/teams`
- `POST /api/v1/operations/{op_id}/teams`
- `GET /api/v1/operations/{op_id}/teams/{team_id}`
- `PATCH /api/v1/operations/{op_id}/teams/{team_id}`
- `DELETE /api/v1/operations/{op_id}/teams/{team_id}`
- `POST /api/v1/operations/{op_id}/teams/{team_id}/members`
- `DELETE /api/v1/operations/{op_id}/teams/{team_id}/members/{user_id}`
- `POST /api/v1/operations/{op_id}/teams/{team_id}/targets`
- `DELETE /api/v1/operations/{op_id}/teams/{team_id}/targets/{target_id}`

Novos endpoints — Fotografias de Alvos:
- `GET /api/v1/targets/{id}/photos`
- `POST /api/v1/targets/{id}/photos`
- `DELETE /api/v1/target-photos/{photo_id}`

Novos endpoints — Histórico de Alvos:
- `GET /api/v1/targets/history/search`
- `GET /api/v1/targets/{id}/history`

---

## [1.0.0] — 2026-07-02

### Lançamento inicial
- Cadeia de custódia completa (apreensão → análise → laudo)
- Operações, Alvos, Dispositivos, Movimentações
- Upload de fotos de dispositivos e laudos periciais
- Geração de laudos a partir de templates DOCX
- Auditoria completa de ações
- Controle de acesso baseado em funções (RBAC)
