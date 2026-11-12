# SUMMIT Dental & Orthopedic Clinic Management System

A standalone, enterprise-grade, real-time medical clinic management application with PostgreSQL, React 19, Express.js, Prisma ORM, Socket.IO, and client-side PDF/WhatsApp sharing.

---

## 🏗️ Application Architecture

```
[ Web Browser ]
      │ (Port 8080)
      ▼
┌────────────────────────────────────────────────────────┐
│  Service 1: clinic_frontend (Nginx Alpine)             │
│  - Serves compiled React 19 single-page application    │
│  - Reverse proxies /api/* -> clinic_backend:5000/api/* │
│  - Reverse proxies /socket.io/* -> clinic_backend:5000 │
└──────────────────────────┬─────────────────────────────┘
                           │ (Internal Docker Network: clinic_network)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Service 2: clinic_backend (Node 20 Alpine)            │
│  - Express.js REST API & Socket.IO real-time server    │
│  - Prisma ORM runtime & automated catalog inspection   │
│  - Internal only: Protected behind Nginx gateway       │
│  - Healthcheck on GET /api/health                      │
└──────────────────────────┬─────────────────────────────┘
                           │ (Internal Docker Network: clinic_network)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Service 3: clinic_postgres (PostgreSQL 16 Alpine)     │
│  - Persistent named volume (clinic_pgdata)             │
│  - Internal only: No host port conflict with port 5432 │
│  - Healthcheck via pg_isready                          │
└────────────────────────────────────────────────────────┘
```

---

## 🐳 Quick Start with Docker (Recommended)

Run the entire application without installing Node.js, Python, or PostgreSQL on your computer.

### Prerequisites
- **Git**: [https://git-scm.com/](https://git-scm.com/)
- **Docker Desktop** (Windows / macOS) or **Docker Engine with Docker Compose v2** (Linux):
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - *Ensure Docker Desktop is running before executing commands.*

---

### Step 1: Clone the Repository
```bash
git clone <YOUR_REPOSITORY_URL>
cd Dental-Ortho-Clinic
```

---

### Step 2: Configure Environment Variables

#### Windows (PowerShell):
```powershell
Copy-Item .env.example .env
```

#### Linux / macOS (Bash):
```bash
cp .env.example .env
```

> **Special Characters in Passwords:** The container startup script automatically handles URL percent-encoding for passwords containing special characters (`@`, `#`, `%`, `:`, etc.).
>
> **Security Configuration (JWT_SECRET):** A pre-configured cryptographic key is provided in `.env.example`. To generate a unique 256-bit key for production, run:
> ```bash
> openssl rand -base64 32
> # or in Node.js:
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### Step 3: Build & Start All Services

```bash
docker compose up -d --build
```

#### What Docker Does Automatically:
1. Starts the `clinic_postgres` database container and verifies health via `pg_isready`.
2. Starts the `clinic_backend` container. It inspects the PostgreSQL catalog:
   - On an **empty database (cold boot)**: Automatically runs `prisma db push` and seeds the master administrator (`admin` / `admin123`).
   - On an **existing database (restart/rebuild)**: Preserves all tables and records without modifying existing data.
3. Builds the optimized React 19 production bundle and launches `clinic_frontend` on Nginx on host port `8080`.

---

### Step 4: Open & Log In

Open your browser and navigate to:
👉 **[http://localhost:8080](http://localhost:8080)**

#### Initial Master Credentials (from `prisma/seed.ts`):
| Field | Value |
| :--- | :--- |
| **Username** | `admin` |
| **Password** | `admin123` |
| **Role** | Clinic Master Administrator |

> **User Account Creation & Password Change:**  
> - **Mandatory First Step:** Log in as `admin` with `admin123` and immediately change your password under **User Management / Admin Portal**.
> - Then create your Doctor (`DOCTOR_DENTAL`, `DOCTOR_ORTHO`) and Receptionist (`RECEPTIONIST`) user accounts with their respective credentials.

---

## 🌐 Application Endpoints & Ports

| Service | Container Port | Host Port | Accessibility | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web Gateway (Nginx)** | `80` | `8080` (or `${FRONTEND_PORT}`) | **Public** | Web UI, `/api` proxy, `/socket.io` proxy |
| **Backend REST & Socket.IO API** | `5000` | None (Internal) | **Internal Only** | Protected behind Nginx reverse proxy |
| **PostgreSQL Database** | `5432` | None (Internal) | **Internal Only** | Prevents host port 5432 conflicts |
| **Frontend Health Check** | `80` | `http://localhost:8080/health` | **Public** | Gateway availability monitoring |

---

## 🛠️ Docker Management & Operations Commands

### View Container Status
```bash
docker compose ps
```

### View Live Logs
```bash
# Stream all logs
docker compose logs -f

# Stream only backend API logs
docker compose logs -f backend

# Stream only frontend Nginx logs
docker compose logs -f frontend

# Stream only database logs
docker compose logs -f postgres
```

### Restart Services
```bash
docker compose restart
```

### Stop Containers (Preserving All Data)
```bash
docker compose down
```

### Rebuild Images (After Code Changes)
```bash
docker compose up -d --build
```

### Clean Rebuild from Scratch
```bash
docker compose build --no-cache
docker compose up -d
```

---

## ⚠️ CRITICAL: Data Persistence & Volume Protection

All clinical records, patients, invoices, and appointments are stored inside the named Docker volume:  
📁 **`clinic_pgdata`**

- **`docker compose down`** ➔ Stops and removes containers and networks. **Your database records are 100% SAFE and PRESERVED.**
- **`docker compose restart`** ➔ Recreates containers. **Data is PRESERVED.**
- **`docker compose up -d --build`** ➔ Updates container code. **Data is PRESERVED.**
- ❌ **NEVER RUN:** `docker compose down -v`  
  *(The `-v` flag permanently deletes all database volumes and erases clinical records!)*

---

## 💾 Database Backup & Restore

### Backup Database to File (Run on Host):
```bash
# Windows PowerShell
docker compose exec -T postgres pg_dump -U postgres -d clinic_db > clinic_backup.sql

# Linux / macOS
docker compose exec -T postgres pg_dump -U postgres -d clinic_db > clinic_backup.sql
```

### Restore Database from File:
```bash
# Windows PowerShell
Get-Content clinic_backup.sql | docker compose exec -T postgres psql -U postgres -d clinic_db

# Linux / macOS
docker compose exec -T postgres psql -U postgres -d clinic_db < clinic_backup.sql
```

---

## 🔧 Troubleshooting

### 1. Port 8080 Already in Use
If another application on your computer is using port 8080:
1. Open `.env`.
2. Change `FRONTEND_PORT=3000` (or another free port).
3. Restart: `docker compose up -d`.
4. Access the application at `http://localhost:3000`.

### 2. Local Host PostgreSQL Already on Port 5432
PostgreSQL inside Docker is deliberately **not mapped to host port 5432**. It communicates with the backend exclusively across the isolated Docker network (`clinic_network`). This completely eliminates any conflict with local PostgreSQL installations.

### 3. Windows CRLF Line Ending Issue
If building on Windows, Git may convert Linux line endings to CRLF. The `backend/Dockerfile` includes automated `sed -i 's/\r$//'` to prevent script execution errors.

---

## 💻 Alternative: Running Without Docker (Bare Metal / Development)

If you prefer running directly on your host machine:

### Prerequisites:
- Node.js v18+
- PostgreSQL v14+ (running locally on port `5432`)

### 1. Start Backend:
```bash
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

### 2. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).
