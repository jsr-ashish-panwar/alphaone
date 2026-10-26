# RoomMate Split | Alpha C-42

> **Production-Ready, Fully Mobile-Responsive Shared Flat Expense & Bill Manager for Flat Alpha C-42**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📖 Overview

**RoomMate Split** is a full-stack financial ledger web application built for roommates living together in rented flats (specifically initialized for **Flat Alpha C-42**). It eliminates messy manual calculations and split disputes by implementing authoritative integer paise financial math, PIN-verified transactions, rent/electricity billing with individual member links, debt-simplification settlement suggestions, and complete audit tracking.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 with Vite & TypeScript
- **Styling**: Tailwind CSS (with Dark/Light mode theme system & glassmorphism accents)
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Charts**: Recharts (Monthly spending and category analytics)
- **Notifications**: Animated Toast notification system (success, error, info)

### Backend
- **Runtime**: Node.js v22+ & Express.js with TypeScript (`tsx`)
- **Database**: MongoDB Atlas with Mongoose models & indexes
- **Embedded Database**: Automatic zero-setup `mongodb-memory-server` fallback for local dev & testing
- **Authentication**: Secure PIN-based authentication with bcrypt hashing, brute-force lockout, rate limiting, and JWT in HttpOnly cookies / Bearer tokens
- **Validation**: Zod schema validation
- **Financial Math**: Exact integer paise calculations (1 INR = 100 paise) with deterministic remainder distribution
- **Testing**: Vitest & Supertest unit/integration test suite

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### 2. Installation
Clone the repository and install dependencies:

```bash
# Clone the repository
git clone <repo-url>
cd C-42

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 3. Environment Variables Setup
Copy the `.env.example` file to `server/.env`:

```bash
cp .env.example server/.env
```

Default `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=memory
JWT_SECRET=alpha_c42_super_secret_jwt_key_2026_roommate_split
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

> **Note on MongoDB**: If `MONGODB_URI=memory` is specified (or omitted), an embedded in-memory MongoDB server runs automatically. To use **MongoDB Atlas**, simply replace `MONGODB_URI` with your connection string:
> ```env
> MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/roommate_split?retryWrites=true&w=majority
> ```

### 4. Running the Application

In terminal 1 (start backend API on port 5000):
```bash
npm run dev:server
```

In terminal 2 (start frontend Vite dev server on port 5173):
```bash
npm run dev:client
```

Open **`http://localhost:5173`** in your browser.

---

## 👥 Pre-seeded Demo Roommates (Flat: Alpha C-42)

The application automatically seeds **Flat Alpha C-42** with 4 active roommates and sample purchases, rent, electricity bills, and repayments:

| Roommate | Role | Username | Initial PIN | Default Status |
| :--- | :--- | :--- | :--- | :--- |
| **Rohan Sharma** | Admin | `rohan` | `1234` | Active |
| **Aarav Patel** | Member | `aarav` | `1234` | Active |
| **Priya Verma** | Member | `priya` | `1234` | Active |
| **Vikram Singh** | Member | `vikram` | `1234` | Active |

> **Flat Code**: `ALPHA-C42`
>
> 💡 *Quick Roommate Switcher*: Use the avatar dropdown in the top navigation bar to switch between roommates instantly during evaluation!

---

## 🧮 Core Features & Business Logic

### 1. 8 Dashboard Summary Metrics
- **Total Expenses This Month**: Combined flat shared purchases.
- **Monthly Rent**: Fixed flat lease for the billing period (₹16,000 for Oct 2026).
- **Electricity Bill**: Power consumption bill (BESCOM ₹2,400 for Oct 2026).
- **Groceries & Household**: Vegetables, milk, spices, cleaning supplies.
- **My Outstanding Dues**: Sum of debts you owe to flatmates.
- **Amount Others Owe Me**: Sum of reimbursements owed to you.
- **Total Amount I Have Paid**: Out-of-pocket payments made by you.
- **My Share of Total Expenses**: Your personal responsibility.

### 2. PIN-Protected Transactions
- Server-side PIN verification is required before creating an expense, reversing an entry, or recording a bill payment.
- 5 consecutive incorrect PIN attempts locks the account for 15 minutes to prevent brute-force attacks.
- PINs are hashed using bcrypt with salt rounds; plaintext PINs and hashes are never returned by API responses.

### 3. Authoritative Integer Paise Balance Engine
To eliminate floating-point arithmetic errors, all amounts are stored as integers in **paise** ($1\text{ INR} = 100\text{ paise}$).
- **Equal Splitting**: $\text{base} = \lfloor \text{totalPaise} / N \rfloor$. Remainder paise are distributed deterministically ($+1$ paise to the first $R$ members) so $\sum \text{shares} \equiv \text{totalPaise}$ exactly.
- **Net Balance Formula**:
  $$\text{NetBalance} = (\text{TotalPaid} - \text{TotalShare}) + \text{SettlementsPaid} - \text{SettlementsReceived}$$
- A positive balance ($>0$) means the member receives money.
- A negative balance ($<0$) means the member owes money.
- The invariant check $\sum \text{NetBalances} = 0$ is verified across the flat ledger.

### 4. Rent & Electricity Bill Management
- Bills are saved as a single record linked to all eligible roommates rather than multiple redundant duplicate bills.
- Duplicate prevention guarantees only one active bill per type and billing period.
- Roommates can record bill payment out-of-pocket with PIN verification.

### 5. Smart Debt Simplification (Settlement Suggestions)
- Uses a greedy two-pointer matching algorithm between debtors and creditors to find the minimum number of payments required to settle all debts.
- 1-click "Record this payment" pre-fills the settlement form.
- Receiver or Admin must confirm payments before they reduce ledger debts.

### 6. Roommate Lifecycle Management
- When a roommate leaves: their account is deactivated, past expenses and dues are preserved, they are excluded from future splits, and their outstanding balance continues to be tracked.

### 7. Complete Date-Wise Ledger & CSV Export
- View all transactions (Expenses, Rent, Electricity, Settlements) with live search, timeframe filters (Today, This Week, This Month), member filters, and category filters.
- 1-click **Export to CSV** downloads the entire filtered ledger.
- Security Audit Trail tab provides an immutable history of financial additions, reversals, and PIN modifications.

---

## 🧪 Automated Testing

Run the test suite:

```bash
# Run backend unit and integration tests (Vitest)
npm run test:server
```

Test coverage includes:
- Exact integer paise splitting and remainder allocation
- Debt minimization and settlement suggestions
- Auth login rate limits and incorrect PIN rejections
- Dashboard balance queries
- Expense creation with PIN validation

---

## 🚢 Deployment Instructions

### Deploy Frontend to Vercel or Netlify
1. Build the production client bundle:
   ```bash
   cd client
   npm run build
   ```
2. Connect your Git repository to **Vercel** or **Netlify**.
3. Set the Root Directory to `client`.
4. Set Build Command: `npm run build`
5. Set Output Directory: `dist`
6. In Environment Variables, set:
   ```env
   VITE_API_BASE=https://your-backend-api.onrender.com/api
   ```

### Deploy Backend to Render
1. Connect your repository to **Render** as a **Web Service**.
2. Set Root Directory to `server`.
3. Set Build Command: `npm install && npm run build`
4. Set Start Command: `npm start`
5. Set Environment Variables:
   - `PORT=5000`
   - `NODE_ENV=production`
   - `MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/roommate_split?retryWrites=true&w=majority`
   - `JWT_SECRET=<secure_random_string>`
   - `CLIENT_URL=https://your-frontend.vercel.app`

---

## 📄 License
This project is licensed under the MIT License.
