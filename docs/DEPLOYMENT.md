# Production Deployment

เอกสารนี้คือ checklist สำหรับนำ `e service` ขึ้นเซิร์ฟเวอร์จริงให้คนใช้งานผ่าน
คอม มือถือ ไอแพด และแท็บเล็ตได้

## 1. Server

แนะนำอย่างน้อย:

- Node.js LTS ที่รองรับ Next.js 16
- MySQL หรือ MariaDB
- RAM 2 GB ขึ้นไปสำหรับเริ่มต้น
- Disk ที่ backup ได้สำหรับ `public/uploads`
- Domain หรือ subdomain เช่น `service.example.com`
- HTTPS certificate

## 2. Environment

สร้าง `.env` จาก `.env.example`:

```powershell
Copy-Item .env.example .env
```

ต้องเปลี่ยนค่าพวกนี้:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` ถ้ามีหลาย instance
- `DEPLOYMENT_VERSION` ถ้าทำ rolling deploy

ห้ามใช้ database user `root` ใน production

## 3. Database

สร้าง database และ user:

```sql
CREATE DATABASE service_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'service_user'@'localhost' IDENTIFIED BY 'CHANGE_ME';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
ON service_management_db.* TO 'service_user'@'localhost';
FLUSH PRIVILEGES;
```

รัน migration:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

ถ้าต้องการ seed ข้อมูลเริ่มต้น:

```powershell
npm.cmd run seed
```

## 4. Build

ตรวจและ build:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## 5. Run The App

แบบพื้นฐาน:

```powershell
npm.cmd run start:prod
```

แบบ PM2:

```powershell
npm.cmd install --global pm2
pm2 start ecosystem.config.cjs
pm2 save
```

บน Windows Server ให้ตั้ง PM2 startup หรือใช้ Task Scheduler/Windows service ตามนโยบายเครื่อง

## 6. Reverse Proxy And HTTPS

ไม่ควรเปิด port `3000` ให้ผู้ใช้โดยตรง ให้เปิดเฉพาะ `80/443` แล้ว proxy ไปที่
`localhost:3000`

ตัวอย่าง Nginx:

```nginx
server {
  listen 80;
  server_name service.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name service.example.com;

  client_max_body_size 40m;

  ssl_certificate /path/to/fullchain.pem;
  ssl_certificate_key /path/to/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

สำหรับมือถือ/ไอแพด ควรใช้ HTTPS จริง เพราะ camera/GPS/signature flow จะเสถียรกว่า

## 7. Uploads

ระบบเก็บไฟล์รูปและลายเซ็นใน:

```text
public/uploads
```

ต้องให้ process Node.js เขียนโฟลเดอร์นี้ได้ และต้อง backup คู่กับ database เสมอ

## 8. Backup

ตัวอย่าง manual backup:

```powershell
.\scripts\backup-production.ps1 `
  -BackupRoot "D:\e-service-backups" `
  -DatabaseName "service_management_db" `
  -MysqlUser "service_user" `
  -MysqlPassword "CHANGE_ME" `
  -MysqlHost "127.0.0.1" `
  -MysqlPort 3306
```

ควรตั้ง Task Scheduler ให้รันทุกวันหลังเลิกงาน

## 9. Firewall

เปิดให้คนใช้เข้าเฉพาะ:

- TCP 80
- TCP 443

ถ้าใช้ reverse proxy บนเครื่องเดียวกัน ไม่ต้องเปิด TCP 3000 ต่อ public

## 10. Go-Live Checklist

- Login ได้ทั้ง admin/user
- user สร้างใบเซอร์วิซได้
- user กรอก work form บนมือถือได้
- ถ่ายรูป/เลือกรูปได้
- GPS ใช้งานได้
- ลูกค้าเซ็นได้
- admin ตรวจ/ส่งกลับ/ปิดงานได้
- PDF/print อ่านออกบน A4
- import SAP CSV ได้
- backup database และ uploads สำเร็จ
- restore ทดสอบได้อย่างน้อย 1 ครั้งก่อนใช้งานจริง

