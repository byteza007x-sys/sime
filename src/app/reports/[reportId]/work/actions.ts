"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_SITE_DISTANCE_KM = 10;
const SERVICE_TYPES = [
  "PM",
  "Maintenance",
  "Installation",
  "Repair",
  "Emergency",
] as const;
const SERVICE_REPORT_PHOTO_TYPES = [
  "Before",
  "During",
  "After",
  "Serial_Label",
  "Site",
  "Other",
] as const;

type ServiceReportPhotoType = (typeof SERVICE_REPORT_PHOTO_TYPES)[number];
type ServiceType = (typeof SERVICE_TYPES)[number];
type ChargeType = "Free_Service" | "Charged" | "Other";
type AssetActionType = "Installed" | "Delivered" | "Returned";
const LOCKED_FOR_USER_STATUSES = new Set([
  "Submitted",
  "Completed",
  "Approved",
  "Closed",
  "Cancelled",
]);

const readText = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const readNumber = (formData: FormData, key: string) => {
  const rawValue = String(formData.get(key) ?? "").trim();
  if (!rawValue) return null;

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
};

const readScore = (formData: FormData, key: string) => {
  const value = Number(formData.get(key));
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
};

const readDateTime = (value: string) => {
  if (!value) return null;

  const normalizedValue = value.length === 10 ? `${value}T00:00` : value;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  latA: number,
  longA: number,
  latB: number,
  longB: number,
) => {
  const latDistance = toRadians(latB - latA);
  const longDistance = toRadians(longB - longA);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(longDistance / 2) *
      Math.sin(longDistance / 2);

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const readServiceType = (formData: FormData): ServiceType => {
  const value = readText(formData, "serviceType");
  return SERVICE_TYPES.includes(value as ServiceType) ? (value as ServiceType) : "Maintenance";
};

const collectServiceTypes = (formData: FormData) => {
  const selected = formData
    .getAll("serviceTypes")
    .map((value) => String(value ?? "").trim())
    .filter((value): value is ServiceType => SERVICE_TYPES.includes(value as ServiceType));

  if (selected.length > 0) {
    return Array.from(new Set(selected));
  }

  return [readServiceType(formData)];
};

const readChargeType = (formData: FormData): ChargeType => {
  const value = readText(formData, "chargeType");
  return value === "Charged" || value === "Other" ? value : "Free_Service";
};

const redirectWithError = (
  reportId: string,
  locale: "en" | "th",
  error: string,
): never => {
  redirect(`${withLocale(`/reports/${reportId}/work`, locale)}&error=${error}`);
};

const saveSignatureImage = async (
  dataUrl: string,
  reportId: string,
  signerType: "customer" | "engineer",
) => {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "signatures");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${reportId}-${signerType}-${randomUUID()}.png`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(match[1], "base64"));

  return `/uploads/signatures/${fileName}`;
};

const extensionFromFile = (file: File) => {
  const originalExtension = path.extname(file.name).toLowerCase();

  if (/^\.[a-z0-9]{1,8}$/.test(originalExtension)) {
    return originalExtension;
  }

  switch (file.type) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
};

const collectPhotoFiles = (formData: FormData) => {
  const rawPhotoTypes = formData.getAll("photoTypes");
  const rawPhotoCaptions = formData.getAll("photoCaptions");
  const rawPhotoFiles = formData.getAll("photoFiles");
  const photos: Array<{
    file: File;
    photoType: ServiceReportPhotoType;
    caption: string | null;
  }> = [];
  let error: "photoType" | "photoSize" | null = null;

  for (const [index, value] of rawPhotoFiles.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    if (!value.type.startsWith("image/")) {
      error = "photoType";
      continue;
    }
    if (value.size > MAX_PHOTO_SIZE_BYTES) {
      error = "photoSize";
      continue;
    }

    const requestedPhotoType = String(rawPhotoTypes[index] ?? "Other").trim();
    const photoType = SERVICE_REPORT_PHOTO_TYPES.includes(
      requestedPhotoType as ServiceReportPhotoType,
    )
      ? (requestedPhotoType as ServiceReportPhotoType)
      : "Other";
    const photoCaption = String(rawPhotoCaptions[index] ?? "").trim();

    photos.push({
      file: value,
      photoType,
      caption: photoCaption || null,
    });
  }

  return { photos, error };
};

const readTextList = (formData: FormData, key: string) =>
  formData.getAll(key).map((value) => String(value ?? "").trim());

const readNumberList = (formData: FormData, key: string) =>
  formData.getAll(key).map((value) => {
    const numberValue = Number(value);

    return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
  });

const readAssetActionType = (value: string): AssetActionType => {
  if (value === "Installed" || value === "Returned") return value;

  return "Delivered";
};

const collectServiceItemRows = (formData: FormData) => {
  const serviceItemTypes = readTextList(formData, "serviceItemTypes");
  const serviceDetails = readTextList(formData, "serviceDetails");
  const amounts = readTextList(formData, "itemAmounts");
  const rootProblems = readTextList(formData, "rootProblems");
  const resolutions = readTextList(formData, "resolutions");
  const length = Math.max(
    serviceDetails.length,
    amounts.length,
    rootProblems.length,
    resolutions.length,
  );
  const rows: Array<{
    lineNo: number;
    serviceType: ServiceType;
    serviceDetail: string;
    amount: number;
    rootProblem: string;
    resolution: string;
  }> = [];

  for (let index = 0; index < length; index += 1) {
    const serviceDetail = serviceDetails[index] ?? "";
    const rootProblem = rootProblems[index] ?? "";
    const resolution = resolutions[index] ?? "";
    const amount = Number(amounts[index] || "1");
    const requestedServiceType = serviceItemTypes[index] ?? "";
    const serviceType = SERVICE_TYPES.includes(requestedServiceType as ServiceType)
      ? (requestedServiceType as ServiceType)
      : "Maintenance";

    if (!serviceDetail && !rootProblem && !resolution) continue;

    rows.push({
      lineNo: rows.length + 1,
      serviceType,
      serviceDetail,
      amount: Number.isInteger(amount) && amount > 0 ? amount : 1,
      rootProblem,
      resolution,
    });
  }

  if (rows.length > 0) return rows;

  const legacyServiceDetail = readText(formData, "serviceDetail");
  const legacyRootProblem = readText(formData, "rootProblem");
  const legacyResolution = readText(formData, "resolution");
  const legacyAmount = Math.max(1, Number(readText(formData, "amount") || "1"));

  return legacyServiceDetail || legacyRootProblem || legacyResolution
    ? [
        {
          lineNo: 1,
          serviceType: readServiceType(formData),
          serviceDetail: legacyServiceDetail,
          amount: Number.isFinite(legacyAmount) ? legacyAmount : 1,
          rootProblem: legacyRootProblem,
          resolution: legacyResolution,
        },
      ]
    : [];
};

const collectAssetRows = (formData: FormData) => {
  const actionTypes = readTextList(formData, "assetActionTypes");
  const inventoryIds = readNumberList(formData, "assetInventoryIds");
  const models = readTextList(formData, "assetModels");
  const serialNumbers = readTextList(formData, "assetSerialNumbers");
  const noSerials = readTextList(formData, "assetNoSerials");
  const amounts = readTextList(formData, "assetAmounts");
  const installationPoints = readTextList(formData, "assetInstallationPoints");
  const length = Math.max(
    actionTypes.length,
    inventoryIds.length,
    models.length,
    serialNumbers.length,
    noSerials.length,
    amounts.length,
    installationPoints.length,
  );
  const rows: Array<{
    lineNo: number;
    actionType: AssetActionType;
    inventoryId: number | null;
    model: string | null;
    serialNumber: string | null;
    noSerial: boolean;
    amount: number;
    installationPoint: string | null;
  }> = [];

  for (let index = 0; index < length; index += 1) {
    const model = models[index] ?? "";
    const noSerial = noSerials[index] === "1";
    const serialNumber = noSerial ? "" : serialNumbers[index] ?? "";
    const installationPoint = installationPoints[index] ?? "";
    const amount = Number(amounts[index] || "1");

    if (!model && !serialNumber && !installationPoint) continue;

    rows.push({
      lineNo: rows.length + 1,
      actionType: readAssetActionType(actionTypes[index] ?? "Delivered"),
      inventoryId: noSerial ? null : inventoryIds[index] ?? null,
      model: model || null,
      serialNumber: serialNumber || null,
      noSerial,
      amount: Number.isInteger(amount) && amount > 0 ? amount : 1,
      installationPoint: installationPoint || null,
    });
  }

  return rows;
};

const savePhotoFiles = async (
  photos: ReturnType<typeof collectPhotoFiles>["photos"],
  reportId: string,
) => {
  if (photos.length === 0) return [];

  const uploadDir = path.join(process.cwd(), "public", "uploads", "photos");
  await mkdir(uploadDir, { recursive: true });

  return Promise.all(
    photos.map(async ({ file, photoType, caption }) => {
      const fileName = `${reportId}-${photoType.toLowerCase()}-${randomUUID()}${extensionFromFile(
        file,
      )}`;
      const filePath = path.join(uploadDir, fileName);
      const bytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, bytes);

      return {
        photoType,
        caption,
        fileUrl: `/uploads/photos/${fileName}`,
        originalName: file.name || fileName,
        mimeType: file.type || "image/jpeg",
        sizeBytes: BigInt(file.size),
      };
    }),
  );
};

export async function submitServiceWorkAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  await requireFeature({ key: "service_reports", user, locale });
  const reportId = readText(formData, "reportId");
  const serviceItemRows = collectServiceItemRows(formData);
  const selectedServiceTypes =
    serviceItemRows.length > 0
      ? Array.from(new Set(serviceItemRows.map((item) => item.serviceType)))
      : collectServiceTypes(formData);
  const serviceType = selectedServiceTypes[0] ?? "Maintenance";
  const firstServiceItem = serviceItemRows[0] ?? null;
  const rootProblem = firstServiceItem?.rootProblem ?? "";
  const resolution = firstServiceItem?.resolution ?? "";
  const recommendation = readText(formData, "recommendation");
  const chargeType = readChargeType(formData);
  const serviceFee = readNumber(formData, "serviceFee");
  const otherChargeNote = readText(formData, "otherChargeNote");
  const responsivenessScore = readScore(formData, "responsivenessScore");
  const staffKnowledgeScore = readScore(formData, "staffKnowledgeScore");
  const serviceQualityScore = readScore(formData, "serviceQualityScore");
  const problemSolutionScore = readScore(formData, "problemSolutionScore");
  const overallScore = readScore(formData, "overallScore");
  const npsScore = readNumber(formData, "npsScore");
  const customerComment = readText(formData, "customerComment");
  const customerName = readText(formData, "customerName");
  const customerPosition = readText(formData, "customerPosition");
  const engineerName = readText(formData, "engineerName");
  const engineerPosition = readText(formData, "engineerPosition");
  const customerSignature = readText(formData, "customerSignature");
  const engineerSignature = readText(formData, "engineerSignature");
  const customerId = readNumber(formData, "customerId");
  const siteId = readNumber(formData, "siteId");
  const contactName = readText(formData, "contactName");
  const contactPhone = readText(formData, "contactPhone");
  const gpsLat = readNumber(formData, "gpsLat");
  const gpsLong = readNumber(formData, "gpsLong");
  const gpsAccuracy = readNumber(formData, "gpsAccuracy");
  const photoUpload = collectPhotoFiles(formData);
  const uploadedPhotos = photoUpload.photos;
  const assetRows = collectAssetRows(formData);
  const submitIntent = readText(formData, "submitIntent");
  const isDraft = submitIntent === "Draft";
  const targetStatus = isDraft ? "Draft" : "Submitted";
  const adminScheduledDate = readDateTime(readText(formData, "adminScheduledDate"));
  const adminDueAt = readDateTime(readText(formData, "adminDueAt"));

  if (!reportId) redirect(withLocale("/reports/create", locale));
  if (photoUpload.error) {
    redirectWithError(reportId, locale, photoUpload.error);
  }
  const hasPartialGps = (gpsLat === null) !== (gpsLong === null);
  const hasInvalidGps =
    gpsLat !== null &&
    gpsLong !== null &&
    (gpsLat < -90 || gpsLat > 90 || gpsLong < -180 || gpsLong > 180);
  if (hasPartialGps || hasInvalidGps) {
    redirectWithError(reportId, locale, "gpsInvalid");
  }
  if (
    !isDraft &&
    assetRows.some((asset) => asset.model && !asset.noSerial && !asset.serialNumber)
  ) {
    redirectWithError(reportId, locale, "assetSerial");
  }
  const duplicateSerials = new Set<string>();
  const seenSerials = new Set<string>();
  for (const asset of assetRows) {
    if (!asset.serialNumber) continue;

    const serialKey = asset.serialNumber.trim().toLowerCase();
    if (!serialKey) continue;
    if (seenSerials.has(serialKey)) duplicateSerials.add(serialKey);
    seenSerials.add(serialKey);
  }
  if (!isDraft && duplicateSerials.size > 0) {
    redirectWithError(reportId, locale, "assetDuplicateSerial");
  }
  if (
    !isDraft &&
    (serviceItemRows.length === 0 ||
      serviceItemRows.some(
        (item) => !item.serviceDetail || !item.rootProblem || !item.resolution,
      ))
  ) {
    redirectWithError(reportId, locale, "required");
  }
  if (!isDraft && (!customerName || !customerSignature)) {
    redirectWithError(reportId, locale, "customerSignature");
  }

  const report = await prisma.service_reports.findUnique({
    where: {
      report_id: reportId,
    },
    include: {
      customers: true,
      engineers: true,
      customer_contacts: true,
      customer_sites: true,
      service_report_assignments: {
        select: {
          engineer_id: true,
          status: true,
        },
      },
    },
  });

  if (!report) redirect(withLocale("/reports/create", locale));

  const roleName = user.roles.role_name;
  const isAdminLike = roleName === "admin";
  const isCreator = report.created_by === user.user_id;
  const isAssignedEngineer = user.engineers.some(
    (engineer) => engineer.engineer_id === report.engineer_id,
  );
  const isAssignedByHandoff = report.service_report_assignments.some(
    (assignment) =>
      user.engineers.some(
        (engineer) => engineer.engineer_id === assignment.engineer_id,
      ) && ["Assigned", "Accepted"].includes(String(assignment.status)),
  );

  if (!isAdminLike && !isAssignedEngineer && !isAssignedByHandoff && !isCreator) {
    redirect(withLocale("/reports/create", locale));
  }
  if (!isAdminLike && report.status && LOCKED_FOR_USER_STATUSES.has(report.status)) {
    redirect(withLocale(`/reports/${reportId}/service-form`, locale));
  }

  const resolvedCustomerId = customerId ?? report.customer_id;
  const [resolvedCustomer, selectedSite] = await Promise.all([
    prisma.customers.findUnique({
      where: {
        customer_id: resolvedCustomerId,
      },
    }),
    siteId === null
      ? Promise.resolve(null)
      : prisma.customer_sites.findUnique({
          where: {
            site_id: siteId,
          },
        }),
  ]);

  const validCustomer =
    resolvedCustomer ?? redirectWithError(reportId, locale, "default");
  if (selectedSite && selectedSite.customer_id !== validCustomer.customer_id) {
    redirectWithError(reportId, locale, "default");
  }

  const resolvedSite = selectedSite ?? (siteId === null ? null : report.customer_sites);
  const siteLat =
    resolvedSite?.gps_lat === null || resolvedSite?.gps_lat === undefined
      ? null
      : Number(resolvedSite.gps_lat);
  const siteLong =
    resolvedSite?.gps_long === null || resolvedSite?.gps_long === undefined
      ? null
      : Number(resolvedSite.gps_long);
  const siteDistanceKm =
    gpsLat !== null &&
    gpsLong !== null &&
    siteLat !== null &&
    siteLong !== null &&
    Number.isFinite(siteLat) &&
    Number.isFinite(siteLong)
      ? calculateDistanceKm(gpsLat, gpsLong, siteLat, siteLong)
      : null;

  if (siteDistanceKm !== null && siteDistanceKm > MAX_SITE_DISTANCE_KM) {
    redirectWithError(reportId, locale, "gpsRange");
  }

  const customerSignatureUrl = customerSignature
    ? await saveSignatureImage(customerSignature, reportId, "customer")
    : null;
  const engineerSignatureUrl = engineerSignature
    ? await saveSignatureImage(engineerSignature, reportId, "engineer")
    : null;

  const validCustomerSignatureUrl =
    isDraft
      ? customerSignatureUrl
      : customerSignatureUrl ??
        report.customer_signature_url ??
        redirectWithError(reportId, locale, "customerSignature");
  const now = new Date();
  const savedPhotos = await savePhotoFiles(uploadedPhotos, reportId);

  await prisma.$transaction(async (tx) => {
    const typedContact =
      report.customer_contacts &&
      report.customer_contacts.customer_id === validCustomer.customer_id &&
      report.customer_contacts.site_id === (resolvedSite?.site_id ?? null)
        ? report.customer_contacts
        : contactName
          ? await tx.customer_contacts.findFirst({
              where: {
                customer_id: validCustomer.customer_id,
                site_id: resolvedSite?.site_id ?? null,
                full_name: contactName,
              },
            })
          : null;
    const savedTypedContact =
      typedContact && (contactName || contactPhone) &&
      (typedContact.phone !== (contactPhone || typedContact.phone) ||
        typedContact.full_name !== (contactName || typedContact.full_name))
        ? await tx.customer_contacts.update({
            where: {
              contact_id: typedContact.contact_id,
            },
            data: {
              full_name: contactName || typedContact.full_name,
              phone: contactPhone || typedContact.phone,
            },
          })
        : typedContact;
    const createdContact =
      savedTypedContact ??
      (contactName || contactPhone
        ? await tx.customer_contacts.create({
            data: {
              customer_id: validCustomer.customer_id,
              site_id: resolvedSite?.site_id ?? null,
              full_name:
                contactName || validCustomer.contact_person || validCustomer.company_name,
              phone: contactPhone || null,
              is_active: true,
            },
          })
        : null);

    await tx.service_report_items.deleteMany({
      where: {
        report_id: reportId,
      },
    });

    if (serviceItemRows.length > 0) {
      await tx.service_report_items.createMany({
        data: serviceItemRows.map((item) => ({
          report_id: reportId,
          line_no: item.lineNo,
          service_type: item.serviceType,
          service_detail: item.serviceDetail,
          amount: item.amount,
          root_problem: item.rootProblem,
          resolution: item.resolution,
        })),
      });
    }

    await tx.service_report_assets.deleteMany({
      where: {
        report_id: reportId,
      },
    });
    await tx.report_equipment.deleteMany({
      where: {
        report_id: reportId,
      },
    });
    await tx.inventory_movements.deleteMany({
      where: {
        report_id: reportId,
      },
    });

    const requestedInventoryIds = assetRows
      .map((asset) => asset.inventoryId)
      .filter((inventoryId): inventoryId is number => inventoryId !== null);
    const requestedSerials = assetRows
      .map((asset) => asset.serialNumber)
      .filter((serialNumber): serialNumber is string => Boolean(serialNumber));
    const linkedInventory =
      isDraft || (requestedInventoryIds.length === 0 && requestedSerials.length === 0)
        ? []
        : await tx.inventory.findMany({
            where: {
              AND: [
                {
                  sap_is_active: {
                    not: false,
                  },
                },
                {
                  OR: [
                    ...(requestedInventoryIds.length > 0
                      ? [
                          {
                            inventory_id: {
                              in: requestedInventoryIds,
                            },
                          },
                        ]
                      : []),
                    ...(requestedSerials.length > 0
                      ? [
                          {
                            serial_number: {
                              in: requestedSerials,
                            },
                          },
                        ]
                      : []),
                  ],
                },
              ],
            },
          });
    const inventoryById = new Map(
      linkedInventory.map((inventory) => [inventory.inventory_id, inventory]),
    );
    const inventoryBySerial = new Map(
      linkedInventory.map((inventory) => [
        inventory.serial_number.trim().toLowerCase(),
        inventory,
      ]),
    );
    const linkedInventoryIds = new Set<number>();

    for (const asset of assetRows) {
      await tx.service_report_assets.create({
        data: {
          report_id: reportId,
          line_no: asset.lineNo,
          action_type: asset.actionType,
          brand: null,
          model: asset.model,
          amount: asset.amount,
          serial_number: asset.serialNumber,
          installation_point: asset.installationPoint,
          return_reason:
            asset.actionType === "Returned" ? asset.installationPoint : null,
        },
      });

      if (isDraft) continue;

      const inventory =
        (asset.inventoryId ? inventoryById.get(asset.inventoryId) : null) ??
        (asset.serialNumber
          ? inventoryBySerial.get(asset.serialNumber.trim().toLowerCase())
          : null);

      if (!inventory || linkedInventoryIds.has(inventory.inventory_id)) continue;

      linkedInventoryIds.add(inventory.inventory_id);

      const nextStatus =
        asset.actionType === "Returned" ? "Returned" : "Installed";

      await tx.report_equipment.create({
        data: {
          report_id: reportId,
          inventory_id: inventory.inventory_id,
          action_type: asset.actionType === "Returned" ? "Returned" : "Installed",
          reason: asset.installationPoint,
        },
      });

      await tx.inventory_movements.create({
        data: {
          inventory_id: inventory.inventory_id,
          report_id: reportId,
          from_status: inventory.status,
          to_status: nextStatus,
          from_location: inventory.warehouse_location,
          to_location: asset.installationPoint,
          note: `${asset.actionType} from service report ${report.job_number}`,
          moved_by: user.user_id,
          moved_at: now,
        },
      });

      await tx.inventory.update({
        where: {
          inventory_id: inventory.inventory_id,
        },
        data: {
          status: nextStatus,
          updated_at: now,
        },
      });
    }

    if (gpsLat !== null && gpsLong !== null) {
      await tx.service_report_locations.create({
        data: {
          report_id: reportId,
          location_type: "Finish",
          gps_lat: gpsLat,
          gps_long: gpsLong,
          accuracy_meters: gpsAccuracy,
          distance_meters: siteDistanceKm === null ? null : siteDistanceKm * 1000,
          captured_at: now,
        },
      });
    }

    for (const photo of savedPhotos) {
      const uploadedFile = await tx.uploaded_files.create({
        data: {
          file_category: "Photo",
          file_url: photo.fileUrl,
          original_name: photo.originalName,
          mime_type: photo.mimeType,
          size_bytes: photo.sizeBytes,
          uploaded_by: user.user_id,
        },
      });

      await tx.service_report_photos.create({
        data: {
          report_id: reportId,
          file_id: uploadedFile.file_id,
          photo_type: photo.photoType,
          file_url: photo.fileUrl,
          caption: photo.caption,
          gps_lat: gpsLat,
          gps_long: gpsLong,
          captured_at: now,
        },
      });
    }

    if (validCustomerSignatureUrl) {
      await tx.service_report_signatures.create({
        data: {
          report_id: reportId,
          signer_type: "Customer",
          signer_name: customerName || null,
          signer_position: customerPosition || null,
          signature_url: validCustomerSignatureUrl,
          signed_at: now,
        },
      });
    }

    if (engineerSignatureUrl) {
      await tx.service_report_signatures.create({
        data: {
          report_id: reportId,
          signer_type: "Engineer",
          signer_name: engineerName || null,
          signer_position: engineerPosition || null,
          signature_url: engineerSignatureUrl,
          signed_at: now,
        },
      });
    }

    await tx.service_reports.update({
      where: {
        report_id: reportId,
      },
      data: {
        service_type: serviceType,
        status: targetStatus,
        finish_time: isDraft ? report.finish_time : now,
        root_cause: rootProblem,
        resolution,
        recommendation: recommendation || null,
        charge_type: chargeType,
        service_fee: chargeType === "Charged" ? serviceFee : null,
        other_charge_note: otherChargeNote || null,
        customer_signature_url: validCustomerSignatureUrl ?? report.customer_signature_url,
        engineer_signature_url: engineerSignatureUrl ?? report.engineer_signature_url,
        submitted_at: isDraft ? report.submitted_at : now,
        customer_id: validCustomer.customer_id,
        site_id: resolvedSite?.site_id ?? null,
        contact_id: createdContact?.contact_id ?? report.contact_id,
        scheduled_date: adminScheduledDate,
        due_at: adminDueAt,
        gps_lat: gpsLat,
        gps_long: gpsLong,
      },
    });

    await tx.service_report_topics.deleteMany({
      where: {
        report_id: reportId,
      },
    });
    await tx.service_report_topics.createMany({
      data: selectedServiceTypes.map((selectedServiceType) => ({
        report_id: reportId,
        service_type: selectedServiceType,
      })),
      skipDuplicates: true,
    });

    const scores = [
      responsivenessScore,
      staffKnowledgeScore,
      serviceQualityScore,
      problemSolutionScore,
      overallScore,
    ];
    const filledScores = scores.filter((score): score is number => score !== null);
    const csatAverage =
      filledScores.length > 0
        ? filledScores.reduce((total, score) => total + score, 0) / filledScores.length
        : null;

    await tx.service_report_satisfaction.upsert({
      where: {
        report_id: reportId,
      },
      update: {
        responsiveness_score: responsivenessScore,
        staff_knowledge_score: staffKnowledgeScore,
        service_quality_score: serviceQualityScore,
        problem_solution_score: problemSolutionScore,
        overall_score: overallScore,
        csat_average: csatAverage,
        nps_score:
          npsScore !== null && Number.isInteger(npsScore) && npsScore >= 0 && npsScore <= 10
            ? npsScore
            : null,
        customer_comment: customerComment || null,
      },
      create: {
        report_id: reportId,
        responsiveness_score: responsivenessScore,
        staff_knowledge_score: staffKnowledgeScore,
        service_quality_score: serviceQualityScore,
        problem_solution_score: problemSolutionScore,
        overall_score: overallScore,
        csat_average: csatAverage,
        nps_score:
          npsScore !== null && Number.isInteger(npsScore) && npsScore >= 0 && npsScore <= 10
            ? npsScore
            : null,
        customer_comment: customerComment || null,
      },
    });

    if (report.status !== targetStatus) {
      await tx.service_report_status_history.create({
        data: {
          report_id: reportId,
          from_status: report.status,
          to_status: targetStatus,
          changed_by: user.user_id,
          note: isDraft
            ? "Technician saved service work draft"
            : "Technician submitted completed service work",
        },
      });
    }

    await tx.audit_logs.create({
      data: {
        user_id: user.user_id,
        action: isDraft ? "save_service_work_draft" : "submit_service_work",
        table_name: "service_reports",
        record_id: reportId,
        new_data: JSON.stringify({
          status: targetStatus,
          scheduled_date: isAdminLike ? adminScheduledDate : undefined,
          due_at: isAdminLike ? adminDueAt : undefined,
          service_types: selectedServiceTypes,
          uploaded_photos: savedPhotos.length,
          assets: assetRows.length,
        }),
      },
    });

    if (!isDraft) {
      const adminUsers = await tx.users.findMany({
        where: {
          is_active: true,
          roles: {
            role_name: "admin",
          },
        },
        select: {
          user_id: true,
        },
      });
      const adminNotifications = adminUsers
        .filter((adminUser) => adminUser.user_id !== user.user_id)
        .map((adminUser) => ({
          user_id: adminUser.user_id,
          notification_type: "Report_Submitted" as const,
          title: `Service report submitted: ${report.job_number}`,
          body: `${report.customers.company_name} - ${serviceType}`,
          link_url: withLocale(`/reports/${reportId}/service-form`, locale),
        }));

      if (adminNotifications.length > 0) {
        await tx.notifications.createMany({
          data: adminNotifications,
        });
      }
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/technician/jobs");
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/reports/${reportId}/service-form`);
  revalidatePath(`/reports/${reportId}/work`);
  redirect(
    isDraft
      ? `${withLocale(`/reports/${reportId}/work`, locale)}&status=DraftSaved`
      : `${withLocale(`/reports/${reportId}/service-form`, locale)}&status=Submitted`,
  );
}
