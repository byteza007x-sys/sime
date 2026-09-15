# e service

Service management dashboard for SIAM E Business. The system covers service
report creation, technician work forms, field photos, GPS evidence, customer
signatures, SAP customer/import inventory data, admin review, and printable
service forms.

## Requirements

- Node.js compatible with Next.js 16
- MySQL or MariaDB
- XAMPP is supported for local development

## Setup

Create `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3307/service_management_db"
AUTH_SECRET="change-this-before-production"
```

Install dependencies and generate the Prisma client if needed:

```powershell
npm.cmd install
npx.cmd prisma generate
```

Run the development server:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

## Production Checks

Run these before handing the system to users:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

## Mobile And Tablet

The app is built for desktop, phone, iPad, and Android tablets. For field work,
use the technician page and work form:

- `/technician/jobs`
- `/reports/[reportId]/work`

The app includes responsive layouts, mobile touch targets, safe-area handling,
and a web app manifest for adding the site to a phone or tablet home screen.

## Operations

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for backup, restore, SAP CSV import,
and maintenance notes.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production server setup,
HTTPS/reverse proxy, PM2, migration, and go-live checklist.
