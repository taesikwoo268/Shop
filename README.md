# Shop Backend

Modular e-commerce REST API built with Bun.serve, Prisma, and PostgreSQL.

## Setup

```powershell
bun install
Copy-Item .env.example .env
bun run prisma:generate
bun run prisma:migrate -- --name init
bun run dev
```

Configure the PostgreSQL connection and JWT secrets in `.env` before running Prisma commands.

Environment files are loaded automatically by Bun; the application does not
require `dotenv`. HTTP requests are handled directly by `Bun.serve()`.

## API documentation

Start the server and open Swagger UI:

```text
http://localhost:3000/api-docs
```

The raw OpenAPI document is available at:

```text
http://localhost:3000/api-docs.json
```

For protected endpoints, log in, copy the access token, select **Authorize** in
Swagger UI, and enter the token. Swagger UI adds the `Bearer` prefix automatically.

## Available endpoints

```text
GET  /api/v1/health
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
GET  /api/v1/users/me
PATCH /api/v1/users/me
PATCH /api/v1/users/me/password
GET  /api/v1/users/me/addresses
POST /api/v1/users/me/addresses
PATCH /api/v1/users/me/addresses/:id
DELETE /api/v1/users/me/addresses/:id
PATCH /api/v1/users/me/addresses/:id/default
GET  /api/v1/categories
GET  /api/v1/categories/:slug
GET  /api/v1/admin/categories
POST /api/v1/admin/categories
PATCH /api/v1/admin/categories/:id
DELETE /api/v1/admin/categories/:id
GET  /api/v1/products
GET  /api/v1/products/:slug
GET  /api/v1/admin/products
POST /api/v1/admin/products
GET  /api/v1/admin/products/:id
PATCH /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id
POST /api/v1/admin/products/:id/images
PATCH /api/v1/admin/products/:productId/images/:imageId
DELETE /api/v1/admin/products/:productId/images/:imageId
POST /api/v1/admin/products/:id/variants
PATCH /api/v1/admin/products/:productId/variants/:variantId
DELETE /api/v1/admin/products/:productId/variants/:variantId
PATCH /api/v1/admin/products/:productId/variants/:variantId/inventory
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:itemId
DELETE /api/v1/cart/items/:itemId
DELETE /api/v1/cart
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/cancel
GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/:id
PATCH  /api/v1/admin/orders/:id/status
```

`GET /api/v1/users/me` requires an access token:

```text
Authorization: Bearer <access-token>
```

## Tests

```powershell
$env:NODE_ENV="test"
bun test
```

Integration tests create isolated users and remove them after the test run.

## Create an admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run:

```powershell
bun run admin:create
```

Log in through `/api/v1/auth/login` and use the returned access token for
`/api/v1/admin/*` endpoints.

## Seed demo data

Configure `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_EMAIL`, and
`SEED_CUSTOMER_PASSWORD` in `.env`, then run:

```powershell
bun run db:seed
```

The seed is idempotent: it updates its fixed sample records instead of creating
duplicates and does not reset unrelated database data.

## Sample data

Set seed passwords in the current shell, then run the idempotent seed command:

```powershell
$env:SEED_ADMIN_PASSWORD="your-admin-test-password"
$env:SEED_CUSTOMER_PASSWORD="your-customer-test-password"
bun run db:seed
```

Optional seed emails can be configured with `SEED_ADMIN_EMAIL` and
`SEED_CUSTOMER_EMAIL`. By default they are `admin@shop.test` and
`customer@shop.test`.

The seed creates roles, two users, one customer address, four categories, three
products, product images, five variants, and their inventory records. Running it
again updates the same sample records instead of creating duplicates.
# Shop
