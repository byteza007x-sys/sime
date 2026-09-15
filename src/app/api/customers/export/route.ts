import { csvResponse, toCsv } from "@/lib/csv";
import { getCurrentUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sanitizeQuery = (value: string | null) => String(value ?? "").trim().slice(0, 120);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const locale = getLocale(url.searchParams.get("lang") ?? undefined);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await requireFeature({ key: "customers", user, locale });

  if (user.roles.role_name !== "admin" && !isOwnerUser(user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const query = sanitizeQuery(url.searchParams.get("q"));
  const where = query
    ? {
        OR: [
          {
            sap_bp_code: {
              contains: query,
            },
          },
          {
            company_name: {
              contains: query,
            },
          },
          {
            tax_id: {
              contains: query,
            },
          },
          {
            contact_person: {
              contains: query,
            },
          },
          {
            phone: {
              contains: query,
            },
          },
          {
            address: {
              contains: query,
            },
          },
        ],
      }
    : {};

  const customers = await prisma.customers.findMany({
    where,
    select: {
      sap_bp_code: true,
      company_name: true,
      tax_id: true,
      contact_person: true,
      phone: true,
      email: true,
      address: true,
      province: true,
      postal_code: true,
      customer_sites: {
        select: {
          site_code: true,
          site_name: true,
          address: true,
          house_no: true,
          village_no: true,
          road: true,
          subdistrict: true,
          district: true,
          province: true,
          postal_code: true,
          contact_person: true,
          phone: true,
          gps_lat: true,
          gps_long: true,
        },
        orderBy: [
          {
            site_name: "asc",
          },
          {
            site_id: "asc",
          },
        ],
      },
    },
    orderBy: [
      {
        sap_bp_code: "asc",
      },
      {
        company_name: "asc",
      },
    ],
  });

  const rows = customers.flatMap((customer, customerIndex) => {
    const sites = customer.customer_sites.length > 0 ? customer.customer_sites : [null];

    return sites.map((site, siteIndex) => [
      customerIndex + 1,
      customer.sap_bp_code,
      customer.company_name,
      customer.tax_id,
      customer.contact_person,
      customer.phone,
      customer.email,
      customer.address,
      customer.province,
      customer.postal_code,
      siteIndex + 1,
      site?.site_code,
      site?.site_name,
      site?.address,
      site?.house_no,
      site?.village_no,
      site?.road,
      site?.subdistrict,
      site?.district,
      site?.province,
      site?.postal_code,
      site?.contact_person,
      site?.phone,
      site?.gps_lat?.toString(),
      site?.gps_long?.toString(),
    ]);
  });

  const csv = toCsv(
    [
      "No.",
      "BP Code",
      "Customer Name",
      "Tax ID",
      "Main Contact",
      "Main Phone",
      "Email",
      "Customer Address",
      "Customer Province",
      "Customer Postal Code",
      "Site No.",
      "Site Code",
      "Site Name",
      "Site Address",
      "House No.",
      "Moo",
      "Road",
      "Subdistrict",
      "District",
      "Province",
      "Postal Code",
      "Site Contact",
      "Site Phone",
      "Latitude",
      "Longitude",
    ],
    rows,
  );

  return csvResponse(`e-service-customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
