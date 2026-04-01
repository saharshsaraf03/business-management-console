# Business Management Console

A full-stack retail operations management platform built to solve a real business problem — end-to-end tracking of sales, inventory, supplier purchases, expenses, and profitability for a live retail operation.

> **Live Demo:** [tiny-cocada-d79a24.netlify.app](https://tiny-cocada-d79a24.netlify.app)
> **Demo Login:** `demo@mangobusiness.com` / `Demo@1234`

---

## The Business Problem

A small retail business was managing all sales orders, stock purchases, customer records, and profit calculations manually — using a handwritten ledger and a basic spreadsheet. There was no visibility into real-time stock levels, no way to track outstanding payments, no profit margin analysis, and no consolidated view of the business.

This platform was built to replace that manual process entirely — starting from a requirements-gathering session with the business owner, through database design, application development, deployment, and ongoing iteration.

---

## What This Project Demonstrates

### Business Analysis Skills
- **Requirement gathering from a real stakeholder** — conducted structured discovery sessions with the business owner to understand pain points, workflows, and data needs before writing a single line of code
- **Business process mapping** — designed the complete order-to-delivery workflow: customer inquiry → order placement → stock deduction → payment tracking → delivery confirmation → profit calculation
- **Gap analysis** — identified that the existing manual process had no way to distinguish gross profit from true net profit (operating expenses were invisible), and extended the data model to close that gap
- **Functional specification** — translated business requirements into a structured database schema, user stories, and role-based access control rules
- **UAT and iteration** — tested all features against real business data and iterated based on actual user feedback from the business owner

### Data and Analytics Skills
- **SQL database design** — designed and implemented a normalised PostgreSQL schema with 7 tables, foreign key relationships, check constraints, and Row Level Security policies
- **Business intelligence dashboard** — built KPI cards showing total revenue, cost of goods sold, gross profit, true net profit, and outstanding dues — all computed from live database queries
- **Data interpretation** — implemented sales velocity calculations (average dozens sold per day over last 7 days), stockout predictions per product category, and projected revenue from remaining inventory
- **Reporting** — Excel (.xlsx) and PDF export functionality for sales ledgers and stock purchase records

### GenAI Tool Usage
- **Built using Claude (Anthropic)** as the primary development accelerator — used for architecture design, code generation, database schema review, and debugging
- Demonstrates practical, production-level use of GenAI tools to ship a real working system — not just for writing or summarisation but for complex technical problem-solving
- Entire development workflow was AI-assisted: requirements → schema → code → deployment → iteration

### Technical Skills
- **REST API integration** — React frontend communicates with Supabase's auto-generated REST API for all CRUD operations
- **Data flows** — implemented real-time data sync between the React frontend and PostgreSQL backend via Supabase's JS client
- **System integration** — integrated Supabase Auth for authentication, Supabase Edge Functions for serverless user management, Recharts for data visualisation, SheetJS for Excel export, and jsPDF for PDF generation
- **Role-based access control** — enforced at both UI level (owner vs employee views) and database level (PostgreSQL RLS policies)

---

## Features

### Dashboard — Business Intelligence at a Glance
- 6 KPI cards: Total Revenue, Cost of Goods Sold, Gross Profit & Margin, Operating Expenses, True Net Profit, Outstanding Dues
- Stock status per product category with progress bars and low-stock alerts
- Daily revenue line chart (last 30 days) and revenue breakdown donut chart
- Top 5 customers by order value
- Sales velocity and stockout prediction per category
- Pending actions panel — unpaid orders, scheduled deliveries, outstanding supplier payments

### Sales Order Management
- Complete order lifecycle tracking: date, customer, product category, quantity, amount, payment status, delivery status
- Searchable customer dropdown with auto-fill for returning customers
- Auto-suggested pricing based on current rates
- Filter by date range, category, payment status, delivery status
- Export to Excel and PDF

### Stock Purchase Management
- Multi-supplier purchase tracking with wholesale tier calculator
- Per-category quantity breakdown (4 product sizes)
- Auto-computed outstanding supplier payments
- Full purchase history per supplier

### Expense Tracker
- 4 expense categories: Transport, Packaging, Labor, Other
- Feeds directly into True Net Profit calculation on the dashboard
- Category-wise expense breakdown with totals

### Customer and Supplier Management
- Full order history per customer with aggregated stats
- Supplier purchase history with outstanding dues

### Access Control
- Owner role: full access including profit data, rate management, user management, delete operations
- Employee role: data entry access only, profit and margin data hidden
- In-app employee account creation (Supabase Edge Function)

### UI/UX
- Light and dark mode with persistent preference (localStorage)
- Fully responsive — works on mobile, tablet, and desktop
- Smooth animations and micro-interactions throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 |
| Build Tool | Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 |
| Database | PostgreSQL (via Supabase) |
| Backend API | Supabase REST API |
| Authentication | Supabase Auth |
| Access Control | PostgreSQL Row Level Security |
| Serverless Functions | Supabase Edge Functions (Deno) |
| Data Visualisation | Recharts |
| Excel Export | SheetJS (xlsx) |
| PDF Export | jsPDF + jspdf-autotable |
| State Management | React Context API |
| Hosting | Netlify |
| Development Accelerator | Claude (Anthropic) — GenAI |

---

## Database Schema

7 tables with full RLS policies:

```
profiles          — user accounts with role (owner/employee) and active status
suppliers         — wholesale supplier records
stock_purchases   — incoming stock batches per supplier, per category
customers         — customer records with address
sales_orders      — individual sale transactions with payment and delivery tracking
expenses          — operating expenses by category (Transport/Packaging/Labor/Other)
mango_rates       — current sell and cost prices per product category
rate_history      — audit log of all rate changes with timestamp and user
```

Key design decisions:
- Serial number sequence for sales orders (never resets, globally unique)
- RLS policies enforce role-based access at database level — not just UI
- Trigger function auto-creates profile row on user signup
- Check constraints enforce valid enum values on size, payment status, delivery status

---

## Business Logic

| Metric | Calculation |
|---|---|
| Stock Remaining | Total purchased dz − Total sold dz (per category) |
| Revenue | Sum of amount where payment_status = 'Paid' |
| COGS | Sum of (quantity_dz × cost_price_per_dz) for all sales |
| Gross Profit | Revenue − COGS |
| Gross Margin % | (Gross Profit ÷ Revenue) × 100 |
| Operating Expenses | Sum of all expense amounts |
| True Net Profit | Gross Profit − Operating Expenses |
| Net Margin % | (Net Profit ÷ Revenue) × 100 |
| Daily Velocity | Total dz sold (last 7 days) ÷ 7 per category |
| Days Until Stockout | Remaining stock ÷ daily velocity (∞ if velocity = 0) |
| Projected Revenue | Sum of (remaining_dz × sell_price_per_dz) per category |

---

## Project Background

This was not built as an academic exercise. It was built for a real retail business during an active trading season, with real data, real users, and real business decisions being made from the dashboard daily.

The development process followed a genuine software delivery lifecycle:
1. **Discovery** — requirement gathering sessions with the business owner
2. **Design** — database schema design, user flow mapping, feature prioritisation
3. **Build** — iterative development with Claude as a GenAI development accelerator
4. **Deploy** — Netlify hosting with Supabase cloud backend
5. **Data migration** — bulk SQL import of 60+ historical records from a manual ledger
6. **Iteration** — ongoing feature additions based on real usage (expense tracker, dark mode, UI improvements)

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/saharshsaraf03/business-management-console.git
cd business-management-console
```

### 2. Configure Supabase credentials
```bash
cp src/supabaseClient.example.js src/supabaseClient.js
```
Open `src/supabaseClient.js` and replace the placeholder values with your Supabase project URL and anon key.

### 3. Set up the database
Run `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables, RLS policies, indexes, triggers, and seed data.

### 4. Create your owner account
In Supabase Authentication → Users, create a new user. Then run:
```sql
UPDATE public.profiles
SET role = 'owner', full_name = 'Your Name'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### 5. Install and run
```bash
npm install
npm run dev
```

### 6. Build for production
```bash
npm run build
```
Deploy the `dist` folder to Netlify or any static hosting provider.

---

## Author

**Saharsh Saraf**
3rd Year BTech Electronics Engineering
GitHub: [@saharshsaraf03](https://github.com/saharshsaraf03)
Live Demo: [tiny-cocada-d79a24.netlify.app](https://tiny-cocada-d79a24.netlify.app)
Demo Login: `demo@mangobusiness.com` / `Demo@1234`