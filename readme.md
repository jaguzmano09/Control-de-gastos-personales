# 💰 Control de Gastos Personales

> A modern Progressive Web App for personal finance management, designed to centralize expenses, budgets, accounts, and intelligent transaction classification in a single platform.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js\&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss\&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase\&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel\&logoColor=white)](https://vercel.com/)

**Live application:**
https://control-de-gastos-personales-nine.vercel.app/

**Repository:**
https://github.com/jaguzmano09/Control-de-gastos-personales

---

## 📌 Overview

**Control de Gastos Personales** is a personal finance management application built as a Progressive Web App (PWA).

The project was created to replace a traditional spreadsheet-based expense tracking workflow with a centralized web application capable of handling:

* Income and expense tracking
* Multiple financial accounts
* Account-specific wallets
* Category-based budgets
* Wallet budgets and rollover
* Transaction review workflows
* Intelligent transaction categorization
* Duplicate transaction detection
* Bank notification processing
* Future multi-user support
* Secure user data isolation

The application is designed around a simple principle:

> **Financial information should be easy to record, easy to understand, and reliable enough to support better financial decisions.**

---

## ✨ Features

### 💳 Account & Wallet Management

Organize transactions across different financial sources and accounts.

The current data model supports accounts such as:

* Nequi
* Ualá
* Bancolombia
* DaviPlata
* Dale
* Cash

Accounts can optionally contain **wallets**, allowing more detailed organization of available funds.

For example:

```text
Nequi
├── Market
├── Services
└── Other Expenses
```

The database model is designed so that additional accounts can support wallets in the future without requiring structural changes.

---

### 🧾 Transaction Management

Transactions are designed around a structured lifecycle rather than being treated as simple records.

Supported transaction types include:

* Income
* Expense
* Transfer
* Savings
* Investment

Transactions can originate from different sources:

```text
Manual
OCR
Bank notification
Historical migration
```

Each transaction can also have a status:

```text
pending_review
confirmed
duplicate
```

Only **confirmed transactions** are included in financial calculations such as dashboards, budgets, and wallet balances.

This prevents automatically imported data from affecting financial summaries before it has been reviewed.

---

### 🤖 Intelligent Categorization

The project integrates **Gemini API** to support automatic transaction classification.

The system is designed to combine AI suggestions with learned categorization rules.

For example:

```text
"NETFLIX.COM"
      ↓
Known pattern?
      ↓
Yes → Subscriptions
      ↓
No → Gemini classification
```

When a user corrects an automatically suggested category, the application can store that decision as a reusable categorization rule.

This allows the system to gradually improve its suggestions based on the user's own financial behavior.

---

### 🔍 Duplicate Detection

Bank notifications and other automated sources may occasionally contain the same transaction more than once.

The system therefore uses an `external_reference` to identify potential duplicates.

Instead of silently deleting a suspected duplicate, the transaction can be marked as:

```text
duplicate
```

The user can then review the transaction and determine whether it should actually be considered a duplicate.

This approach preserves the original information while keeping the final financial record under user control.

---

### 📊 Category Budgets

Budgets can be defined per category and month.

For example:

```text
Market
Budget:       $500,000
Spent:        $325,000
Available:    $175,000
```

The amount spent is calculated from confirmed transactions instead of being stored as an independent static value.

Budget alert thresholds can also be configured to notify the user when spending reaches a specified percentage.

---

### 👛 Wallet Budgets & Rollover

Wallets can have their own monthly budgets.

The project distinguishes between:

```text
Assigned amount
+
Rollover amount
=
Available budget
```

This makes rollover transparent and auditable.

For example:

```text
Previous month remaining:   $120,000
New monthly allocation:     $300,000
-----------------------------------
Available this month:       $420,000
```

The rollover mechanism does not create artificial transactions in the ledger.

---

### 📩 Automated Bank Notifications

The architecture supports automated transaction ingestion from bank notifications.

The planned flow is:

```text
Bank notification
        ↓
Email / webhook ingestion
        ↓
Transaction extraction
        ↓
Duplicate detection
        ↓
Categorization
        ↓
Pending review
        ↓
User confirmation
        ↓
Financial calculations
```

This allows automation without sacrificing user control over financial records.

---

### 📧 Gmail Integration

The project architecture includes support for connecting a Gmail account through OAuth.

The purpose is to identify financial notification emails and associate them with the corresponding account.

For security, sensitive Gmail tokens are designed to remain server-side and are never exposed to the client.

---

### 📱 Progressive Web App

The application is designed as a **PWA**, allowing it to behave more like a native application while remaining web-based.

The PWA configuration includes:

* Web app manifest
* Standalone display mode
* Application theme colors
* Installable experience
* Responsive interface

The application can therefore be accessed from desktop and mobile environments using a single codebase.

---

## 🏗️ Architecture

The application follows a modern full-stack architecture:

```text
┌───────────────────────────────┐
│           Client              │
│       Next.js / React         │
│       Tailwind CSS            │
└───────────────┬───────────────┘
                │
                │ Authenticated requests
                ▼
┌───────────────────────────────┐
│        Next.js Server         │
│     App Router / Middleware   │
│       Server-side logic       │
└───────────────┬───────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌───────────────┐  ┌───────────────┐
│   Supabase    │  │   Gemini API  │
│               │  │               │
│ PostgreSQL    │  │ AI processing │
│ Auth          │  │ Classification│
│ RLS           │  │ OCR workflows │
└───────────────┘  └───────────────┘
```

### Main components

| Layer          | Technology                  |
| -------------- | --------------------------- |
| Frontend       | React                       |
| Framework      | Next.js App Router          |
| Language       | TypeScript                  |
| Styling        | Tailwind CSS                |
| Authentication | Supabase Auth               |
| Database       | PostgreSQL                  |
| Data security  | Supabase Row Level Security |
| AI             | Gemini API                  |
| PWA            | Web App Manifest            |
| Hosting        | Vercel                      |

---

## 🗄️ Data Model

The application is designed around a user-owned financial data model.

Core entities include:

```text
users
 │
 ├── accounts
 │     └── wallets
 │
 ├── categories
 │
 ├── transactions
 │
 ├── category_budgets
 │
 ├── wallet_budgets
 │
 ├── categorization_rules
 │
 ├── duplicate_review_log
 │
 ├── email_sources
 │
 └── gmail_connections
```

Each user's financial information is isolated through PostgreSQL Row Level Security (RLS).

The intended security model is:

```text
User A
 ├── Accounts
 ├── Transactions
 ├── Categories
 └── Budgets

User B
 ├── Accounts
 ├── Transactions
 ├── Categories
 └── Budgets
```

User A must never be able to access User B's financial records.

---

## 🔐 Security

Security is a fundamental part of the application's architecture.

The project uses:

### Supabase Authentication

User authentication is handled through Supabase Auth.

### Row Level Security

Financial tables use PostgreSQL Row Level Security to enforce user-level data isolation.

### Server-side secrets

Sensitive credentials such as service-role keys and OAuth refresh tokens must remain on the server and must never be exposed through client-side code.

### Review before financial calculations

Automatically imported transactions remain outside financial calculations until they are confirmed.

This prevents unverified automated data from silently modifying balances or budgets.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Git
* A Supabase project

You can verify your Node.js installation with:

```bash
node --version
npm --version
```

---

### 1. Clone the repository

```bash
git clone https://github.com/jaguzmano09/Control-de-gastos-personales.git

cd Control-de-gastos-personales
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Configure environment variables

Create a local environment file:

```bash
.env.local
```

Add the required Supabase configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If AI processing or server-side integrations are enabled in your version of the application, configure the corresponding server-side secrets as well.

> ⚠️ Never commit `.env.local` or any secret key to Git.

---

### 4. Configure Supabase

Create a Supabase project and configure:

* PostgreSQL database
* Supabase Authentication
* Database migrations
* Row Level Security policies

The repository includes database migrations under:

```text
supabase/migrations/
```

Apply the required migrations to your Supabase project before using the application.

---

### 5. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

## 🧪 Development Commands

The project provides the following npm scripts:

### Development

```bash
npm run dev
```

Starts the Next.js development server.

### Production build

```bash
npm run build
```

Creates an optimized production build.

### Production server

```bash
npm run start
```

Starts the application in production mode.

### Type checking

```bash
npm run typecheck
```

Runs the TypeScript compiler without generating output.

### Linting

```bash
npm run lint
```

Runs the project's linting process.

---

## ☁️ Deployment

The application is designed to be deployed using **Vercel**.

Typical deployment flow:

```text
GitHub repository
        ↓
      Vercel
        ↓
Environment variables
        ↓
    Next.js build
        ↓
   Production app
```

When deploying, configure the required environment variables in the Vercel project settings.

The current production deployment is:

https://control-de-gastos-personales-nine.vercel.app/

---

## 📂 Project Structure

```text
Control-de-gastos-personales/
│
├── app/                    # Next.js App Router
│
├── components/             # Reusable UI components
│
├── lib/                    # Shared utilities and integrations
│
├── public/                 # Static assets and PWA manifest
│
├── src/                    # Application source code
│
├── supabase/
│   └── migrations/         # Database migrations
│
├── middleware.ts           # Authentication/session middleware
│
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
├── vercel.json             # Vercel configuration
└── package.json            # Project dependencies and scripts
```

---

## 🔄 Transaction Lifecycle

One of the key design principles of the application is that automatically captured transactions should not immediately affect financial calculations.

```text
                 ┌─────────────┐
                 │   Manual    │
                 └──────┬──────┘
                        │
                        ▼
                  ┌───────────┐
                  │ Confirmed │
                  └─────┬─────┘
                        │
                        ▼
              ┌────────────────────┐
              │ Budgets / Dashboard│
              │ / Account balances │
              └────────────────────┘


OCR / Bank notification
          │
          ▼
   Pending review
          │
     ┌────┴────┐
     │         │
     ▼         ▼
 Confirmed   Duplicate
     │         │
     ▼         ▼
 Financial   Review
 calculations
```

This workflow provides a balance between automation and human verification.

---

## 🧠 AI-Assisted Workflow

The categorization system is designed to combine deterministic rules with AI.

```text
Transaction
     │
     ▼
Known categorization rule?
     │
   ┌─┴─┐
  Yes  No
   │    │
   ▼    ▼
Category  Gemini
            │
            ▼
       Suggested category
            │
            ▼
       User review
            │
       ┌────┴────┐
       │         │
    Corrected  Accepted
       │         │
       └────┬────┘
            ▼
   Improve categorization
```

This hybrid approach reduces unnecessary AI calls while allowing the system to learn from user corrections.

---

## 🛣️ Roadmap

The project is actively evolving. Planned and ongoing improvements include:

### Core Finance

* [x] Account management
* [x] Category-based organization
* [ ] Complete transaction lifecycle
* [ ] Advanced financial dashboards
* [ ] Improved budget analytics
* [ ] Monthly financial summaries

### Automation

* [ ] Gmail OAuth integration
* [ ] Automated bank notification ingestion
* [ ] OCR-based invoice processing
* [ ] Automated transaction categorization
* [ ] Improved duplicate detection
* [ ] Continuous categorization learning

### PWA

* [x] Web manifest
* [ ] Install experience improvements
* [ ] Offline capabilities
* [ ] Push notifications

### Security

* [x] Supabase Authentication
* [x] Row Level Security architecture
* [ ] Comprehensive cross-user security testing
* [ ] Expanded API authorization testing
* [ ] Security hardening and dependency updates

### Developer Experience

* [ ] Automated tests
* [ ] End-to-end testing
* [ ] CI/CD checks
* [ ] Improved error monitoring
* [ ] Technical documentation

---

## 📈 Design Principles

The project follows several principles:

### 1. User control

Automation should assist the user, not silently modify financial records.

### 2. Data integrity

Financial calculations should be derived from confirmed transactions whenever possible.

### 3. Privacy by design

Financial information belongs to the user and must remain isolated from other users.

### 4. Explainable automation

AI-generated classifications should be reviewable and correctable.

### 5. Incremental learning

User corrections should improve future automated suggestions.

### 6. Maintainable architecture

The application should remain modular enough to evolve from a personal tool into a multi-user platform.

---

## 🤝 Contributing

This project is currently developed primarily as a personal finance application.

If you would like to contribute:

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Run the available checks:

```bash
npm run typecheck
npm run build
```

5. Commit your changes.

```bash
git commit -m "feat: add your feature"
```

6. Push the branch.

```bash
git push origin feature/your-feature
```

7. Open a Pull Request.

For significant architectural or database changes, please document the reasoning behind the change.

---

## ⚠️ Important Security Notice

This application handles potentially sensitive financial information.

Before deploying your own instance:

* Never commit API keys or credentials.
* Keep Supabase service-role credentials server-side.
* Configure Row Level Security correctly.
* Verify that API routes enforce authentication.
* Do not expose OAuth refresh tokens to the client.
* Test that one authenticated user cannot access another user's data.
* Use separate development and production credentials.

> **Do not use real financial credentials, API secrets, or private tokens in source code.**

---

## 📄 License

A license has not yet been specified for this repository.

Until a license is added, the default copyright rules apply and others should not assume that the code can be freely redistributed or reused.

---

## 👨‍💻 Author

**Javier Guzmán**

Electrical & Electronics Engineering student / Electronics Engineer.

This project is part of an ongoing effort to build practical software solutions while exploring full-stack development, cloud databases, authentication, AI-assisted automation, and Progressive Web Applications.

---

## ⭐ Project

If you find the project interesting, consider giving it a ⭐ on GitHub.

**Repository:**
https://github.com/jaguzmano09/Control-de-gastos-personales

**Live application:**
https://control-de-gastos-personales-nine.vercel.app/
