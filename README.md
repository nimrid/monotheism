# Monotheism Mobile App 📖⚡

Welcome to **Monotheism**, a premium, feature-rich React Native mobile application built on Expo, designed to enrich your biblical study and reading journey. With structured plans, study aids, and advanced Web3 integrations, Monotheism merges classic theological research with modern app features.

<p align="center">
  <img src="./assets/images/app-logo.png" width="150" height="150" style="border-radius: 20%;" alt="Monotheism Logo" />
</p>

---

## ✨ Core Features

Monotheism offers a full suite of features curated to provide the ultimate spiritual study experience:

*   **📖 Structured Reading Plans** – Create and manage customizable daily reading plans tailored to your timeframe, complete with progress tracking and automatic stat summaries.
*   **🔥 Day Streaks & Tracking** – Keep consistent with your reading habit using dynamic day-streak trackers and historical active days metrics.
*   **✝️ Parables of Jesus** – Learn from interactive lessons detailing all the parables of Jesus, complete with spiritual contexts and translations.
*   **📚 Comprehensive Bible Dictionary** – Instantly search and look up definitions for thousands of biblical terms directly within the app.
*   **🎥 Hermeneutics & Study Videos** – Dive deeper into biblical interpretation through an integrated video streaming resource hub.
*   **💾 Saved Verses & Notes** – Easily bookmark meaningful verses and add personal reflection notes, all synced securely to the database.

---

## 🔗 Solana SKR Token Integration

Monotheism features a production-ready **on-chain Web3 premium payment flow** using Solana mobile tech:

1.  **Centralized Premium Modal (`PremiumPaywallModal`)**
    *   Unified gated-access screen utilized universally across all premium sections (Bible Stories, Parables, and Bible Dictionary).
2.  **Solana SPL Token Transfers (SKR Token)**
    *   Initiate real token transactions utilizing the specific SKR SPL Mint: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` with full decimal adjustments.
3.  **Pre-Flight Deduplication & Restores**
    *   Checks the backend database before initializing transaction sequences. If a user previously paid, their premium status is restored silently, preventing redundant payments.
4.  **Auto-Sync & Device Portability**
    *   Subscriptions are tied directly to the connected wallet address on-chain. Restores work instantly upon reloading the wallet address on new devices or app reinstalls.
5.  **Granular Error Feedback**
    *   Proper, user-friendly handling for complex states: `WALLET_NOT_CONNECTED`, `INSUFFICIENT_BALANCE`, `USER_REJECTED`, and `NETWORK_ERROR`.

---

## 🛠️ Tech Stack & Architecture

### **Front-End Mobile Client**
*   **Core:** React Native, TypeScript, Expo Router (File-based navigation)
*   **Web3 Client:** `@solana/web3.js`, `@solana/spl-token`, and `@solana-mobile/mobile-wallet-adapter-protocol-web3js` for secure on-device transaction signing.
*   **Storage:** `@react-native-async-storage/async-storage` for local state persistence.

### **Back-End API (`/backend`)**
The backend has been modularized from a single monolith server into a clean, modern Express router-based architecture:
*   `server.js` — Lightweight entry point handling middlewares and core routes.
*   `db.js` — Shared Postgres connection pool singleton (efficient connection management).
*   `initDB.js` — Automated schema initializer (3-phase migration strategy ensuring compatibility with older database structures by dynamically adding missing FK columns, constraints, and indexes).
*   `routes/` — Modular route files:
    *   `users.js` — Wallet connections and user data management.
    *   `savedVerses.js` — Verse bookmarks and notes.
    *   `readingPlans.js` — Plan generation, payment validation, and trial options.
    *   `readingProgress.js` — Chapter completions, streaks, and plan statistics.
    *   `subscriptions.js` — Gated premium status checks and on-chain payment registration.

---

## 🚀 Getting Started

Ensure you have [Node.js](https://nodejs.org) and [Git](https://git-scm.com) installed.

### **1. Configure Environment Variables**

Before starting, establish configuration environments for the mobile client and the API server.

**App Client Environment (`/.env`):**
```ini
EXPO_PUBLIC_SOLANA_RPC=https://solana-mainnet.g.alchemy.com/v2/your-api-key # Or public Solana RPC
EXPO_PUBLIC_SKR_MINT=SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
EXPO_PUBLIC_SKR_DECIMALS=6
EXPO_PUBLIC_RECIPIENT_WALLET=
```

**Backend Environment (`/backend/.env`):**
```ini
DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=verify-full
PORT=3000
```

### **2. Setup and Run Backend**
```bash
cd backend
npm install
npm run dev # Launches Node server with Nodemon (auto-updates database schema)
```

### **3. Setup and Run Mobile Client**
Open a new terminal session at the project root:
```bash
npm install
npx expo start # Select "a" for Android, "i" for iOS, or "w" for web
```

Alternatively, use the convenience shell script:
```bash
./start-with-backend.sh
```

---

## 📚 Development & Deployment Docs

Need to read more deeply into the specific mechanics? Check out our detailed markdown guides:
*   [QUICK_START.md](./QUICK_START.md) — Rapid configuration checklist.
*   [PROGRESS_TRACKING_GUIDE.md](./PROGRESS_TRACKING_GUIDE.md) — Comprehensive explanation of reading stats logic.
*   [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical database schemas, tables, and relation diagrams.
