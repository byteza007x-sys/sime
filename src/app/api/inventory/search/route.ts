import type { inventoryWhereInput } from "@/generated/prisma/models/inventory";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 40;
const MAX_MODEL_RESULTS = 200;

const sanitizeQuery = (value: string | null) => String(value ?? "").trim().slice(0, 80);

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ suggestions: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = sanitizeQuery(url.searchParams.get("q"));
  const modelQuery = sanitizeQuery(url.searchParams.get("model"));
  const where: inventoryWhereInput = {
    AND: [
      {
        sap_is_active: {
          not: false,
        },
      },
      modelQuery
        ? {
            OR: [
              {
                equipment_master: {
                  sap_item_no: {
                    contains: modelQuery,
                  },
                },
              },
              {
                equipment_master: {
                  model: {
                    contains: modelQuery,
                  },
                },
              },
              {
                equipment_master: {
                  description: {
                    contains: modelQuery,
                  },
                },
              },
            ],
          }
        : {},
      query
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
        : {},
    ],
  };

  const inventory = await prisma.inventory.findMany({
    where,
    select: {
      inventory_id: true,
      serial_number: true,
      equipment_master: {
        select: {
          sap_item_no: true,
          model: true,
          description: true,
        },
      },
    },
    orderBy: [
      {
        serial_number: "asc",
      },
      {
        inventory_id: "asc",
      },
    ],
    take: modelQuery ? MAX_MODEL_RESULTS : MAX_RESULTS,
  });

  return Response.json({
    suggestions: inventory.map((item) => {
      const model =
        item.equipment_master.description ||
        item.equipment_master.model ||
        item.equipment_master.sap_item_no ||
        "";

      return {
        key: String(item.inventory_id),
        inventoryId: item.inventory_id,
        label: item.equipment_master.sap_item_no || "",
        model,
        serialNumber: item.serial_number,
      };
    }),
  });
}
