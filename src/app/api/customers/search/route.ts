import type { customer_sitesWhereInput } from "@/generated/prisma/models/customer_sites";
import type { customersWhereInput } from "@/generated/prisma/models/customers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sanitizeQuery = (value: string | null) => String(value ?? "").trim().slice(0, 80);

const parsePositiveInteger = (value: string | null) => {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ customers: [], sites: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "site" ? "site" : "customer";
  const query = sanitizeQuery(url.searchParams.get("q"));
  const customerId = parsePositiveInteger(url.searchParams.get("customerId"));

  if (kind === "site") {
    const siteWhere: customer_sitesWhereInput = {
      AND: [
        {
          is_active: true,
        },
        customerId
          ? {
              customer_id: customerId,
            }
          : {},
        query
          ? {
              OR: [
                {
                  site_name: {
                    contains: query,
                  },
                },
                {
                  address: {
                    contains: query,
                  },
                },
                {
                  road: {
                    contains: query,
                  },
                },
                {
                  subdistrict: {
                    contains: query,
                  },
                },
                {
                  district: {
                    contains: query,
                  },
                },
                {
                  province: {
                    contains: query,
                  },
                },
                {
                  customers: {
                    company_name: {
                      contains: query,
                    },
                  },
                },
                {
                  customers: {
                    sap_bp_code: {
                      contains: query,
                    },
                  },
                },
              ],
            }
          : {},
      ],
    };

    const sites = await prisma.customer_sites.findMany({
      where: siteWhere,
      select: {
        site_id: true,
        customer_id: true,
        site_name: true,
        address: true,
        subdistrict: true,
        district: true,
        province: true,
        customers: {
          select: {
            customer_id: true,
            sap_bp_code: true,
            company_name: true,
            phone: true,
            address: true,
            province: true,
          },
        },
      },
      orderBy: [
        {
          site_name: "asc",
        },
        {
          site_id: "asc",
        },
      ],
    });
    const customers = Array.from(
      new Map(sites.map((site) => [site.customers.customer_id, site.customers])).values(),
    );

    return Response.json({
      customers,
      sites: sites.map((site) => ({
        site_id: site.site_id,
        customer_id: site.customer_id,
        site_name: site.site_name,
        address:
          site.address ||
          [site.subdistrict, site.district, site.province].filter(Boolean).join(" "),
        province: site.province,
      })),
    });
  }

  const customerWhere: customersWhereInput = query
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
            contact_person: {
              contains: query,
            },
          },
          {
            phone: {
              contains: query,
            },
          },
        ],
      }
    : {};

  const customers = await prisma.customers.findMany({
    where: customerWhere,
    select: {
      customer_id: true,
      sap_bp_code: true,
      company_name: true,
      phone: true,
      address: true,
      province: true,
    },
    orderBy: {
      company_name: "asc",
    },
  });

  return Response.json({ customers, sites: [] });
}
