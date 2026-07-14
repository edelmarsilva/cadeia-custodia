# CHANGELOG — Cadeia de Custódia

## [1.2.0] — 2026-07-14

### ✨ Novas Funcionalidades

#### Geração de Documentos Gerais
- Emissão de documentos relacionados a Operações e Alvos, além do fluxo existente para Dispositivos.
- Interface atualizada: substituição do termo "Laudo" por "Documento" (Aba "Laudos" -> "Documentos", botão "Gerar Laudo" -> "Gerar Documento").
- Expansão massiva de placeholders (`PLACEHOLDER_MAP`) no motor de templates para abranger dados detalhados de alvos, operações, custódia e especificações técnicas de dispositivos.

#### Impressão de Movimentações da Custódia
- Adição do botão **Imprimir** na aba de Custódia do Dispositivo.
- Gera um layout otimizado e limpo em PDF via diálogo de impressão nativo do navegador contendo todo o histórico de movimentações da cadeia de custódia.

#### Restrição e Controle de Remoção de Documentos
- Controle baseado em propriedade (ownership): apenas o usuário criador do documento ou um administrador possui permissão para apagar ou excluir documentos.
- Soft-delete com expurgo automático correspondente do arquivo físico no storage do MinIO.

#### Relatórios Estatísticos e Filtros Anuais
- Nova página `/relatorios/estatisticos` com dois níveis de visão:
  - **Geral do Sistema**: Gráficos e cards de contagem, breakdowns (por status, tipo, movimentação) e top operações.
  - **Por Operação**: Select dinâmico para escolher a operação e exibir seus cards e breakdowns consolidados.
- Suporte a filtros por ano de execução das operações na visualização geral do sistema (Geral ou por Ano específico).
- Geração de PDF dos relatórios estatísticos formatados diretamente pelo botão "Imprimir PDF".

### 🗃️ Banco de Dados

Nova migração: `d4e5f6a7b8c9`

Tabelas alteradas:
- `generated_reports`: adicionados campos `target_id` e `source_type` para suportar emissão por Alvos e Operações.
- `expert_reports`: adicionado campo `deleted_at` para suporte a soft-delete de documentos.

### 🌐 API

Novos endpoints:
- `DELETE /api/v1/reports/{report_id}` - Excluir documento/laudo (apenas dono ou admin)
- `GET /api/v1/stats/system` - Estatísticas do sistema (admin/auditor, com query param `year`)
- `GET /api/v1/operations/{operation_id}/stats` - Estatísticas detalhadas por operação

---

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
