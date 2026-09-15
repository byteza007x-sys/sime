# Owner Control

This project has one hidden owner account for full system control.

## Owner Account

- Username comes from `OWNER_USERNAME` in `.env`
- Password comes from `OWNER_PASSWORD` in `.env`
- The owner account is hidden from `/users`
- The owner is redirected to `/owner` after login

## First-Time Setup

Start XAMPP MySQL first, then run:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" -h 127.0.0.1 -P 3307 -u root -e "SOURCE C:/xampp/htdocs/servicesiame/prisma/setup_database_admin.sql;"
npm.cmd run prisma:migrate:deploy
npm.cmd run owner:ensure
```

If MySQL uses port `3306`, change `-P 3307` to `-P 3306` and update `.env`.

## Owner Page

Open:

```text
http://localhost:3000/owner?lang=th
```

The owner can enable or disable:

- Dashboard
- Service reports
- Technician jobs
- Customers
- Inventory
- Users
- Maps / GPS

Disabled systems are blocked for normal admins and users. The owner can still access all systems.
