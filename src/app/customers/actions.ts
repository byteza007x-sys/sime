"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const readNumber = (formData: FormData, key: string) => {
  const value = Number(formData.get(key));

  return Number.isFinite(value) ? value : null;
};

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const redirectWithGpsStatus = (
  locale: "en" | "th",
  status:
    | "updated"
    | "invalid"
    | "address_updated"
    | "customer_updated"
    | "geocoded"
    | "geocode_failed"
    | "cleared",
): never => {
  redirect(`${withLocale("/customers", locale)}&gps=${status}`);
};

const buildSiteAddress = ({
  houseNo,
  villageNo,
  road,
  subdistrict,
  district,
  province,
  postalCode,
}: {
  houseNo: string;
  villageNo: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}) =>
  [
    houseNo ? `\u0e1a\u0e49\u0e32\u0e19\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48 ${houseNo}` : "",
    villageNo ? `\u0e2b\u0e21\u0e39\u0e48 ${villageNo}` : "",
    road ? `\u0e16\u0e19\u0e19${road}` : "",
    subdistrict ? `?.${subdistrict}` : "",
    district ? `?.${district}` : "",
    province ? `?.${province}` : "",
    postalCode,
  ]
    .filter(Boolean)
    .join(" ");

const isGeocodeResult = (value: unknown): value is { lat: string; lon: string } => {
  if (!value || typeof value !== "object") return false;

  const result = value as { lat?: unknown; lon?: unknown };

  return typeof result.lat === "string" && typeof result.lon === "string";
};

const geocodeAddress = async (address: string) => {
  if (!address) return null;

  const params = new URLSearchParams({
    q: `${address}, \u0e1b\u0e23\u0e30\u0e40\u0e17\u0e28\u0e44\u0e17\u0e22`,
    format: "json",
    limit: "1",
    countrycodes: "th",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "e-service/1.0 service-management",
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const results = (await response.json()) as unknown;
  if (!Array.isArray(results) || !isGeocodeResult(results[0])) return null;

  const lat = Number(results[0].lat);
  const long = Number(results[0].lon);

  if (!Number.isFinite(lat) || !Number.isFinite(long)) return null;
  if (lat < -90 || lat > 90 || long < -180 || long > 180) return null;

  return {
    lat,
    long,
  };
};

export async function updateCustomerAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/technician/jobs", locale));
  }

  const customerId = readNumber(formData, "customerId");
  const validCustomerId = customerId ?? redirectWithGpsStatus(locale, "invalid");

  if (!Number.isInteger(validCustomerId)) {
    redirectWithGpsStatus(locale, "invalid");
  }

  const sapBpCode = readText(formData, "sapBpCode");
  const companyName = readText(formData, "companyName");
  const taxId = readText(formData, "taxId");
  const contactPerson = readText(formData, "contactPerson");
  const phone = readText(formData, "phone");
  const email = readText(formData, "email");
  const address = readText(formData, "address");
  const province = readText(formData, "province");
  const postalCode = readText(formData, "postalCode");

  if (!companyName) {
    redirectWithGpsStatus(locale, "invalid");
  }

  const customer = await prisma.customers.findUnique({
    where: {
      customer_id: validCustomerId,
    },
  });
  const validCustomer = customer ?? redirectWithGpsStatus(locale, "invalid");

  await prisma.$transaction(async (tx) => {
    await tx.customers.update({
      where: {
        customer_id: validCustomer.customer_id,
      },
      data: {
        sap_bp_code: sapBpCode || null,
        company_name: companyName,
        tax_id: taxId || null,
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        province: province || null,
        postal_code: postalCode || null,
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "update_customer",
        table_name: "customers",
        record_id: String(validCustomer.customer_id),
        old_data: JSON.stringify({
          sapBpCode: validCustomer.sap_bp_code,
          companyName: validCustomer.company_name,
          taxId: validCustomer.tax_id,
          contactPerson: validCustomer.contact_person,
          phone: validCustomer.phone,
          email: validCustomer.email,
          address: validCustomer.address,
          province: validCustomer.province,
          postalCode: validCustomer.postal_code,
        }),
        new_data: JSON.stringify({
          sapBpCode,
          companyName,
          taxId,
          contactPerson,
          phone,
          email,
          address,
          province,
          postalCode,
        }),
      },
    });
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${validCustomer.customer_id}/edit`);
  revalidatePath("/reports/create");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  redirectWithGpsStatus(locale, "customer_updated");
}

export async function updateCustomerSiteAddressAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/technician/jobs", locale));
  }

  const siteId = readNumber(formData, "siteId");
  const validSiteId = siteId ?? redirectWithGpsStatus(locale, "invalid");

  if (!Number.isInteger(validSiteId)) {
    redirectWithGpsStatus(locale, "invalid");
  }

  const houseNo = readText(formData, "houseNo");
  const villageNo = readText(formData, "villageNo");
  const road = readText(formData, "road");
  const subdistrict = readText(formData, "subdistrict");
  const district = readText(formData, "district");
  const province = readText(formData, "province");
  const postalCode = readText(formData, "postalCode");
  const shouldGeocode = readText(formData, "geocode") === "1";
  const address = buildSiteAddress({
    houseNo,
    villageNo,
    road,
    subdistrict,
    district,
    province,
    postalCode,
  });

  const site = await prisma.customer_sites.findUnique({
    where: {
      site_id: validSiteId,
    },
  });
  const validSite = site ?? redirectWithGpsStatus(locale, "invalid");
  const coordinates = shouldGeocode ? await geocodeAddress(address) : null;

  await prisma.$transaction(async (tx) => {
    await tx.customer_sites.update({
      where: {
        site_id: validSite.site_id,
      },
      data: {
        address: address || null,
        house_no: houseNo || null,
        village_no: villageNo || null,
        road: road || null,
        subdistrict: subdistrict || null,
        district: district || null,
        province: province || null,
        postal_code: postalCode || null,
        ...(coordinates
          ? {
              gps_lat: coordinates.lat,
              gps_long: coordinates.long,
            }
          : {}),
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: coordinates
          ? "update_customer_site_address_geocoded"
          : "update_customer_site_address",
        table_name: "customer_sites",
        record_id: String(validSite.site_id),
        new_data: JSON.stringify({
          customerId: validSite.customer_id,
          site: validSite.site_name,
          address,
          gpsLat: coordinates?.lat ?? null,
          gpsLong: coordinates?.long ?? null,
        }),
      },
    });
  });

  revalidatePath("/customers");
  revalidatePath("/reports/create");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  redirectWithGpsStatus(
    locale,
    shouldGeocode ? (coordinates ? "geocoded" : "geocode_failed") : "address_updated",
  );
}

export async function updateCustomerSiteGpsAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/technician/jobs", locale));
  }

  const siteId = readNumber(formData, "siteId");
  const gpsLat = readNumber(formData, "gpsLat");
  const gpsLong = readNumber(formData, "gpsLong");
  const radiusMeters = Math.round(readNumber(formData, "gpsRadiusMeters") ?? 10000);

  const validSiteId = siteId ?? redirectWithGpsStatus(locale, "invalid");
  const validGpsLat = gpsLat ?? redirectWithGpsStatus(locale, "invalid");
  const validGpsLong = gpsLong ?? redirectWithGpsStatus(locale, "invalid");

  if (!Number.isInteger(validSiteId)) {
    redirectWithGpsStatus(locale, "invalid");
  }
  if (
    validGpsLat < -90 ||
    validGpsLat > 90 ||
    validGpsLong < -180 ||
    validGpsLong > 180
  ) {
    redirectWithGpsStatus(locale, "invalid");
  }
  if (radiusMeters < 50 || radiusMeters > 10000) {
    redirectWithGpsStatus(locale, "invalid");
  }

  const site = await prisma.customer_sites.findUnique({
    where: {
      site_id: validSiteId,
    },
  });
  const validSite = site ?? redirectWithGpsStatus(locale, "invalid");

  await prisma.$transaction(async (tx) => {
    await tx.customer_sites.update({
      where: {
        site_id: validSite.site_id,
      },
      data: {
        gps_lat: validGpsLat,
        gps_long: validGpsLong,
        gps_radius_meters: radiusMeters,
      },
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "update_customer_site_gps",
        table_name: "customer_sites",
        record_id: String(validSite.site_id),
        new_data: JSON.stringify({
          customerId: validSite.customer_id,
          site: validSite.site_name,
          gpsLat: validGpsLat,
          gpsLong: validGpsLong,
          radiusMeters,
        }),
      },
    });
  });

  revalidatePath("/customers");
  revalidatePath("/reports/create");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  redirectWithGpsStatus(locale, "updated");
}

export async function clearCustomerMasterDataAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/technician/jobs", locale));
  }

  const result = await prisma.$transaction(async (tx) => {
    const [reportRefs, inventoryRefs] = await Promise.all([
      tx.service_reports.findMany({
        select: {
          customer_id: true,
          site_id: true,
          contact_id: true,
        },
      }),
      tx.inventory.findMany({
        where: {
          current_site_id: {
            not: null,
          },
        },
        select: {
          current_site_id: true,
        },
      }),
    ]);
    const protectedCustomerIds = new Set<number>();
    const protectedSiteIds = new Set<number>();
    const protectedContactIds = new Set<number>();

    for (const ref of reportRefs) {
      protectedCustomerIds.add(ref.customer_id);
      if (ref.site_id) protectedSiteIds.add(ref.site_id);
      if (ref.contact_id) protectedContactIds.add(ref.contact_id);
    }
    for (const ref of inventoryRefs) {
      if (ref.current_site_id) protectedSiteIds.add(ref.current_site_id);
    }

    if (protectedSiteIds.size > 0) {
      const protectedSites = await tx.customer_sites.findMany({
        where: {
          site_id: {
            in: Array.from(protectedSiteIds),
          },
        },
        select: {
          customer_id: true,
        },
      });

      for (const site of protectedSites) {
        protectedCustomerIds.add(site.customer_id);
      }
    }

    const contactDeleteWhere =
      protectedContactIds.size > 0 || protectedCustomerIds.size > 0
        ? {
            ...(protectedContactIds.size > 0
              ? {
                  contact_id: {
                    notIn: Array.from(protectedContactIds),
                  },
                }
              : {}),
            ...(protectedCustomerIds.size > 0
              ? {
                  customer_id: {
                    notIn: Array.from(protectedCustomerIds),
                  },
                }
              : {}),
          }
        : {};
    const siteDeleteWhere =
      protectedSiteIds.size > 0 || protectedCustomerIds.size > 0
        ? {
            ...(protectedSiteIds.size > 0
              ? {
                  site_id: {
                    notIn: Array.from(protectedSiteIds),
                  },
                }
              : {}),
            ...(protectedCustomerIds.size > 0
              ? {
                  customer_id: {
                    notIn: Array.from(protectedCustomerIds),
                  },
                }
              : {}),
          }
        : {};
    const customerDeleteWhere =
      protectedCustomerIds.size > 0
        ? {
            customer_id: {
              notIn: Array.from(protectedCustomerIds),
            },
          }
        : {};

    const deletedContacts = await tx.customer_contacts.deleteMany({
      where: contactDeleteWhere,
    });
    const deletedSites = await tx.customer_sites.deleteMany({
      where: siteDeleteWhere,
    });
    const deletedCustomers = await tx.customers.deleteMany({
      where: customerDeleteWhere,
    });

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: "clear_customer_master_data",
        table_name: "customers",
        new_data: JSON.stringify({
          deletedCustomers: deletedCustomers.count,
          deletedSites: deletedSites.count,
          deletedContacts: deletedContacts.count,
          protectedCustomers: protectedCustomerIds.size,
          protectedSites: protectedSiteIds.size,
          protectedContacts: protectedContactIds.size,
        }),
      },
    });

    return {
      deletedCustomers: deletedCustomers.count,
      deletedSites: deletedSites.count,
      deletedContacts: deletedContacts.count,
    };
  });

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/reports/create");
  redirect(
    `${withLocale(
      "/customers",
      locale,
    )}&gps=cleared&deleted_customers=${result.deletedCustomers}&deleted_sites=${result.deletedSites}&deleted_contacts=${result.deletedContacts}`,
  );
}
