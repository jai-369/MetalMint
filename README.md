# MetalMint

MetalMint is a self-hosted internal manufacturing tracking app for a steel almirah and steel furniture factory. It tracks every manufactured product with one permanent product code and keeps painting, stock, dispatch, sales invoices, repair/service invoices, QR labels, and history records separate from that code.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: email/password, bcrypt hashes, JWT in HTTP-only cookie
- Deployment target: Docker Compose

## Project Structure

```text
factorytrack/
|-- frontend/
|-- backend/
|-- database/
|-- docker-compose.yml
|-- .env.example
`-- README.md
```

## Prerequisites

- Node.js 20 LTS or newer
- npm
- Docker Desktop, for PostgreSQL and Docker deployment testing
- VS Code terminal opened in `C:\Users\Jai\Desktop\MetalMint\factorytrack`

## Create Environment File

```powershell
cd C:\Users\Jai\Desktop\MetalMint\factorytrack
copy .env.example .env
```

Generate a real local JWT secret and update `.env`:

```powershell
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
(Get-Content .env) -replace '^JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" | Set-Content .env
```

Review these important values in `.env`:

```text
CORS_ORIGIN=http://localhost:5173
AUTH_COOKIE_SECURE=false
APP_PUBLIC_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:4000
DATABASE_URL=postgresql://factorytrack:factorytrack@localhost:5432/factorytrack
```

## Install Dependencies

```powershell
npm install
```

## Start PostgreSQL Locally

For a fresh local database:

```powershell
docker compose up -d postgres
```

The SQL files in `database/` run automatically the first time the PostgreSQL volume is created.

If login or `/api/db-check` reports `Database connection unavailable`, start Docker Desktop first and then run:

```powershell
docker compose up -d postgres
```

If you need to recreate the local development database from scratch:

```powershell
docker compose down -v
docker compose up -d postgres
```

If you already have an older database volume and want to apply the later migration files manually:

```powershell
docker compose exec postgres psql -U factorytrack -d factorytrack -f /docker-entrypoint-initdb.d/003_product_code_sequences.sql
docker compose exec postgres psql -U factorytrack -d factorytrack -f /docker-entrypoint-initdb.d/004_search_indexes.sql
docker compose exec postgres psql -U factorytrack -d factorytrack -f /docker-entrypoint-initdb.d/005_dispatch_search_indexes.sql
docker compose exec postgres psql -U factorytrack -d factorytrack -f /docker-entrypoint-initdb.d/006_sales_repair_modules.sql
```

## Create The First Admin User

Do not hardcode the first admin password. Use this PowerShell flow:

```powershell
$env:FACTORYTRACK_ADMIN_NAME = "MetalMint Admin"
$env:FACTORYTRACK_ADMIN_EMAIL = "admin@factorytrack.local"
$adminPasswordSecure = Read-Host "Enter first admin password" -AsSecureString
$adminPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPasswordSecure)
$env:FACTORYTRACK_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPasswordPointer)
npm run create-admin
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPasswordPointer)
Remove-Item Variable:\adminPasswordSecure
Remove-Item Variable:\adminPasswordPointer
Remove-Item Env:\FACTORYTRACK_ADMIN_NAME
Remove-Item Env:\FACTORYTRACK_ADMIN_EMAIL
Remove-Item Env:\FACTORYTRACK_ADMIN_PASSWORD
```

## Run Locally In Development

Run backend and frontend together:

```powershell
npm run dev
```

Or run them separately:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`
- Database check: `http://localhost:4000/api/db-check`

## Test Login

Browser test:

1. Open `http://localhost:5173`.
2. Login with the first admin email and password.
3. Open Admin > Users.
4. Create staff and viewer users.
5. Logout and test each role.

PowerShell API test:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = "admin@factorytrack.local"; password = "your-admin-password" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:4000/api/auth/login -Method Post -ContentType "application/json" -Body $body -WebSession $session
Invoke-RestMethod -Uri http://localhost:4000/api/auth/me -WebSession $session
Invoke-RestMethod -Uri http://localhost:4000/api/auth/logout -Method Post -WebSession $session
```

## Production Build Test

```powershell
npm run build
npm run start
```

In another terminal, preview the built frontend:

```powershell
npm run preview --workspace frontend
```

## Docker Deployment Test

Before running Docker, make sure `.env` contains a real `JWT_SECRET`.
For local HTTP testing, keep `AUTH_COOKIE_SECURE=false`. Set it to `true` when serving the app over HTTPS.

```powershell
docker compose config
docker compose up -d --build
docker compose logs -f backend
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

Stop Docker services:

```powershell
docker compose down
```

Reset Docker database volume:

```powershell
docker compose down -v
```

## Reverse Proxy Deployment

If you are serving MetalMint through Nginx Proxy Manager on the VPS, keep the app on the proxy's Docker network so the proxy container can resolve `metalmint-frontend`.

The shared proxy network is usually `proxy_default`. Confirm it on the VPS with:

```bash
docker network ls
```

Then deploy with the proxy override:

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```

If the proxy network has a different name, set it explicitly:

```bash
PROXY_NETWORK=your_proxy_network docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d --build
```

## Main API Routes

```text
GET    /api/health
GET    /api/db-check
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
PATCH  /api/admin/users/:id/reset-password
PATCH  /api/admin/users/:id/disable
PATCH  /api/admin/users/:id/enable
GET    /api/product-types
POST   /api/product-types
GET    /api/product-types/:id
PATCH  /api/product-types/:id
DELETE /api/product-types/:id
GET    /api/products
POST   /api/products
GET    /api/products/:id
GET    /api/products/:id/history
GET    /api/products/code/:productCode
PATCH  /api/products/:id
POST   /api/products/:id/status
PATCH  /api/products/:id/status
GET    /api/products/:id/painting
POST   /api/products/:id/painting
PATCH  /api/products/:id/painting/:paintingRecordId
GET    /api/products/:id/dispatch
POST   /api/products/:id/dispatch
PATCH  /api/products/:id/dispatch/:dispatchRecordId
GET    /api/sales/invoices
POST   /api/sales/invoices
GET    /api/sales/invoices/:id
GET    /api/repairs
POST   /api/repairs
GET    /api/repairs/:id
PATCH  /api/repairs/:id/status
GET    /api/stock/summary
```

## Product Code Format

MetalMint generates short daily codes as:

```text
XDDMMYNN
```

Example:

```text
P2405601
I2405601
```

`P` is for products, `I` is for sales invoices, and `R` is for repair invoices. The digits are `DDMMYNN`: day, month, last year digit, and that day's running number. The sequence resets every day for each type.

## QR Labels

QR codes point to the private frontend route:

```text
/qr/:productCode
```

Unauthenticated users are sent to login first, then returned to the product lookup. Product details remain private.

## Security Notes

- `.env` is ignored by git.
- Do not deploy with `JWT_SECRET=change-this-in-development`.
- Passwords are hashed with bcrypt.
- API responses do not return `password_hash`.
- Login has rate limiting.
- Helmet and CORS are configured in the backend.
- The seeded admin row contains only a placeholder hash; create the real first admin with `npm run create-admin`.
