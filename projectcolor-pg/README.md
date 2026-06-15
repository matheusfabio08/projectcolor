# ProjectColor — Backend PostgreSQL

Backend do sistema de gestão de produção têxtil, **convertido de Cloudflare D1 (SQLite) para PostgreSQL**.

Stack: **Hono + Node.js + PostgreSQL (pg)**

---

## ✅ Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ (local ou Docker)
- psql (cliente PostgreSQL) ou DBeaver/TablePlus

---

## 🚀 Passo a passo para rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir o PostgreSQL com Docker (se não tiver instalado)

```bash
docker run --name projectcolor-pg \
  -e POSTGRES_USER=colortim \
  -e POSTGRES_PASSWORD=colortim123 \
  -e POSTGRES_DB=projectcolor \
  -p 5432:5432 \
  -d postgres:16
```

> Se já tiver PostgreSQL instalado, crie o banco manualmente:
> ```sql
> CREATE DATABASE projectcolor;
> CREATE USER colortim WITH PASSWORD 'colortim123';
> GRANT ALL PRIVILEGES ON DATABASE projectcolor TO colortim;
> ```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env se necessário com sua connection string
```

### 4. Criar as tabelas no banco

```bash
npm run db:setup
```

Ou manualmente:
```bash
psql "postgresql://colortim:colortim123@localhost:5432/projectcolor" -f docs/schema.sql
```

### 5. Criar o primeiro usuário admin

Conecte no banco e insira:

```sql
INSERT INTO users (id, mocha_user_id, username, password_hash, name, email, role, is_active)
VALUES (
  gen_random_uuid()::text,
  'local-admin',
  'admin',
  encode(sha256('admin123'::bytea), 'hex'),
  'Administrador',
  'admin@projectcolor.com',
  'Admin',
  TRUE
);
```

> A senha padrão é `admin123`. Troque após o primeiro login via painel.

### 6. Rodar o servidor

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm run build
npm run start
```

O servidor sobe em: **http://localhost:3000**

---

## 📁 Estrutura do projeto

```
projectcolor-pg/
├── src/
│   ├── worker/
│   │   ├── index.ts       ← API completa (Hono)
│   │   └── db.ts          ← Pool de conexão PostgreSQL
│   └── shared/
│       └── types.ts       ← Schemas Zod (inalterado)
├── docs/
│   └── schema.sql         ← Todas as 23 tabelas PostgreSQL
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 Integração com o Frontend (React/Vite)

O frontend original (em `projectcolor/code/src/react-app`) **não precisa de alteração**.

No `vite.config.ts` do projeto original, o proxy já aponta para o backend:

```ts
// Certifique-se que o proxy aponta para localhost:3000
proxy: {
  '/api': 'http://localhost:3000'
}
```

---

## 🔐 Autenticação

- Login via `POST /api/auth/login` com `{ username, password }`
- Sessão por cookie `colortim_session` (httpOnly: false para dev)
- Ou via header `X-Session-Token`

---

## 📋 Principais diferenças D1 → PostgreSQL

| D1 (SQLite)                      | PostgreSQL                        |
|----------------------------------|-----------------------------------|
| `?` nos parâmetros               | `$1, $2, $3...`                   |
| `INTEGER` (0/1 para bool)        | `BOOLEAN` (true/false)            |
| `AUTOINCREMENT`                  | `SERIAL` / `BIGSERIAL`            |
| `DATE(coluna)`                   | `coluna::DATE`                    |
| `julianday(end) - julianday(st)` | `end::TIMESTAMP - st::TIMESTAMP`  |
| `result.meta.last_row_id`        | `RETURNING id`                    |
| `.prepare().bind().all()`        | `queryAll(sql, params)`           |
| `.prepare().bind().first()`      | `queryFirst(sql, params)`         |
| `.prepare().bind().run()`        | `queryRun(sql, params)`           |
| `is_completed = 1`               | `is_completed = TRUE`             |
| `LIKE ?`                         | `ILIKE $1` (case-insensitive)     |

---

## 🐳 Docker Compose (opcional)

Crie um `docker-compose.yml` na raiz:

```yaml
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: colortim
      POSTGRES_PASSWORD: colortim123
      POSTGRES_DB: projectcolor
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docs/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  pgdata:
```

Com isso, ao rodar `docker compose up -d`, o banco já sobe com o schema criado automaticamente.

---

## ❓ Problemas comuns

**Erro: `relation "users" does not exist`**
→ Rode `npm run db:setup` para criar as tabelas.

**Erro: `password authentication failed`**
→ Verifique o `DATABASE_URL` no `.env`.

**Erro: `Cannot find module 'pg'`**
→ Rode `npm install`.

**Porta 5432 em uso**
→ Verifique se já tem outro PostgreSQL rodando: `lsof -i :5432`
