# StockPilot — Inventory & Stock Management System

A full-stack inventory management system built with **React**, **Node.js/Express** and **MongoDB**. It ships as a single deployable web service: Express serves the JSON API under `/api` and the compiled React single-page app for every other route — ideal for **Render**.

> **Live demo credentials (after seeding):** `admin@stockpilot.dev` / `Admin@12345`
> Change these before using the app for anything real.

---

## Contents

- [What it does](#what-it-does)
- [Feature tour](#feature-tour)
- [Tech stack](#tech-stack)
- [How it runs](#how-it-runs)
- [Project structure](#project-structure)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [NPM scripts](#npm-scripts)
- [Demo data](#demo-data)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Deploying to Render](#deploying-to-render)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Roadmap](#roadmap)

---

## What it does

StockPilot is a small but complete inventory back office. It answers the questions a stock team asks every day:

- What products do we have, and in which category?
- How many units are on hand, and how much is that worth?
- What is below its reorder level or completely out of stock?
- Who received, shipped or recounted stock, and when?

You can add products, organise them into categories, link them to suppliers, record stock in/out/count movements, and watch the dashboard update. Team accounts have three roles so staff can record movements without being able to delete the catalogue.

## Feature tour

| Area | What you get |
| --- | --- |
| **Authentication** | JWT sign-in, bcrypt password hashing, persisted sessions, password change, account deactivation, rate-limited login. |
| **Dashboard** | Active product count, units on hand, inventory cost value, potential margin, low/out-of-stock alerts, 7-day stock-flow chart, stock value by category, top products by value, recent activity. |
| **Products** | Server-side search, category/stock filters, sorting, pagination, create/edit, per-unit cost and selling price, storage location, reorder level, soft stock status (`In stock` / `Low stock` / `Out of stock`). |
| **Stock ledger** | `IN`, `OUT` and `ADJUST` movements with reason, reference, note, previous/new quantity and the user who recorded it. Stock-out is blocked when there is not enough on hand. Filter by type, product, date range and free text. |
| **Categories** | Colour-coded cards with product count, unit count and stock value; create/edit/delete. Deleting keeps products but leaves them uncategorised. |
| **Suppliers** | Vendor contact book with contact name, email, phone, address, website and notes; linked product counts; create/edit/delete. |
| **Team (admin)** | Add members, change roles (`admin` / `manager` / `staff`), activate/deactivate, reset passwords, remove members. Protects the last active administrator. |
| **UX** | Responsive sidebar layout, modal workflows, toast notifications, skeleton loaders, empty states, keyboard-dismissable dialogs, reduced-motion support. |

### Roles

| Action | Admin | Manager | Staff |
| --- | :-: | :-: | :-: |
| View dashboard, products, movements, categories, suppliers | ✅ | ✅ | ✅ |
| Record stock movements | ✅ | ✅ | ✅ |
| Create/edit products, categories, suppliers | ✅ | ✅ | — |
| Delete products, categories, suppliers | ✅ | ✅ | — |
| Manage team & roles | ✅ | — | — |

---

## Tech stack

**Frontend**

- React 18 + React Router 6
- Vite 5 (dev server + production build)
- Axios with auth/error interceptors
- Lucide icons
- Hand-written CSS design system (no UI framework)

**Backend**

- Node.js 18.18+ (tested on Node 20 and 23) + Express 4
- MongoDB with Mongoose 8
- JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
- Helmet, CORS, compression, Morgan, express-rate-limit

**Deployment**

- Render Web Service (Node runtime) via `render.yaml` blueprint
- MongoDB Atlas free tier for the database

---

## How it runs

```
Browser
  │
  │  GET /            → React SPA (client/dist/index.html)
  │  GET /api/*       → Express JSON API
  ▼
┌──────────────────────────────────────────────┐
│  Render Web Service (single Node process)    │
│                                              │
│  Express                                     │
│   ├── /api/auth         JWT + bcrypt         │
│   ├── /api/products     CRUD + filters       │
│   ├── /api/categories   CRUD + aggregates    │
│   ├── /api/suppliers    CRUD                 │
│   ├── /api/movements    stock ledger         │
│   ├── /api/dashboard    aggregation pipeline │
│   ├── /api/users        admin only           │
│   └── /api/health       Render health check  │
│                                              │
│  express.static(client/dist) + SPA fallback  │
└──────────────────────────────────────────────┘
                    │ Mongoose
                    ▼
          MongoDB Atlas (or local mongod)
```

1. `npm install` installs both npm workspaces (`client`, `server`).
2. `npm run build` compiles React into `client/dist`.
3. `npm start` boots Express.
4. On boot the server connects to MongoDB, creates the first administrator if the users collection is empty, and optionally seeds demo data.
5. Express serves `client/dist` when it exists, so the API and UI share one origin — no CORS or second service needed.
6. Every write goes through Mongoose models. Stock movements update product quantities with atomic MongoDB operations and append an immutable audit record.
7. Render checks `/api/health`, which also reports the database connection state.

During local development the Vite dev server runs on `http://localhost:5173` and proxies `/api` to Express on `http://localhost:5000`.

---

## Project structure

```
.
├── client/                     # React frontend (Vite)
│   ├── index.html
│   ├── vite.config.js          # dev proxy /api → localhost:5000
│   └── src/
│       ├── api/client.js       # axios instance + token/401 handling
│       ├── components/         # Layout, modals, tables, badges, toasts…
│       ├── context/            # AuthContext
│       ├── pages/              # Dashboard, Products, Movements, …
│       ├── utils/format.js     # currency/date/status helpers
│       ├── App.jsx             # routes
│       ├── main.jsx
│       └── styles.css          # design system + responsive rules
├── server/                     # Express API
│   ├── package.json
│   └── src/
│       ├── config/             # env config + MongoDB connection (retries)
│       ├── middleware/         # auth (JWT/roles), error handling
│       ├── models/             # User, Product, Category, Supplier, StockMovement
│       ├── routes/             # auth, products, categories, suppliers,
│       │                       # movements, dashboard, users
│       ├── utils/              # query helpers + seed logic
│       ├── app.js              # Express app (middleware + static SPA)
│       └── server.js           # bootstrap, graceful shutdown
├── render.yaml                 # Render Blueprint
├── docker-compose.yml          # Optional local MongoDB container
├── .env.example                # copy to .env for local development
├── package.json                # npm workspaces + root scripts
└── README.md
```

---

## Quick start (local)

### Prerequisites

- Node.js **18.18+** and npm 9+
- MongoDB: a local `mongod`, a Docker container, **or** a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster

> No MongoDB installed? If you have Docker, run `docker compose up -d` from the project root — it starts MongoDB on `mongodb://127.0.0.1:27017`.

### 1. Install

```bash
npm install
```

This single command installs the root tooling, the API and the React app thanks to npm workspaces.

### 2. Configure environment

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edit `.env` and set `MONGODB_URI`. Everything else has a working default for local development:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/stockpilot
JWT_SECRET=change-me-to-a-long-random-string
PORT=5000
ADMIN_EMAIL=admin@stockpilot.dev
ADMIN_PASSWORD=Admin@12345
SEED_DEMO_DATA=true
```

### 3. Load sample inventory (optional but recommended)

```bash
npm run seed:demo
```

This creates the administrator plus 5 categories, 5 suppliers, 22 products and their movement history. Add `-- --reset` to wipe inventory collections first:

```bash
npm run seed:demo -- --reset
```

> Seeding is idempotent for products: demo inventory is only inserted when the products collection is empty. Existing users are never overwritten.

### 4. Run both apps

```bash
npm run dev
```

| Service | URL |
| --- | --- |
| React (Vite, hot reload) | http://localhost:5173 |
| Express API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

Sign in with `admin@stockpilot.dev` / `Admin@12345` (or whatever you set in `.env`).

### 5. Run like production

```bash
npm run build
npm start
```

Open http://localhost:5000 — Express now serves the built React app and the API from one port.

---

## Environment variables

All variables live in the repository root `.env` (loaded by both the API and the seed script). On Render, set them in the service's **Environment** tab.

| Variable | Required | Default | Description |
| --- | :-: | --- | --- |
| `MONGODB_URI` | ✅ | `mongodb://127.0.0.1:27017/stockpilot` | MongoDB connection string. Use an Atlas SRV URI in production. |
| `JWT_SECRET` | ✅ (prod) | insecure dev fallback | Secret used to sign auth tokens. Use a long random value. |
| `JWT_EXPIRES_IN` | — | `7d` | Token lifetime (e.g. `12h`, `7d`). |
| `PORT` | — | `5000` | HTTP port. Render injects this automatically. |
| `NODE_ENV` | — | `development` | Set to `production` on Render. |
| `ADMIN_NAME` | — | `Admin` | Name for the bootstrap administrator. |
| `ADMIN_EMAIL` | — | `admin@stockpilot.dev` | Email for the bootstrap administrator. |
| `ADMIN_PASSWORD` | — | `Admin@12345` | Password for the bootstrap administrator. **Change it.** |
| `SEED_DEMO_DATA` | — | `false` | When `true`, loads demo inventory on boot if no products exist. |
| `CORS_ORIGIN` | — | same origin only | Optional comma-separated list of allowed origins if you host the client on a separate domain. |

> Keep `.env` out of git — it is already in `.gitignore`.

---

## NPM scripts

Run these from the repository root.

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs API and Vite dev server together via `concurrently`. |
| `npm run dev:server` | API only, with `node --watch` auto-restart. |
| `npm run dev:client` | React dev server only. |
| `npm run build` | Production build of the React app into `client/dist`. |
| `npm start` | Starts Express (serves the built SPA if present). |
| `npm run seed` | Ensures a bootstrap administrator exists. |
| `npm run seed:demo` | Seeds admin + demo categories, suppliers, products and movements. |
| `npm run seed:demo -- --reset` | Clears inventory collections, then reseeds demo data. |

---

## Demo data

`SEED_DEMO_DATA=true` (or `npm run seed:demo`) populates:

- **22 products** across electronics, office supplies, furniture, accessories and cleaning
- **5 categories** with distinct colours
- **5 suppliers** with contacts
- **Opening stock receipts, sales and cycle counts**, with timestamps spread over the last week so the dashboard chart is populated
- Deliberate **low-stock and out-of-stock** items so alerts are visible

The seed script is safe to run repeatedly: it only inserts demo products when the products collection is empty, and it never resets passwords of existing users.

---

## API reference

Base URL: `/api`. All routes except `POST /auth/login`, `POST /auth/register` and `GET /health` require:

```
Authorization: Bearer <jwt>
```

Responses are JSON. Errors look like:

```json
{ "message": "Insufficient stock. Only 3 pcs of \"USB-C Docking Station\" available." }
```

### Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | public (rate-limited) | Sign in, returns `{ token, user }`. |
| `POST` | `/auth/register` | public **only for the first user**, then admin | Create an account. The first account is always an admin. |
| `GET` | `/auth/me` | any user | Current user profile. |
| `PUT` | `/auth/password` | any user | Change password (`currentPassword`, `newPassword`). |

### Products

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/products` | any user | Paginated list. Query: `search`, `category`, `supplier`, `status` (`ok\|low\|out`), `sort`, `page`, `limit`, `includeInactive`. |
| `GET` | `/products/summary` | any user | Lightweight list for selectors. |
| `GET` | `/products/:id` | any user | Product + its last 10 movements. |
| `POST` | `/products` | admin, manager | Create. An opening quantity creates an `IN` movement. |
| `PUT` | `/products/:id` | admin, manager | Update details. Quantity must change through `/movements`. |
| `DELETE` | `/products/:id` | admin | Delete product; ledger entries keep name/SKU snapshots. |

### Stock movements

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/movements` | any user | Paginated ledger. Query: `search`, `type`, `product`, `from`, `to`, `page`, `limit`. |
| `POST` | `/movements` | any user | Record stock. Body: `productId`, `type` (`IN\|OUT\|ADJUST`), `quantity`, `reason`, `reference`, `note`. `OUT` cannot exceed available stock; `ADJUST` sets the counted absolute quantity. |
| `GET` | `/movements/product/:productId` | any user | Last 50 movements for a product. |

### Categories & suppliers

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/categories` | any user | Categories with product count, units and stock value. |
| `POST` | `/categories` | admin, manager | Create. |
| `PUT` | `/categories/:id` | admin, manager | Update. |
| `DELETE` | `/categories/:id?force=true` | admin, manager | Delete; linked products become uncategorised. |
| `GET` | `/suppliers` | any user | Suppliers with linked product counts. |
| `POST` | `/suppliers` | admin, manager | Create. |
| `PUT` | `/suppliers/:id` | admin, manager | Update. |
| `DELETE` | `/suppliers/:id` | admin, manager | Delete; linked products keep existing but lose the supplier reference. |

### Dashboard & team

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/dashboard` | any user | Summary metrics, 7-day trend, category breakdown, top products, low stock, recent activity. |
| `GET` | `/users` | admin | List team members. |
| `POST` | `/users` | admin | Add a member. |
| `PATCH` | `/users/:id` | admin | Update name, role, active flag or password. Self-role/self-deactivation blocked. |
| `DELETE` | `/users/:id` | admin | Remove a member (last active admin is protected). |
| `GET` | `/health` | public | Service status, database state, uptime. |

---

## Data model

```
User           name, email (unique), password (bcrypt, select:false),
               role (admin|manager|staff), active, lastLoginAt

Category       name (unique), description, color

Supplier       name, contactName, email, phone, address, website, notes, active

Product        name, sku (unique, uppercase), description,
               category → Category, supplier → Supplier,
               quantity, reorderLevel, unitPrice, costPrice, unit, location,
               isActive
               virtuals: stockStatus (ok|low|out), stockValue

StockMovement  product → Product (name/SKU snapshotted),
               type (IN|OUT|ADJUST), quantity,
               previousQty, newQty, reason, reference, note,
               performedBy → User, performedByName, createdAt
```

Stock mutations use atomic MongoDB updates (`$inc` with a `quantity >= n` guard for stock-out) so two people recording movements at the same time cannot drive stock negative.

---

## Deploying to Render

Render does **not** host MongoDB. You need a free MongoDB Atlas cluster, then deploy this repo as a Render web service. The included `render.yaml` deploys everything in one step and the single service serves both the API and the React app.

### Step 1 — Push the project to GitHub

```bash
git init
git add .
git commit -m "StockPilot: inventory & stock management system"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### Step 2 — Create the database (MongoDB Atlas, free)

1. Sign up at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) and create a **free M0** cluster.
2. **Database Access → Add New Database User** — create a user with a strong password (e.g. `stockpilot`).
3. **Network Access → Add IP Address** — allow `0.0.0.0/0` (Render's outbound IPs are dynamic on free plans). You can tighten this later with static egress.
4. **Connect → Drivers** — copy the connection string and add the database name:
   ```
   mongodb+srv://stockpilot:<password>@cluster0.xxxxx.mongodb.net/stockpilot?retryWrites=true&w=majority
   ```
5. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, etc.).

### Step 3 — Deploy with the Blueprint (recommended)

1. In Render, click **New + → Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` and proposes a free web service named `stockpilot`.
3. Fill in the two values marked `sync: false`:
   - **`MONGODB_URI`** — the Atlas connection string from Step 2.
   - **`ADMIN_PASSWORD`** — a strong password for the first administrator.
4. Click **Apply**. Render runs:
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
5. When the deploy is live, open the URL and sign in with `ADMIN_EMAIL` (default `admin@stockpilot.dev`) and the password you supplied.

`JWT_SECRET` is generated automatically by Render. `SEED_DEMO_DATA=true` is set in the blueprint so the dashboard has data on first boot — set it to `false` (or delete the variable) if you want an empty workspace.

### Step 4 — Deploy manually (alternative)

If you prefer not to use the blueprint:

1. **New + → Web Service**, connect the repo.
2. Runtime **Node**, plan **Free**, region of your choice.
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. Add environment variables:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas URI |
   | `JWT_SECRET` | long random string (or use Generate) |
   | `ADMIN_EMAIL` | your admin email |
   | `ADMIN_PASSWORD` | a strong password |
   | `SEED_DEMO_DATA` | `true` for a populated demo, `false` for empty |
   | `NODE_VERSION` | `20.18.1` |

6. Deploy and verify `https://<service>.onrender.com/api/health` returns `"database": "connected"`.

### After the first deploy

- Sign in and **change the admin password** from *Settings → Change password* (or rotate `ADMIN_PASSWORD` before first boot).
- Set `SEED_DEMO_DATA=false` once your real catalogue exists.
- Free Render services spin down after ~15 minutes of inactivity; the first request afterwards takes 30–60 seconds to cold start. Atlas free tier is always available.
- Every push to `main` redeploys automatically (`autoDeploy: true`).
- No persistent disk is needed: MongoDB stores all data, and the React build is regenerated during deployment.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `[api] Failed to start: ...` and `MongooseServerSelectionError` | `MONGODB_URI` is wrong, the database user does not exist, or the Atlas IP allow-list blocks Render. Allow `0.0.0.0/0` and confirm the password is URL-encoded. |
| Render deploy succeeds but the page is blank | The build did not run or `client/dist` is missing. Ensure build command is `npm install && npm run build` and that `client/package.json` exists. Check browser console for 404s under `/assets/`. |
| `401 Authentication required` right after signing in | `JWT_SECRET` changed between deploys (invalidates existing tokens). Sign in again. |
| Cannot sign in with the documented credentials | `ADMIN_*` variables only create an account when no admin exists. Use `npm run seed` locally, or delete the users collection to re-bootstrap an admin. |
| `E11000 duplicate key` when creating a product | The SKU already exists. SKUs are unique and stored uppercase. |
| Stock-out returns `409 Insufficient stock` | Correct behaviour — another movement consumed the stock. Refresh and retry. |
| Free Render service takes a long time to respond | Free instances sleep after inactivity. The first request cold-starts the container. |
| `npm ERR! ERESOLVE` during install | Use Node 18.18+ and npm 9+. Delete `node_modules` and `package-lock.json`, then reinstall. |
| Demo data did not load | Demo seeding only runs when the products collection is empty. Set `SEED_DEMO_DATA=true` and restart with an empty `products` collection, or run `npm run seed:demo -- --reset`. |

---

## Security notes

- Passwords are hashed with bcrypt (10 rounds) and never returned by the API.
- JWTs expire (7 days by default); the client clears them on `401`.
- Login and registration are rate-limited (30 attempts / 15 min / IP), and the API globally limits requests.
- Helmet sets standard security headers; JSON body size is capped at 1 MB.
- Role checks are enforced server-side on every mutating route, not just hidden in the UI.
- The last active administrator cannot be deactivated or deleted.
- This project is a demonstration/portfolio app. Before production use, add HTTPS-only cookies or refresh tokens, audit logging for auth events, backup/restore procedures, and tighter Atlas network rules.

---

## Roadmap

- CSV import/export of products and movements
- Purchase orders / goods-received notes
- Barcode scanning and label printing
- Email or Slack alerts when items hit reorder levels
- Multi-warehouse stock per location
- Automated test suite (Jest + Supertest, Vitest + React Testing Library)

---

Built with React, Node.js, Express and MongoDB · ready for Render.
