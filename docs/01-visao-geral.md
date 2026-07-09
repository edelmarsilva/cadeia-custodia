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
| **Alvos** | Pessoas físicas e jurídicas associadas às operações |
| **Dispositivos** | Evidências eletrônicas apreendidas (smartphones, HDs, pendrives, etc.) |
| **Cadeia de Custódia** | Histórico imutável e auditável de cada movimentação do dispositivo |
| **Fotografias** | Registro fotográfico das evidências (armazenado no MinIO/S3) |
| **Laudos Periciais** | Criação, revisão, assinatura e versionamento de laudos em PDF |
| **Hashes de Integridade** | Registro de MD5, SHA-1 e SHA-256 para verificação de evidências |
| **Auditoria** | Log imutável de todas as ações realizadas no sistema |
| **Usuários** | Gestão de contas com papéis e permissões hierárquicos |
| **Templates de Laudo** | Criação e gerenciamento de modelos DOCX de laudos periciais |

---

## 🔒 Princípios Fundamentais

O sistema foi construído sobre cinco pilares de integridade forense:

### 1. Imutabilidade da Cadeia de Custódia
Movimentações de custódia são **append-only**. Nenhum registro pode ser alterado ou excluído. O histórico completo é preservado desde a apreensão.

### 2. Log de Auditoria Imutável
Toda ação realizada no sistema — criações, edições, logins, downloads — é registrada em um log que não pode ser modificado ou apagado.

### 3. Soft Delete (Exclusão Lógica)
Nenhum registro de negócio é deletado fisicamente. Todos os itens são marcados com `deleted_at`, preservando a rastreabilidade histórica completa.

### 4. Hashes de Integridade Forense
O campo `sha256` é obrigatório no registro de integridade de qualquer evidência digital, garantindo a verificabilidade e a admissibilidade probatória.

### 5. QR Code por Evidência
Cada dispositivo cadastrado recebe automaticamente um **QR Code** único, vinculando o marcador físico ao seu registro digital no sistema.

---

## 🔄 Fluxo Básico de Uso

```
1. Login
   └── 2. Criar Operação
           └── 3. Cadastrar Alvo
                   └── 4. Cadastrar Dispositivo
                           ├── 5. Registrar Movimentações de Custódia
                           ├── 6. Anexar Fotografias
                           ├── 7. Registrar Hashes de Integridade
                           └── 8. Emitir Laudo Pericial
```

---

## 📊 Módulos Funcionais

| Módulo | Identificador de Rota | Papel Mínimo |
|--------|-----------------------|--------------|
| 🔐 Autenticação | `/api/v1/auth` | — |
| 📋 Operações | `/api/v1/operations` | `analyst` |
| 👤 Alvos | `/api/v1/targets` | `analyst` |
| 📱 Dispositivos | `/api/v1/devices` | `analyst` |
| 🔗 Custódia | `/api/v1/devices/{id}/custody` | `custody` |
| 📷 Fotografias | `/api/v1/devices/{id}/photos` | `custody` |
| 📄 Laudos | `/api/v1/devices/{id}/reports` | `expert` |
| #️⃣ Integridade | `/api/v1/devices/{id}/hashes` | `analyst` |
| 📚 Auditoria | `/api/v1/audit` | `auditor` |
| 🔑 Usuários | `/api/v1/users` | `admin` |
| 📝 Templates | `/api/v1/report-templates` | `expert` |

---

## 🏗 Versão Atual

| Campo | Valor |
|-------|-------|
| Versão | `1.0.0` |
| Ambiente Padrão | `development` |
| API | REST — JSON |
| Documentação Interativa | Swagger UI + ReDoc |
