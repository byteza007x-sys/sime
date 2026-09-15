import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Download,
  MapPin,
  Navigation,
  PencilLine,
  Save,
  Search,
  UserRound,
} from "lucide-react";
import ClearCustomersButton from "@/components/clear-customers-button";
import CustomerSiteGpsModal from "@/components/customer-site-gps-modal";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import BackupButton from "@/components/backup-button";
import { triggerBackupAction } from "@/app/backup/actions";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import {
  clearCustomerMasterDataAction,
  updateCustomerSiteAddressAction,
  updateCustomerSiteGpsAction,
} from "./actions";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    back: "Dashboard",
    title: "Customers",
    subtitle: "Customer master data imported from SAP Business Partners.",
    search: "Search BP code or customer name...",
    searchButton: "Search",
    clear: "Clear",
    exportCsv: "Export CSV",
    bpCode: "BP Code",
    customer: "Customer",
    contact: "Contact",
    phone: "Phone",
    edit: "Edit",
    empty: "No customers found",
    noData: "-",
    gpsTitle: "Customer site GPS",
    gpsHint: "Set site coordinates so service work can validate the 10 km on-site rule.",
    gpsUpdated: "Site GPS saved.",
    addressUpdated: "Site address saved.",
    geocoded: "Address converted to GPS successfully.",
    geocodeFailed: "Address saved, but GPS conversion failed. Please check the address or enter GPS manually.",
    gpsInvalid: "GPS data is invalid. Latitude must be -90 to 90 and longitude -180 to 180.",
    site: "Site",
    addressTitle: "Site address",
    houseNo: "House no.",
    villageNo: "Moo",
    road: "Road",
    subdistrict: "Subdistrict",
    district: "District",
    province: "Province",
    postalCode: "Postal code",
    saveAddress: "Save address",
    geocodeAddress: "Convert to GPS",
    latitude: "Latitude",
    longitude: "Longitude",
    radiusMeters: "Radius (m)",
    saveGps: "Save GPS",
    gpsReady: "GPS ready",
    gpsMissing: "GPS missing",
    listTitle: "Customer directory",
    listHint: "Clean view of customer code, tax ID, address, and contact data.",
    siteToolsTitle: "Site address and GPS tools",
    siteToolsHint: "Open this panel only when you need to fix site addresses or coordinates.",
    customerCount: "Customers",
    siteCount: "Sites",
    gpsReadyCount: "GPS ready",
    clearCustomers: "Clear customer list",
    clearingCustomers: "Clearing...",
    clearCustomersConfirm:
      "Clear customer master data that is not linked to service reports or inventory?",
    cleared: "Customer list cleared. Protected records linked to service reports were kept.",
  },
  th: {
    back: "แดชบอร์ด",
    title: "ลูกค้า",
    subtitle: "ข้อมูลลูกค้าจาก SAP Business Partners",
    search: "ค้นหา BP Code หรือชื่อลูกค้า...",
    searchButton: "ค้นหา",
    clear: "ล้าง",
    exportCsv: "Export CSV",
    bpCode: "BP Code",
    customer: "ลูกค้า",
    contact: "ผู้ติดต่อ",
    phone: "โทรศัพท์",
    edit: "\u0e41\u0e01\u0e49\u0e44\u0e02",
    empty: "ไม่พบข้อมูลลูกค้า",
    noData: "-",
    gpsTitle: "พิกัดไซต์ลูกค้า",
    gpsHint: "ตั้งพิกัดไซต์เพื่อให้ใบเซอร์วิสตรวจระยะหน้างานไม่เกิน 10 กม. ได้แม่นขึ้น",
    gpsUpdated: "บันทึกพิกัดไซต์แล้ว",
    addressUpdated: "บันทึกที่อยู่ไซต์แล้ว",
    geocoded: "แปลงที่อยู่เป็นพิกัดสำเร็จ",
    geocodeFailed: "บันทึกที่อยู่แล้ว แต่แปลงพิกัดไม่สำเร็จ กรุณาตรวจที่อยู่หรือกรอก GPS เอง",
    gpsInvalid: "ข้อมูลพิกัดไม่ถูกต้อง latitude ต้องอยู่ระหว่าง -90 ถึง 90 และ longitude -180 ถึง 180",
    site: "ไซต์",
    addressTitle: "ที่อยู่ไซต์",
    houseNo: "บ้านเลขที่",
    villageNo: "หมู่",
    road: "ถนน",
    subdistrict: "ตำบล",
    district: "อำเภอ",
    province: "จังหวัด",
    postalCode: "รหัสไปรษณีย์",
    saveAddress: "บันทึกที่อยู่",
    geocodeAddress: "แปลงเป็นพิกัด",
    latitude: "Latitude",
    longitude: "Longitude",
    radiusMeters: "รัศมี (เมตร)",
    saveGps: "บันทึกพิกัด",
    gpsReady: "มีพิกัดแล้ว",
    gpsMissing: "ยังไม่มีพิกัด",
  },
} satisfies Record<Locale, object>;

const thaiCopy = {
  back: "แดชบอร์ด",
  title: "ลูกค้า",
  subtitle: "ข้อมูลลูกค้าจาก SAP Business Partners สำหรับเปิดใบเซอร์วิซและค้นหาไซต์งาน",
  search: "ค้นหา BP Code ชื่อลูกค้า ผู้ติดต่อ หรือเบอร์โทร...",
  searchButton: "ค้นหา",
  clear: "ล้าง",
  exportCsv: "Export CSV",
  bpCode: "BP Code",
  customer: "ลูกค้า",
  contact: "ผู้ติดต่อ",
  phone: "โทรศัพท์",
  edit: "\u0e41\u0e01\u0e49\u0e44\u0e02",
  empty: "ไม่พบข้อมูลลูกค้า",
  noData: "-",
  gpsTitle: "พิกัดไซต์ลูกค้า",
  gpsHint: "ตั้งพิกัดไซต์เพื่อให้ใบเซอร์วิซตรวจระยะหน้างานไม่เกิน 10 กม. ได้แม่นขึ้น",
  gpsUpdated: "บันทึกพิกัดไซต์แล้ว",
  addressUpdated: "บันทึกที่อยู่ไซต์แล้ว",
  geocoded: "แปลงที่อยู่เป็นพิกัดสำเร็จ",
  geocodeFailed: "บันทึกที่อยู่แล้ว แต่แปลงพิกัดไม่สำเร็จ กรุณาตรวจที่อยู่หรือกรอก GPS เอง",
  gpsInvalid: "ข้อมูลพิกัดไม่ถูกต้อง latitude ต้องอยู่ระหว่าง -90 ถึง 90 และ longitude -180 ถึง 180",
  site: "ไซต์",
  addressTitle: "ที่อยู่ไซต์",
  houseNo: "บ้านเลขที่",
  villageNo: "หมู่",
  road: "ถนน",
  subdistrict: "ตำบล",
  district: "อำเภอ",
  province: "จังหวัด",
  postalCode: "รหัสไปรษณีย์",
  saveAddress: "บันทึกที่อยู่",
  geocodeAddress: "แปลงเป็นพิกัด",
  latitude: "Latitude",
  longitude: "Longitude",
  radiusMeters: "รัศมี (เมตร)",
  saveGps: "บันทึกพิกัด",
  gpsReady: "มีพิกัดแล้ว",
  gpsMissing: "ยังไม่มีพิกัด",
  listTitle: "\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
  listHint:
    "\u0e08\u0e31\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e43\u0e2b\u0e49\u0e2d\u0e48\u0e32\u0e19\u0e07\u0e48\u0e32\u0e22 \u0e41\u0e2a\u0e14\u0e07\u0e23\u0e2b\u0e31\u0e2a\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32 \u0e40\u0e25\u0e02\u0e20\u0e32\u0e29\u0e35 \u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48 \u0e22\u0e2d\u0e14\u0e04\u0e07\u0e40\u0e2b\u0e25\u0e37\u0e2d \u0e41\u0e25\u0e30\u0e1c\u0e39\u0e49\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d",
  siteToolsTitle:
    "\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e21\u0e37\u0e2d\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e30 GPS \u0e44\u0e0b\u0e15\u0e4c",
  siteToolsHint:
    "\u0e40\u0e1b\u0e34\u0e14\u0e2a\u0e48\u0e27\u0e19\u0e19\u0e35\u0e49\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e15\u0e49\u0e2d\u0e07\u0e41\u0e01\u0e49\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e2b\u0e23\u0e37\u0e2d\u0e1e\u0e34\u0e01\u0e31\u0e14\u0e44\u0e0b\u0e15\u0e4c\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
  customerCount: "\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
  siteCount: "\u0e44\u0e0b\u0e15\u0e4c",
  gpsReadyCount: "\u0e21\u0e35\u0e1e\u0e34\u0e01\u0e31\u0e14\u0e41\u0e25\u0e49\u0e27",
  clearCustomers: "\u0e40\u0e04\u0e25\u0e35\u0e22\u0e23\u0e4c\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
  clearingCustomers: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e04\u0e25\u0e35\u0e22\u0e23\u0e4c...",
  clearCustomersConfirm:
    "\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e40\u0e04\u0e25\u0e35\u0e22\u0e23\u0e4c\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e1c\u0e39\u0e01\u0e01\u0e31\u0e1a\u0e43\u0e1a\u0e40\u0e0b\u0e2d\u0e23\u0e4c\u0e27\u0e34\u0e0b\u0e2b\u0e23\u0e37\u0e2d inventory \u0e43\u0e0a\u0e48\u0e44\u0e2b\u0e21?",
  cleared:
    "\u0e40\u0e04\u0e25\u0e35\u0e22\u0e23\u0e4c\u0e23\u0e32\u0e22\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e41\u0e25\u0e49\u0e27 \u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e1c\u0e39\u0e01\u0e01\u0e31\u0e1a\u0e43\u0e1a\u0e40\u0e0b\u0e2d\u0e23\u0e4c\u0e27\u0e34\u0e0b\u0e16\u0e39\u0e01\u0e40\u0e01\u0e47\u0e1a\u0e44\u0e27\u0e49",
} satisfies typeof copy.en;

interface CustomersPageProps {
  searchParams: RouteSearchParams;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const user = await requireUser(locale);
  await requireFeature({ key: "customers", user, locale });
  const t = locale === "th" ? thaiCopy : copy.en;
  const gpsStatus = Array.isArray(params.gps) ? params.gps[0] : params.gps;
  const backupStatus = Array.isArray(params.backup) ? params.backup[0] : params.backup;

  if (user.roles.role_name !== "admin" && !isOwnerUser(user)) {
    redirect(withLocale("/technician/jobs", locale));
  }

  const queryText = String(
    Array.isArray(params.q) ? params.q[0] : params.q ?? "",
  ).trim();
  const exportParams = new URLSearchParams({
    lang: locale,
  });
  if (queryText) {
    exportParams.set("q", queryText);
  }
  const exportHref = `/api/customers/export?${exportParams.toString()}`;
  const customerWhere = queryText
    ? {
        OR: [
          {
            sap_bp_code: {
              contains: queryText,
            },
          },
          {
            company_name: {
              contains: queryText,
            },
          },
          {
            contact_person: {
              contains: queryText,
            },
          },
          {
            phone: {
              contains: queryText,
            },
          },
        ],
      }
    : {};
  const siteWhere = queryText
    ? {
        OR: [
          {
            site_name: {
              contains: queryText,
            },
          },
          {
            address: {
              contains: queryText,
            },
          },
          {
            province: {
              contains: queryText,
            },
          },
          {
            customers: {
              company_name: {
                contains: queryText,
              },
            },
          },
          {
            customers: {
              sap_bp_code: {
                contains: queryText,
              },
            },
          },
        ],
      }
    : {};
  const [customers, totalCustomers, sites, totalSites, totalGpsReadySites] =
    await Promise.all([
    prisma.customers.findMany({
      where: customerWhere,
      select: {
        customer_id: true,
        sap_bp_code: true,
        company_name: true,
        tax_id: true,
        address: true,
        province: true,
        postal_code: true,
        contact_person: true,
        phone: true,
      },
      orderBy: {
        company_name: "asc",
      },
      take: 800,
    }),
    prisma.customers.count({
      where: customerWhere,
    }),
    prisma.customer_sites.findMany({
      where: siteWhere,
      select: {
        site_id: true,
        site_name: true,
        address: true,
        house_no: true,
        village_no: true,
        road: true,
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true,
        gps_lat: true,
        gps_long: true,
        gps_radius_meters: true,
        customers: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: [
        {
          updated_at: "desc",
        },
        {
          site_name: "asc",
        },
      ],
      take: 80,
    }),
    prisma.customer_sites.count(),
    prisma.customer_sites.count({
      where: {
        gps_lat: {
          not: null,
        },
        gps_long: {
          not: null,
        },
      },
    }),
  ]);
  const gpsModalSites = sites.map((site) => ({
    site_id: site.site_id,
    site_name: site.site_name || "",
    customer_name: site.customers.company_name,
    address: site.address || "",
    house_no: site.house_no || "",
    village_no: site.village_no || "",
    road: site.road || "",
    subdistrict: site.subdistrict || "",
    district: site.district || "",
    province: site.province || "",
    postal_code: site.postal_code || "",
    gps_lat: site.gps_lat?.toString() || "",
    gps_long: site.gps_long?.toString() || "",
    gps_radius_meters: site.gps_radius_meters || 10000,
  }));
  const gpsModalLabels = {
    open:
      locale === "th"
        ? "\u0e04\u0e49\u0e19\u0e2b\u0e32/\u0e41\u0e01\u0e49\u0e44\u0e02 GPS"
        : "Search / edit GPS",
    title: t.siteToolsTitle,
    hint: t.siteToolsHint,
    search:
      locale === "th"
        ? "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e0a\u0e37\u0e48\u0e2d\u0e44\u0e0b\u0e15\u0e4c \u0e25\u0e39\u0e01\u0e04\u0e49\u0e32 \u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14 \u0e2b\u0e23\u0e37\u0e2d\u0e1e\u0e34\u0e01\u0e31\u0e14..."
        : "Search site, customer, province, or coordinates...",
    close: locale === "th" ? "\u0e1b\u0e34\u0e14" : "Close",
    empty: t.empty,
    noData: t.noData,
    addressTitle: t.addressTitle,
    houseNo: t.houseNo,
    villageNo: t.villageNo,
    road: t.road,
    subdistrict: t.subdistrict,
    district: t.district,
    province: t.province,
    postalCode: t.postalCode,
    saveAddress: t.saveAddress,
    geocodeAddress: t.geocodeAddress,
    latitude: t.latitude,
    longitude: t.longitude,
    radiusMeters: t.radiusMeters,
    saveGps: t.saveGps,
    gpsReady: t.gpsReady,
    gpsMissing: t.gpsMissing,
  };

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={withLocale("/dashboard", locale)}
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {t.back}
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Building2 size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">{t.title}</h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} pathname="/customers" />
              <ThemeToggle />
              <BackupButton
                action={triggerBackupAction}
                locale={locale}
                returnTo="/customers"
                source="customers"
              />
            </div>
          </div>
        </header>

        {backupStatus === "success" || backupStatus === "failed" ? (
          <section
            className={`rounded-xl border px-5 py-4 text-sm font-bold ${
              backupStatus === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {backupStatus === "success"
              ? locale === "th"
                ? "สำรองข้อมูลเรียบร้อยแล้ว"
                : "Backup completed."
              : locale === "th"
                ? "สำรองข้อมูลไม่สำเร็จ กรุณาตรวจสอบหน้า System"
                : "Backup failed. Please check the System page."}
          </section>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form action="/customers" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input type="hidden" name="lang" value={locale} />
            <label className="relative block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <input
                name="q"
                defaultValue={queryText}
                placeholder={t.search}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Search size={16} />
              {t.searchButton}
            </button>
            <Link
              href={withLocale("/customers", locale)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t.clear}
            </Link>
            <Link
              href={exportHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950"
            >
              <Download size={16} />
              {t.exportCsv}
            </Link>
          </form>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { value: totalCustomers, label: t.customerCount, Icon: Building2 },
            { value: totalSites, label: t.siteCount, Icon: MapPin },
            { value: totalGpsReadySites, label: t.gpsReadyCount, Icon: Navigation },
          ].map(({ value, label, Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black">
                    {Number(value).toLocaleString(locale === "th" ? "th-TH" : "en-US")}
                  </p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Icon size={21} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {gpsStatus === "updated" ||
        gpsStatus === "invalid" ||
        gpsStatus === "address_updated" ||
        gpsStatus === "customer_updated" ||
        gpsStatus === "geocoded" ||
        gpsStatus === "geocode_failed" ||
        gpsStatus === "cleared" ? (
          <section
            className={`rounded-xl border px-5 py-4 text-sm font-bold ${
              gpsStatus === "updated" ||
              gpsStatus === "address_updated" ||
              gpsStatus === "customer_updated" ||
              gpsStatus === "geocoded" ||
              gpsStatus === "cleared"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
            }`}
          >
            {gpsStatus === "updated"
              ? t.gpsUpdated
              : gpsStatus === "customer_updated"
                ? locale === "th"
                  ? "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e41\u0e25\u0e49\u0e27"
                  : "Customer information saved."
                : gpsStatus === "address_updated"
                ? t.addressUpdated
                : gpsStatus === "geocoded"
                  ? t.geocoded
                  : gpsStatus === "cleared"
                    ? t.cleared
                    : gpsStatus === "geocode_failed"
                      ? t.geocodeFailed
                      : t.gpsInvalid}
          </section>
        ) : null}

        <CustomerSiteGpsModal
          locale={locale}
          sites={gpsModalSites}
          labels={gpsModalLabels}
          updateAddressAction={updateCustomerSiteAddressAction}
          updateGpsAction={updateCustomerSiteGpsAction}
        />

        <details className="hidden">
          <summary className="flex cursor-pointer list-none flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <MapPin size={18} className="text-blue-700 dark:text-blue-300" />
                {t.siteToolsTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.siteToolsHint}
              </p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700">
              {sites.length.toLocaleString()} {t.site}
            </span>
          </summary>

          {sites.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              {t.empty}
            </div>
          ) : (
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {sites.map((site) => {
                const hasGps = site.gps_lat !== null && site.gps_long !== null;

                return (
                  <form
                    key={site.site_id}
                    action={updateCustomerSiteGpsAction}
                    className="interactive-card rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <input type="hidden" name="lang" value={locale} />
                    <input type="hidden" name="siteId" value={site.site_id} />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {site.site_name || t.noData}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {site.customers.company_name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {site.address || site.province || t.noData}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                          hasGps
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900"
                            : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900"
                        }`}
                      >
                        <Navigation size={13} />
                        {hasGps ? t.gpsReady : t.gpsMissing}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {t.addressTitle}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            {t.houseNo}
                          </span>
                          <input
                            name="houseNo"
                            defaultValue={site.house_no || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            {t.villageNo}
                          </span>
                          <input
                            name="villageNo"
                            defaultValue={site.village_no || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-xs font-bold text-slate-500">
                            {t.road}
                          </span>
                          <input
                            name="road"
                            defaultValue={site.road || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            {t.subdistrict}
                          </span>
                          <input
                            name="subdistrict"
                            defaultValue={site.subdistrict || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            {t.district}
                          </span>
                          <input
                            name="district"
                            defaultValue={site.district || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            {t.province}
                          </span>
                          <input
                            name="province"
                            defaultValue={site.province || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            {t.postalCode}
                          </span>
                          <input
                            name="postalCode"
                            defaultValue={site.postal_code || ""}
                            className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="submit"
                          formAction={updateCustomerSiteAddressAction}
                          className="interactive-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                        >
                          <Save size={16} />
                          {t.saveAddress}
                        </button>
                        <button
                          type="submit"
                          formAction={updateCustomerSiteAddressAction}
                          name="geocode"
                          value="1"
                          className="interactive-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 sm:w-auto"
                        >
                          <Navigation size={16} />
                          {t.geocodeAddress}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          {t.latitude}
                        </span>
                        <input
                          name="gpsLat"
                          type="number"
                          step="0.000001"
                          min={-90}
                          max={90}
                          defaultValue={site.gps_lat?.toString() || ""}
                          placeholder="13.756331"
                          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          {t.longitude}
                        </span>
                        <input
                          name="gpsLong"
                          type="number"
                          step="0.000001"
                          min={-180}
                          max={180}
                          defaultValue={site.gps_long?.toString() || ""}
                          placeholder="100.501762"
                          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          {t.radiusMeters}
                        </span>
                        <input
                          name="gpsRadiusMeters"
                          type="number"
                          min={50}
                          max={10000}
                          defaultValue={site.gps_radius_meters || 10000}
                          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="interactive-button mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 sm:w-auto"
                    >
                      <Save size={16} />
                      {t.saveGps}
                    </button>
                  </form>
                );
              })}
            </div>
          )}
        </details>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-black">{t.listTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.listHint}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-500">
                {customers.length.toLocaleString(locale === "th" ? "th-TH" : "en-US")} /{" "}
                {totalCustomers.toLocaleString(locale === "th" ? "th-TH" : "en-US")}
              </p>
            </div>
            <ClearCustomersButton
              action={clearCustomerMasterDataAction}
              locale={locale}
              label={t.clearCustomers}
              pendingLabel={t.clearingCustomers}
              confirmMessage={t.clearCustomersConfirm}
            />
          </div>
          {customers.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              {t.empty}
            </div>
          ) : (
            <>
            <div className="grid gap-3 p-4 lg:hidden">
              {customers.map((customer) => (
                <article
                  key={customer.customer_id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                >
                  <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                    {customer.sap_bp_code || t.noData}
                  </p>
                  <h3 className="mt-2 font-bold">{customer.company_name}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-2">
                      <UserRound size={15} />
                      {customer.contact_person || t.noData}
                    </p>
                    <p>{customer.phone || t.noData}</p>
                    <p className="text-xs">
                      Tax ID: {customer.tax_id || t.noData}
                    </p>
                    <p className="line-clamp-2 text-xs">
                      {customer.address || t.noData}
                    </p>
                    <Link
                      href={withLocale(`/customers/${customer.customer_id}/edit`, locale)}
                      className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      <PencilLine size={16} />
                      {t.edit}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[840px]">
                <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">{t.bpCode}</th>
                    <th className="px-5 py-3">{t.customer}</th>
                    <th className="px-5 py-3">Tax ID</th>
                    <th className="px-5 py-3">{t.addressTitle}</th>
                    <th className="px-5 py-3">{t.contact}</th>
                    <th className="px-5 py-3">{t.phone}</th>
                    <th className="px-5 py-3 text-right">{t.edit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((customer) => (
                    <tr key={customer.customer_id} className="text-sm">
                      <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-300">
                        {customer.sap_bp_code || t.noData}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <UserRound size={15} />
                          {customer.company_name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {customer.tax_id || t.noData}
                      </td>
                      <td className="max-w-sm px-5 py-4 text-slate-600 dark:text-slate-300">
                        <span className="line-clamp-2">
                          {customer.address || t.noData}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {customer.contact_person || t.noData}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {customer.phone || t.noData}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={withLocale(`/customers/${customer.customer_id}/edit`, locale)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <PencilLine size={15} />
                          {t.edit}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
