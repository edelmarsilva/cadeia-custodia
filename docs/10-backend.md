# 10 — Backend

## 🐍 Visão Geral

O backend é uma API REST construída com **FastAPI** (Python 3.11+), utilizando SQLAlchemy 2.0 async como ORM e servida pelo **Uvicorn** (ASGI).

---

## 🗂 Estrutura de Diretórios

```
backend/
├── Dockerfile               # Imagem Python 3.11-slim
├── alembic.ini              # Configuração do Alembic
├── requirements.txt         # Dependências Python (pinadas)
│
└── app/
    ├── main.py              # Entry point: FastAPI app, middlewares, lifecycle
    │
    ├── api/
    │   └── v1/
    │       ├── router.py    # Agrega todos os sub-routers em /api/v1
    │       └── endpoints/
    │           ├── auth.py              # Login, refresh, me
    │           ├── users.py             # CRUD de usuários
    │           ├── operations.py        # CRUD de operações
    │           ├── targets.py           # CRUD de alvos
    │           ├── devices.py           # CRUD de dispositivos
    │           ├── custody.py           # Cadeia de custódia + timeline
    │           ├── media.py             # Fotos + laudos periciais
    │           ├── integrity.py         # Hashes de integridade
    │           ├── report_templates.py  # Templates DOCX
    │           └── report_generation.py # Geração de laudos PDF
    │
    ├── core/
    │   ├── config.py        # Pydantic Settings — lê variáveis de ambiente
    │   ├── deps.py          # FastAPI Dependencies: auth, RBAC, db session
    │   └── security.py      # JWT: criar/validar tokens; bcrypt: hash/verify
    │
    ├── db/
    │   ├── database.py      # Engines async/sync; get_async_session; Base ORM
    │   └── seed.py          # Criação do usuário admin inicial
    │
    ├── migrations/          # Alembic — histórico de migrações
    │   ├── env.py           # Ambiente Alembic (usa DATABASE_URL_SYNC)
    │   └── versions/        # Arquivos de migração gerados
    │
    ├── models/              # Modelos ORM SQLAlchemy (mapeiam tabelas)
    │   ├── base.py          # Mixins: UUIDMixin, TimestampMixin, SoftDeleteMixin
    │   ├── user_model.py
    │   ├── operation_model.py
    │   ├── target_model.py
    │   ├── device_model.py
    │   ├── custody_model.py
    │   ├── photo_model.py
    │   ├── report_model.py
    │   ├── hash_model.py
    │   ├── document_model.py
    │   ├── audit_model.py
    │   ├── operation_user_model.py
    │   ├── report_template_model.py
    │   └── generated_report_model.py
    │
    ├── schemas/             # Pydantic v2: DTOs de request/response
    │
    ├── repositories/        # Queries SQL encapsuladas por entidade
    │
    ├── services/
    │   ├── audit_service.py           # Log de auditoria (INSERT-only)
    │   ├── storage_service.py         # Upload/download/presign no MinIO
    │   ├── qrcode_service.py          # Geração de QR Code PNG
    │   └── report_generation_service.py # Preenchimento de template DOCX → PDF
    │
    ├── middleware/          # Middlewares customizados
    └── utils/               # Utilitários gerais
```

---

## 🏗 Entry Point (`main.py`)

O arquivo [`main.py`](file:///Users/edelmarsilva/Documents/cadeia-custodia/backend/app/main.py) é o ponto de entrada da aplicação:

```python
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
```

**Lifecycle:**
- **startup**: Executa `run_seed()` — cria o admin inicial se não existir
- **shutdown**: Fecha as engines de banco de dados (`dispose_engine()`)

---

## ⚙️ Configuração (`core/config.py`)

Utiliza **Pydantic Settings** para ler automaticamente as variáveis de ambiente:

```python
class Settings(BaseSettings):
    APP_NAME: str
    APP_VERSION: str
    SECRET_KEY: str
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    MINIO_ENDPOINT: str
    ALLOWED_ORIGINS: str
    
    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]
    
    model_config = SettingsConfigDict(env_file=".env")
```

---

## 🔌 Dependências FastAPI (`core/deps.py`)

As dependências são injetadas via `Depends()` nos endpoints:

| Dependência | Uso | Descrição |
|-------------|-----|-----------|
| `get_db` | `Depends(get_db)` | Fornece sessão async do banco |
| `get_current_user` | `Depends(get_current_user)` | Valida JWT e retorna o usuário autenticado |
| `require_role(...)` | `Depends(require_role("admin"))` | Verifica se o usuário tem o papel necessário |

**Exemplo:**
```python
@router.post("/devices")
async def create_device(
    payload: DeviceCreate,
    current_user: User = Depends(require_role("custody", "admin")),
    db: AsyncSession = Depends(get_db),
):
    ...
```

---

## 🔐 Segurança (`core/security.py`)

```python
# Criar access token
create_access_token(data: dict, expires_delta: timedelta) -> str

# Verificar token e retornar payload
decode_token(token: str) -> dict

# Hash de senha
hash_password(password: str) -> str

# Verificar senha
verify_password(plain: str, hashed: str) -> bool
```

---

## 🗄 Banco de Dados (`db/database.py`)

### Engines

```python
# Engine assíncrona (usada pelos endpoints FastAPI)
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
)

# Engine síncrona (usada pelo Alembic para migrações)
sync_engine = create_engine(settings.DATABASE_URL_SYNC)
```

### Sessão Assíncrona

```python
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 🛎 Serviços

### `audit_service.py` — Log de Auditoria

Registra todas as ações em uma tabela de inserção imutável:

```python
await log_action(
    session,
    action="CREATE_DEVICE",
    entity_type="device",
    entity_id=str(device.id),
    description=f"Dispositivo {device.evidence_number} cadastrado",
    old_value=None,
    new_value=device_dict,
    user_id=current_user.id,
    username=current_user.username,
    ip_address=request.client.host,
)
```

### `storage_service.py` — MinIO/S3

Abstrai o acesso ao MinIO com suporte a URLs pré-assinadas:

```python
# Upload de arquivo
object_name = upload_file(
    bucket="photos",
    data=file_bytes,
    filename="foto_dispositivo.jpg",
    content_type="image/jpeg",
)

# URL pré-assinada válida por 1 hora (com reescrita para URL pública)
url = get_presigned_url(bucket="photos", object_name=object_name)

# Deleção de objeto
delete_object(bucket="photos", object_name=object_name)
```

**Resolução de URL pública**: A URL gerada pelo MinIO usa o endereço interno `minio:9000`. O serviço reescreve para `MINIO_PUBLIC_ENDPOINT` (ex: `http://localhost:5173/storage`), que é acessível pelo browser via proxy Nginx.

### `qrcode_service.py` — QR Code

Gera QR Code PNG automaticamente no cadastro de cada dispositivo:

```python
def generate_qrcode(data: str) -> bytes:
    """Gera imagem PNG do QR Code e retorna os bytes."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    # Retorna bytes PNG
    ...
```

### `report_generation_service.py` — Geração de Laudos

Preenche templates DOCX com dados do dispositivo e gera PDF:

1. Baixa o template DOCX do MinIO
2. Substitui placeholders com dados do dispositivo, alvo e operação
3. Converte DOCX → PDF via `python-docx`
4. Faz upload do PDF gerado para o bucket `reports`
5. Retorna a URL de acesso

---

## 🔄 Migrações (Alembic)

### Configuração (`alembic.ini`)

```ini
script_location = app/migrations
sqlalchemy.url = # definido em env.py via DATABASE_URL_SYNC
```

### `migrations/env.py`

Carrega automaticamente todos os modelos e configura a URL de conexão a partir da variável de ambiente `DATABASE_URL_SYNC`.

### Comandos de Migração

```bash
# Gerar nova migração automaticamente
alembic revision --autogenerate -m "descricao"

# Aplicar todas as migrações
alembic upgrade head

# Reverter uma migração
alembic downgrade -1

# Ver histórico
alembic history --verbose

# Ver estado atual
alembic current
```

---

## 🧪 Testes

O projeto usa **pytest** com suporte assíncrono via `pytest-asyncio`:

```bash
# Rodar todos os testes
cd backend
pytest

# Com cobertura
pytest --cov=app --cov-report=html

# Testes de um módulo específico
pytest tests/test_auth.py -v
```

**Dependências de teste:**
- `pytest` 8.3.x
- `pytest-asyncio` 0.24.x
- `pytest-cov` 6.0.x
- `httpx` 0.28.x (cliente HTTP para testes de integração)
- `anyio` 4.7.x (backend async para testes)

---

## 📊 Logging

O backend configura logging estruturado via Python logging:

```python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
```

Para acompanhar em tempo real:

```bash
docker compose logs -f backend
```
