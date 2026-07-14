# 01 — Visão Geral do Sistema

## 🎯 Propósito

O **Sistema de Cadeia de Custódia de Evidências Digitais** é uma plataforma institucional projetada para o gerenciamento completo e auditável de evidências eletrônicas apreendidas em operações de investigação e perícia forense.

O sistema garante a **integridade, rastreabilidade e imutabilidade** de todas as ações realizadas sobre cada dispositivo ou evidência digital, desde a apreensão até o arquivamento ou devolução.

---

## 🏛 Contexto Institucional

O sistema é voltado para:

- Delegacias e unidades de perícia forense digital
- Ministérios Públicos com setor de TI forense
- Polícias Civil, Federal ou Militar com núcleo de análise digital
- Qualquer órgão público ou privado que necessite controlar evidências eletrônicas com rigor jurídico

---

## 🔍 Escopo Funcional

O sistema permite o gerenciamento completo de:

| Domínio | Descrição |
|---------|-----------|
| **Operações** | Investigações em andamento, com dashboard de métricas e documentos |
| **Alvos** | Pessoas físicas e jurídicas associadas às operações (com busca cross-operação) |
| **Dispositivos** | Evidências eletrônicas apreendidas (smartphones, HDs, pendrives, etc.) |
| **Cadeia de Custódia** | Histórico imutável e auditável de cada movimentação do dispositivo (com impressão PDF) |
| **Fotografias** | Registro fotográfico das evidências e fotos de identificação de alvos (MinIO/S3) |
| **Documentos / Laudos** | Criação, revisão, assinatura, versionamento e exclusão de documentos/laudos em PDF |
| **Hashes de Integridade** | Registro de MD5, SHA-1 e SHA-256 para verificação de evidências |
| **Estatísticas** | Relatórios quantitativos gerais com filtros anuais e estatísticas por operação |
| **Auditoria** | Log imutável de todas as ações realizadas no sistema |
| **Usuários** | Gestão de contas com papéis e permissões hierárquicos |
| **Templates de Documento** | Criação e gerenciamento de modelos DOCX de laudos/documentos periciais |

---

## 🔒 Princípios Fundamentais

O sistema foi construído sobre cinco pilares de integridade forense:

### 1. Imutabilidade da Cadeia de Custódia
Movimentações de custódia são **append-only**. Nenhum registro pode ser alterado ou excluído. O histórico completo é preservado desde a apreensão.

### 2. Log de Auditoria Imutável
Toda ação realizada no sistema — criações, edições, logins, downloads — é registrada em um log que não pode ser modificado ou apagado.

### 3. Soft Delete (Exclusão Lógica)
Nenhum registro de negócio é deletado fisicamente. Todos os itens são marcados com `deleted_at`, preservando a rastreabilidade histórica completa. Para documentos (`ExpertReport`), apenas o criador do registro ou um administrador pode realizar a exclusão lógica, deletando concomitantemente o arquivo no MinIO.

### 4. Hashes de Integridade Forense
O campo `sha256` é obrigatório no registro de integridade de qualquer evidência digital, garantindo a verificabilidade e a admissibilidade probatória.

### 5. QR Code por Evidência
Cada dispositivo cadastrado recebe automaticamente um **QR Code** único, vinculando o marcador físico ao seu registro digital no sistema.

---

## 🔄 Fluxo Básico de Uso

```
1. Login
   └── 2. Criar Operação
           └── 3. Cadastrar Alvo / Definir Equipe de Deflagração
                   └── 4. Cadastrar Dispositivo
                           ├── 5. Registrar Movimentações de Custódia (e imprimir se necessário)
                           ├── 6. Anexar Fotografias (Dispositivo/Alvo)
                           ├── 7. Registrar Hashes de Integridade
                           └── 8. Emitir Documento Pericial (via Templates)
```

---

## 📊 Módulos Funcionais

| Módulo | Identificador de Rota | Papel Mínimo |
|--------|-----------------------|--------------|
| 🔐 Autenticação | `/api/v1/auth` | — |
| 📋 Operações | `/api/v1/operations` | `analyst` |
| 👤 Alvos | `/api/v1/targets` | `analyst` |
| 👥 Equipes | `/api/v1/operations/{op_id}/teams` | `analyst` |
| 📱 Dispositivos | `/api/v1/devices` | `analyst` |
| 🔗 Custódia | `/api/v1/devices/{id}/custody` | `custody` |
| 📷 Fotografias | `/api/v1/devices/{id}/photos`, `/targets/{id}/photos` | `custody` |
| 📄 Documentos/Laudos | `/api/v1/devices/{id}/reports`, `/reports/{report_id}` | `expert` |
| #️⃣ Integridade | `/api/v1/devices/{id}/hashes` | `analyst` |
| 📊 Estatísticas | `/api/v1/stats/system`, `/operations/{id}/stats` | `analyst` |
| 📚 Auditoria | `/api/v1/audit` | `auditor` |
| 🔑 Usuários | `/api/v1/users` | `admin` |
| 📝 Templates | `/api/v1/report-templates` | `expert` |

---

## 🏗 Versão Atual

| Campo | Valor |
|-------|-------|
| Versão | `1.2.0` |
| Ambiente Padrão | `development` |
| API | REST — JSON |
| Documentação Interativa | Swagger UI + ReDoc |
