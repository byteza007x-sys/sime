# e service Stability Checklist

Use this checklist before letting real users work in the system.

## Daily Before Work

1. Start MySQL/MariaDB.
2. Start the app with production mode when testing phones/tablets:

   ```powershell
   npm.cmd run phone:build
   npm.cmd run phone:start
   ```

3. Open health check:

   ```text
   http://localhost:3000/api/health
   ```

   It should show:

   - `ok: true`
   - `database: "ok"`
   - `uploads.photos: "ok"`
   - `uploads.signatures: "ok"`

4. Run production readiness check:

   ```powershell
   npm.cmd run check:prod
   ```

## Before Go-Live

Run these commands and fix every failure:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run check:prod
npm.cmd run db:backup:dry
```

## Server Requirements

- Node.js 20 or newer
- MySQL/MariaDB with `utf8mb4`
- A dedicated database user, not `root`
- Strong `AUTH_SECRET` in `.env`
- Writable `public/uploads/photos`
- Writable `public/uploads/signatures`
- HTTPS for camera, GPS, and signatures on phones/tablets
- Daily backup for database and `public/uploads`

## Real-Use Smoke Test

1. Login as admin.
2. Import customer CSV.
3. Import inventory CSV.
4. Create one service report.
5. Login as user/technician on a phone.
6. Open the report.
7. Search/select customer and site.
8. Add service details.
9. Add equipment with model/serial lookup.
10. Capture GPS.
11. Upload photos.
12. Add customer signature.
13. Submit work.
14. Login as admin and review/close the report.
15. Open service form/PDF print view.

If any step fails, do not go live yet.
