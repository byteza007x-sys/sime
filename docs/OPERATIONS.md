# e service Operations

คู่มือนี้ไว้สำหรับดูแลระบบหลังเริ่มใช้งานจริง โดยเน้นข้อมูลที่หายไม่ได้:
ฐานข้อมูล MySQL/MariaDB และไฟล์ใน `public/uploads`.

## ก่อนใช้งานจริง

1. ตั้ง `DATABASE_URL` ใน `.env` ให้ชี้ไปฐานข้อมูลจริง
2. เปลี่ยน `AUTH_SECRET` เป็นค่าสุ่มยาวอย่างน้อย 32 ตัวอักษร
3. ใช้ database user แยกจาก `root` และให้สิทธิ์เฉพาะฐานข้อมูลของระบบนี้
4. สำรองทั้งฐานข้อมูลและ `public/uploads` เพราะรูปหน้างาน/ลายเซ็นถูกอ้างจากฐานข้อมูล
5. รันตรวจสอบก่อนปล่อยใช้งาน:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

## Backup

ตรวจคำสั่ง backup โดยยังไม่สร้างไฟล์:

```powershell
npm.cmd run db:backup:dry
```

สำรองฐานข้อมูลจริง:

```powershell
npm.cmd run db:backup
```

ไฟล์จะถูกเก็บใน `backups/db` และถูก ignore จาก git แล้ว เพราะเป็นข้อมูลจริงของลูกค้า.

ถ้าเครื่องไม่ได้ติดตั้ง MySQL ผ่าน XAMPP ให้ตั้ง path เองใน `.env`:

```env
MYSQLDUMP_PATH="C:\path\to\mysqldump.exe"
```

สำรองไฟล์อัปโหลด:

```powershell
Compress-Archive -Path public\uploads -DestinationPath backups\uploads_backup.zip -Force
```

ควรเก็บ backup นอกเครื่องเว็บด้วย เช่น external drive, NAS, หรือ cloud storage ของบริษัท.

## Restore

กู้ฐานข้อมูล:

```powershell
mysql -u root -P 3307 service_management_db < backups\db\YOUR_BACKUP.sql
```

กู้ไฟล์อัปโหลด:

```powershell
Expand-Archive -Path backups\uploads_backup.zip -DestinationPath public -Force
```

หลัง restore ให้เปิดหน้า Dashboard, Customers, Inventory และ Reports เพื่อตรวจจำนวนข้อมูล.

## SAP CSV Import

ทำผ่านหน้า Dashboard:

- Business Partners CSV ใช้อัปเดตข้อมูลลูกค้า
- Inventory Aging Report CSV ใช้อัปเดตข้อมูลอุปกรณ์และ serial
- โหมด sync inventory จะซ่อน serial ที่ไม่มีในไฟล์ล่าสุด
- โหมด merge จะเพิ่ม/อัปเดตข้อมูลใหม่โดยไม่ซ่อนข้อมูลเก่า

หลัง import ควรเปิดหน้า Customers และ Inventory เพื่อตรวจจำนวนข้อมูลคร่าวๆ.

## Service Workflow

1. user หรือ admin สร้างใบเซอร์วิซ
2. user เปิดใบงานและกรอกงานหน้างาน
3. user เพิ่มรูป, GPS, อุปกรณ์, คะแนน, และลายเซ็นลูกค้า
4. user ส่งงานแล้วแก้ไขไม่ได้จนกว่า admin จะส่งกลับ
5. admin ตรวจใบ service form
6. admin เลือกอนุมัติ, ส่งกลับแก้ไข, หรือปิดงาน

## Maintenance Checklist

- สำรอง database และ `public/uploads` อย่างน้อยวันละครั้งเมื่อใช้งานจริง
- ตรวจ `/api/health` เมื่อ Dashboard โหลดไม่ได้
- ตรวจพื้นที่ดิสก์ของ `public/uploads` และ `backups` ทุกเดือน
- ลบบัญชี user ที่ไม่ใช้แล้ว หรือปิดสถานะ `is_active`
- รัน `npm.cmd run build` หลังแก้โค้ดทุกครั้งก่อนนำขึ้นใช้งานจริง
