import type { inventoryWhereInput } from "@/generated/prisma/models/inventory";
import { getCurrentUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { requireFeature } from "@/lib/features";
import { getLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type InventoryView = "active" | "inactive" | "all";

const sanitizeQuery = (value: string | null) => String(value ?? "").trim().slice(0, 120);

const parseView = (value: string | null): InventoryView =>
  value === "inactive" || value === "all" ? value : "active";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const locale = getLocale(url.searchParams.get("lang") ?? undefined);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await requireFeature({ key: "inventory", user, locale });

  if (user.roles.role_name !== "admin" && !isOwnerUser(user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const query = sanitizeQuery(url.searchParams.get("q"));
  const view = parseView(url.searchParams.get("view"));
  const statusWhere: inventoryWhereInput =
    view === "active"
      ? {
          sap_is_active: {
            not: false,
          },
        }
      : view === "inactive"
        ? {
            sap_is_active: false,
          }
        : {};
  const searchWhere: inventoryWhereInput = query
    ? {
        OR: [
          {
            serial_number: {
              contains: query,
            },
          },
          {
            equipment_master: {
              sap_item_no: {
                contains: query,
              },
            },
          },
          {
            equipment_master: {
              model: {
                contains: query,
              },
            },
          },
          {
            equipment_master: {
              description: {
                contains: query,
              },
            },
          },
        ],
      }
    : {};
  const where: inventoryWhereInput = {
    AND: [statusWhere, searchWhere],
  };

  const inventory = await prisma.inventory.findMany({
    where,
    select: {
      serial_number: true,
      batch_number: true,
      status: true,
      quantity: true,
      sap_is_active: true,
      last_seen_import_at: true,
      last_import_file: true,
      updated_at: true,
      equipment_master: {
        select: {
          sap_item_no: true,
          brand: true,
          model: true,
          description: true,
          category: true,
          unit: true,
        },
      },
    },
    orderBy: [
      {
        equipment_master: {
          sap_item_no: "asc",
        },
      },
      {
        equipment_master: {
          model: "asc",
        },
      },
      {
        serial_number: "asc",
      },
    ],
  });

  const rows = inventory.map((item, index) => [
    index + 1,
    item.equipment_master.sap_item_no,
    item.equipment_master.model || item.equipment_master.description,
    item.equipment_master.description,
    item.equipment_master.brand,
    item.equipment_master.category,
    item.serial_number,
    item.batch_number,
    item.status,
    item.quantity?.toString(),
    item.equipment_master.unit,
    item.sap_is_active === false ? "Hidden" : "Active",
    item.last_seen_import_at,
    item.last_import_file,
    item.updated_at,
  ]);

  const csv = toCsv(
    [
      "No.",
      "Item No.",
      "Model",
      "Description",
      "Brand",
      "Category",
      "Serial Number",
      "Batch Number",
      "Inventory Status",
      "Quantity",
      "Unit",
      "SAP Sync Status",
      "Last Seen Import At",
      "Last Import File",
      "Updated At",
    ],
    rows,
  );

  return csvResponse(`e-service-inventory-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
