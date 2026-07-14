# 07 — Controle de Acesso (RBAC)

## 🔒 Visão Geral

O sistema implementa **RBAC** (Role-Based Access Control) com 5 papéis hierárquicos. As permissões são verificadas pelo middleware `Depends(require_role(...))` em cada endpoint FastAPI.

---

## 👥 Papéis Disponíveis

| Papel | Identificador | Descrição |
|-------|:-------------:|-----------|
| **Administrador** | `admin` | Acesso total ao sistema, incluindo gestão de usuários |
| **Custódia** | `custody` | Registra movimentações de custódia e gerencia dispositivos |
| **Perito** | `expert` | Cria e assina laudos periciais, registra hashes |
| **Analista** | `analyst` | Leitura completa, pode registrar hashes de integridade |
| **Auditor** | `auditor` | Acesso restrito ao log de auditoria |

---

## 📊 Matriz de Permissões

| Recurso | admin | custody | expert | analyst | auditor | Observações |
|---------|:-----:|:-------:|:------:|:-------:|:-------:|-------------|
| **Usuários** — CRUD | ✅ | ❌ | ❌ | ❌ | ❌ | Apenas admin |
| **Operações** — Criar/Editar | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Operações** — Visualizar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Alvos** — Criar/Editar | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Alvos** — Visualizar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Dispositivos** — Criar/Editar | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Dispositivos** — Visualizar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Custódia** — Registrar | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Custódia** — Visualizar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Fotografias** — Upload | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Fotografias** — Visualizar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Documentos** — Criar/Editar | ✅ | ❌ | ✅ | ❌ | ❌ | |
| **Documentos** — Excluir | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | **Apenas o usuário criador ou admin** |
| **Documentos** — Visualizar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Templates** — Criar/Editar | ✅ | ❌ | ✅ | ❌ | ❌ | |
| **Hashes** — Registrar | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Auditoria** — Visualizar | ✅ | ❌ | ❌ | ❌ | ✅ | |
| **Estatísticas** — Geral | ✅ | ❌ | ❌ | ❌ | ✅ | Acesso global |
| **Estatísticas** — Operação | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | Apenas se for membro da operação |

---

## 🏗 Implementação Técnica

### Dependência de Papel (Backend)

```python
# Exemplo de uso nos endpoints FastAPI
from app.core.deps import get_current_user, require_role

@router.post("/devices/{id}/custody")
async def register_custody_movement(
    id: UUID,
    payload: CustodyMovementCreate,
    current_user: User = Depends(require_role("custody", "admin")),
    db: AsyncSession = Depends(get_db),
):
    ...
```

### Hierarquia de Papéis

O sistema não usa herança automática de permissões. Cada endpoint declara explicitamente quais papéis têm acesso, mas a convenção é:

```
admin → acesso a tudo
custody → operações + dispositivos + movimentações
expert → laudos + templates + hashes
analyst → somente leitura + hashes
auditor → somente log de auditoria
```

---

## 🖥 Controle no Frontend

A Sidebar e as rotas do frontend verificam o papel do usuário autenticado (armazenado no Zustand store) para exibir ou ocultar elementos de navegação e proteger rotas:

```typescript
// Exemplo de proteção de rota no AppLayout.tsx
const { user } = useAuthStore();

// Exibe menu de Usuários apenas para admin
{user?.role === 'admin' && (
  <NavItem to="/users" icon={Users} label="Usuários" />
)}

// Exibe menu de Auditoria para admin e auditor
{['admin', 'auditor'].includes(user?.role) && (
  <NavItem to="/audit" icon={FileSearch} label="Auditoria" />
)}
```

---

## 👤 Campos do Usuário

Além do papel (`role`), cada usuário possui:

| Campo | Descrição |
|-------|-----------|
| `badge_number` | Número de matrícula/funcional |
| `unit` | Unidade ou setor de trabalho |
| `is_active` | Conta ativa ou suspensa |

---

## 🔄 Gestão de Usuários

Apenas usuários com papel `admin` podem:

- Criar novos usuários
- Alterar o papel de um usuário
- Ativar/desativar contas
- Visualizar todos os usuários do sistema

O primeiro administrador é criado automaticamente via **seed** na inicialização do backend, conforme as variáveis `ADMIN_*` do `.env`.

---

## 🛡 Login e Primeiro Acesso

| Campo | Valor padrão |
|-------|-------------|
| Usuário | `admin` |
| Senha | `Admin@123!` |

> ⚠️ **Altere a senha imediatamente após o primeiro login em produção.**

Para alterar a senha via API:

```http
PUT /api/v1/users/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "NovaSenhaSegura@2026!"
}
```
