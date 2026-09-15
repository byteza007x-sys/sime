# e service Backup

ระบบนี้ต้องสำรอง 2 ส่วนเสมอ:

- Database: ใบเซอร์วิซ ลูกค้า อุปกรณ์ ผู้ใช้ สถานะงาน และ log
- `public/uploads`: รูปหน้างานและลายเซ็น

## คำสั่งสำรองแบบครบชุด

บนเซิร์ฟเวอร์ให้รันจากโฟลเดอร์โปรเจกต์:

```bash
cd /home/siamebu/apps/serviceonline
npm run backup
```

ระบบจะสร้างไฟล์ไว้ที่:

```text
backups/daily/YYYY-MM-DDTHH-mm-ss-sssZ/
  database.sql
  uploads.tar.gz
  backup-info.json
```

และจะอัปเดตไฟล์สถานะล่าสุด:

```text
backups/daily/latest-backup.json
```

## ทดสอบก่อนสำรองจริง

```bash
npm run backup:dry
```

คำสั่งนี้ใช้ตรวจว่า config พร้อมไหม แต่ยังไม่สร้างไฟล์ backup จริง

## ตั้งให้สำรองทุกวันอัตโนมัติ

ค่าเริ่มต้นจะรันทุกวันเวลา 02:00 และเก็บย้อนหลัง 30 วัน:

```bash
npm run backup:install-cron
```

ถ้าต้องการเปลี่ยนเวลา:

```bash
npm run backup:install-cron -- --time=23:30
```

ตรวจ cron:

```bash
crontab -l
```

ดู log:

```bash
tail -n 80 backups/daily/backup.log
```

## ตั้งโฟลเดอร์ backup นอกโปรเจกต์

แนะนำให้เก็บ backup นอกโฟลเดอร์เว็บ เช่น:

```bash
mkdir -p /home/siamebu/backups/e-service
```

เพิ่มใน `.env`:

```env
BACKUP_ROOT="/home/siamebu/backups/e-service"
BACKUP_RETENTION_DAYS="30"
```

จากนั้น restart app:

```bash
pm2 restart e-service --update-env
```

และติดตั้ง cron ใหม่:

```bash
npm run backup:install-cron
```

## การกู้คืน Database

เลือกไฟล์ `database.sql` จาก backup ที่ต้องการ แล้วรัน:

```bash
mysql -h 127.0.0.1 -P 3306 -u admin -p service_management_db < /path/to/database.sql
```

## การกู้คืนรูปและลายเซ็น

เลือกไฟล์ `uploads.tar.gz` จาก backup ที่ต้องการ แล้วรันจากโฟลเดอร์โปรเจกต์:

```bash
tar -xzf /path/to/uploads.tar.gz -C public
```

หลัง restore ให้ restart:

```bash
pm2 restart e-service --update-env
```

## ข้อควรจำ

- อย่า backup แค่ database เพราะรูปและลายเซ็นจะไม่กลับมา
- ควรดาวน์โหลด backup ออกจากเซิร์ฟเวอร์เป็นระยะ หรือส่งไป NAS/Cloud ต่อภายหลัง
- ควรทดสอบ restore อย่างน้อย 1 ครั้งก่อนใช้งานจริงเต็มรูปแบบ
