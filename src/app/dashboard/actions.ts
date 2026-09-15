"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLocale, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const MAX_CSV_SIZE_BYTES = 35 * 1024 * 1024;

type InventoryStatus =
  | "In_Stock"
  | "Installed"
  | "Returned"
  | "Defective"
  | "Reserved"
  | "Lost";

type CsvRow = Record<string, string>;

const normalizeHeader = (value: string) =>
  value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");

const limitText = (value: string, maxLength: number) => {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const scoreDecodedText = (value: string) => {
  const replacementCount = (value.match(/\uFFFD/g) ?? []).length;
  const nullCount = (value.match(/\u0000/g) ?? []).length;
  const thaiCount = (value.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const asciiSignalCount = (value.match(/[A-Za-z0-9,.\n\r]/g) ?? []).length;

  return thaiCount + asciiSignalCount - replacementCount * 40 - nullCount * 20;
};

const decodeCsvFile = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  const sample = bytes.subarray(0, Math.min(bytes.length, 4000));
  const oddNulls = sample.filter((_, index) => index % 2 === 1 && sample[index] === 0).length;
  const evenNulls = sample.filter((_, index) => index % 2 === 0 && sample[index] === 0).length;

  if (oddNulls > sample.length / 8 || evenNulls > sample.length / 8) {
    return new TextDecoder("utf-16le").decode(bytes).replace(/\u0000/g, "");
  }

  const candidates = ["utf-8", "windows-874", "tis-620"].map((encoding) => {
    const text = new TextDecoder(encoding).decode(bytes);
    return {
      encoding,
      text,
      score: scoreDecodedText(text),
    };
  });

  candidates.sort((first, second) => second.score - first.score);

  return candidates[0].text.replace(/\u0000/g, "");
};

const parseInventorySapRows = (content: string): CsvRow[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(1).flatMap((line) => {
    const columns = line.split(",").map((column) => column.trim());
    const itemNo = columns[0] ?? "";

    if (!itemNo || itemNo.startsWith("Item ") || itemNo.startsWith("Warehouse ")) {
      return [];
    }

    const unitIndex = columns.findIndex(
      (column, index) => index > 2 && normalizeHeader(column) === "unit",
    );

    if (unitIndex < 4) {
      return [];
    }

    const description = columns.slice(1, unitIndex - 3).join(",").trim();
    const whse = columns[unitIndex - 3] ?? "";
    const serialNo = columns[unitIndex - 2] ?? "";
    const batchNo = columns[unitIndex - 1] ?? "";

    return [
      {
        itemno: itemNo,
        itemdescription: description,
        whse,
        serialno: serialNo,
        batchno: batchNo,
        baseunit: columns[unitIndex] ?? "",
        totalquantity: columns[unitIndex + 1] ?? "",
        totalvalue: columns.slice(unitIndex + 2, unitIndex + 4).join(" ").trim(),
      },
    ];
  });
};

const readValue = (row: CsvRow, aliases: string[]) => {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value) return value.trim();
  }

  return "";
};

const parseCsvRows = (content: string): CsvRow[] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === "\"") {
      if (quoted && nextChar === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") index += 1;
      currentRow.push(currentValue.trim());
      if (currentRow.some(Boolean)) rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some(Boolean)) rows.push(currentRow);

  const [headers, ...dataRows] = rows;
  if (!headers) return [];
  const normalizedHeaders = headers.map(normalizeHeader);

  return dataRows.map((row) =>
    Object.fromEntries(
      normalizedHeaders.map((header, index) => [header, row[index]?.trim() ?? ""]),
    ),
  );
};

const readInt = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const readDecimal = (value: string) => {
  if (!value.trim()) return null;

  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanAddressToken = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^[-,.\s]+|[-,.\s]+$/g, "")
    .trim();

const pickAddressPart = (address: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = address.match(pattern);
    const value = cleanAddressToken(match?.[1] ?? "");
    if (value) return value;
  }

  return "";
};

const parseThaiAddress = (address1: string, address2: string) => {
  const address = cleanAddressToken([address1, address2].filter(Boolean).join(" "));
  const postalCode = pickAddressPart(address, [/(\d{5})(?!\d)/]);
  const province = pickAddressPart(address, [
    /(?:จังหวัด|จ\.)\s*([^\d,]+?)(?=\s+\d{5}|$)/,
  ]);
  const district = pickAddressPart(address, [
    /(?:อำเภอ|อ\.)\s*([^\d,]+?)(?=\s+(?:จังหวัด|จ\.|ตำบล|ต\.|แขวง|เขต|\d{5})|$)/,
    /(?:เขต)\s*([^\d,]+?)(?=\s+(?:จังหวัด|จ\.|แขวง|\d{5})|$)/,
  ]);
  const subdistrict = pickAddressPart(address, [
    /(?:ตำบล|ต\.)\s*([^\d,]+?)(?=\s+(?:อำเภอ|อ\.|จังหวัด|จ\.|\d{5})|$)/,
    /(?:แขวง)\s*([^\d,]+?)(?=\s+(?:เขต|จังหวัด|จ\.|\d{5})|$)/,
  ]);
  const road = pickAddressPart(address, [
    /(?:ถนน|ถ\.)\s*([^\d,]+?)(?=\s+(?:ต\.|ตำบล|อ\.|อำเภอ|แขวง|เขต|จ\.|จังหวัด|\d{5})|$)/,
  ]);
  const villageNo = pickAddressPart(address, [
    /(?:หมู่ที่|หมู่|ม\.)\s*([0-9A-Za-zก-๙/-]+)/,
  ]);
  const houseNo = pickAddressPart(address, [
    /(?:เลขที่)\s*([0-9A-Za-z/-]+)/,
    /^([0-9A-Za-z]+(?:[/-][0-9A-Za-z]+)*)(?=\s|$)/,
  ]);

  return {
    address,
    houseNo,
    villageNo,
    road,
    subdistrict,
    district,
    province,
    postalCode,
  };
};

const parseCustomerAddress = (address1: string, address2: string) => {
  const address = cleanAddressToken([address1, address2].filter(Boolean).join(" "));
  const postalCode = pickAddressPart(address, [/(\d{5})(?!\d)/]);
  const province = pickAddressPart(address, [
    /(?:จังหวัด|จ\.)\s*([^\d,]+?)(?=\s+\d{5}|$)/,
  ]);
  const district = pickAddressPart(address, [
    /(?:อำเภอ|อ\.)\s*([^\d,]+?)(?=\s+(?:จังหวัด|จ\.|ตำบล|ต\.|แขวง|เขต|\d{5})|$)/,
    /(?:เขต)\s*([^\d,]+?)(?=\s+(?:จังหวัด|จ\.|แขวง|\d{5})|$)/,
  ]);
  const subdistrict = pickAddressPart(address, [
    /(?:ตำบล|ต\.)\s*([^\d,]+?)(?=\s+(?:อำเภอ|อ\.|จังหวัด|จ\.|\d{5})|$)/,
    /(?:แขวง)\s*([^\d,]+?)(?=\s+(?:เขต|จังหวัด|จ\.|\d{5})|$)/,
  ]);
  const road = pickAddressPart(address, [
    /(?:ถนน|ถ\.)\s*([^\d,]+?)(?=\s+(?:ต\.|ตำบล|อ\.|อำเภอ|แขวง|เขต|จ\.|จังหวัด|\d{5})|$)/,
  ]);
  const villageNo = pickAddressPart(address, [
    /(?:หมู่ที่|หมู่|ม\.)\s*([0-9A-Za-zก-๙/-]+)/,
  ]);
  const houseNo = pickAddressPart(address, [
    /(?:เลขที่)\s*([0-9A-Za-z/-]+)/,
    /^([0-9A-Za-z]+(?:[/-][0-9A-Za-z]+)*)(?=\s|$)/,
  ]);

  return {
    address,
    houseNo,
    villageNo,
    road,
    subdistrict,
    district,
    province,
    postalCode,
  };
};

const readDate = (value: string) => {
  if (!value) return null;

  const normalized = value.includes("/") ? value.split("/").reverse().join("-") : value;
  const date = new Date(`${normalized}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const readStatus = (value: string): InventoryStatus => {
  const normalized = normalizeHeader(value);

  if (normalized === "instock" || normalized === "available") return "In_Stock";
  if (normalized === "installed") return "Installed";
  if (normalized === "returned") return "Returned";
  if (normalized === "defective" || normalized === "damaged") return "Defective";
  if (normalized === "reserved") return "Reserved";
  if (normalized === "lost") return "Lost";

  return "In_Stock";
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const readImportReturnPath = (formData: FormData) => {
  const value = String(formData.get("returnTo") ?? "/dashboard");
  return value === "/dashboard/system" ? value : "/dashboard";
};

export async function importInventoryCsvAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  const returnPath = readImportReturnPath(formData);

  if (user.roles.role_name !== "admin") {
    throw new Error("Only admin users can import inventory CSV.");
  }

  const file = formData.get("inventoryCsv");
  const importMode =
    String(formData.get("inventoryImportMode") ?? "merge") === "sync"
      ? "sync"
      : "merge";

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${withLocale(returnPath, locale)}&import_error=missing`);
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    redirect(`${withLocale(returnPath, locale)}&import_error=size`);
  }

  const decodedCsv = await decodeCsvFile(file);
  const rows = parseInventorySapRows(decodedCsv);
  let createdEquipment = 0;
  let createdInventory = 0;
  let updatedInventory = 0;
  let deactivatedInventory = 0;
  let skippedRows = 0;
  const importedAt = new Date();
  const seenSerials = new Set<string>();
  const equipmentCache = new Map<
    string,
    Awaited<ReturnType<typeof prisma.equipment_master.findFirst>>
  >();

  for (const row of rows) {
    const sapItemNo = limitText(
      readValue(row, [
        "Item No.",
        "Item No",
        "item_no",
        "material",
        "material_code",
        "item_code",
      ]),
      50,
    );
    const brand = limitText(readValue(row, ["brand", "manufacturer", "ยี่ห้อ"]), 100);
    const serialNumber = limitText(
      readValue(row, [
        "Serial No.",
        "Serial No",
        "serial_number",
        "serial",
        "serial_no",
        "serial no",
        "s/n",
        "เลขซีเรียล",
      ]),
      100,
    );
    const batchNumber = limitText(
      readValue(row, ["Batch No.", "Batch No", "batch_number", "batch"]),
      100,
    );
    const description = readValue(row, [
      "Item Description",
      "description",
      "material_description",
      "item_description",
      "ชื่อสินค้า",
      "รายละเอียด",
    ]);
    const model = limitText(
      readValue(row, ["model", "equipment_model", "รุ่น"]) ||
        description ||
        sapItemNo ||
        "Unknown",
      100,
    );
    const category = limitText(readValue(row, ["category", "หมวดหมู่"]), 100);
    const unit = limitText(readValue(row, ["Base Unit", "unit", "uom", "หน่วย"]), 50);
    const minimumStock = readInt(
      readValue(row, ["minimum_stock", "min_stock", "minimumstock"]),
    );
    const status = readStatus(readValue(row, ["status", "สถานะ"]));
    const warehouseLocation = limitText(
      readValue(row, [
        "Whse",
        "warehouse_location",
        "warehouse",
        "location",
        "storage_location",
        "คลัง",
      ]),
      100,
    );
    const purchaseDate = readDate(readValue(row, ["purchase_date", "purchasedate"]));
    const warrantyExpireAt = readDate(
      readValue(row, ["warranty_expire_at", "warranty", "warrantyexpireat"]),
    );
    const quantity = readDecimal(
      readValue(row, ["Total - Quantity", "Total Quantity", "quantity", "qty"]),
    );
    const inventoryValue = readDecimal(
      readValue(row, ["Total - Value", "Total Value", "inventory_value", "value"]),
    );

    if (!serialNumber || !sapItemNo) {
      skippedRows += 1;
      continue;
    }
    seenSerials.add(serialNumber);

    try {
      let equipment = equipmentCache.get(sapItemNo);

      if (!equipment) {
        equipment = await prisma.equipment_master.findFirst({
          where: {
            sap_item_no: sapItemNo,
          },
        });
      }

      if (!equipment) {
        equipment = await prisma.equipment_master.create({
          data: {
            sap_item_no: sapItemNo || null,
            brand: brand || null,
            model,
            description: description || null,
            category: category || null,
            unit: unit || null,
            minimum_stock: minimumStock,
          },
        });
        createdEquipment += 1;
      } else {
        equipment = await prisma.equipment_master.update({
          where: {
            equipment_id: equipment.equipment_id,
          },
          data: {
            brand: brand || equipment.brand,
            model: model || equipment.model,
            description: description || equipment.description,
            category: category || equipment.category,
            unit: unit || equipment.unit,
            minimum_stock: minimumStock ?? equipment.minimum_stock,
          },
        });
      }
      equipmentCache.set(sapItemNo, equipment);

      const existingInventory = await prisma.inventory.findUnique({
        where: {
          serial_number: serialNumber,
        },
      });

      if (existingInventory) {
        await prisma.inventory.update({
          where: {
            inventory_id: existingInventory.inventory_id,
          },
          data: {
            equipment_id: equipment.equipment_id,
            batch_number: batchNumber || null,
            status,
            warehouse_location: warehouseLocation || null,
            quantity,
            inventory_value: inventoryValue,
            purchase_date: purchaseDate,
            warranty_expire_at: warrantyExpireAt,
            sap_is_active: true,
            last_seen_import_at: importedAt,
            last_import_file: limitText(file.name, 255),
          },
        });
        updatedInventory += 1;
      } else {
        await prisma.inventory.create({
          data: {
            equipment_id: equipment.equipment_id,
            serial_number: serialNumber,
            batch_number: batchNumber || null,
            status,
            warehouse_location: warehouseLocation || null,
            quantity,
            inventory_value: inventoryValue,
            purchase_date: purchaseDate,
            warranty_expire_at: warrantyExpireAt,
            sap_is_active: true,
            last_seen_import_at: importedAt,
            last_import_file: limitText(file.name, 255),
          },
        });
        createdInventory += 1;
      }
    } catch (error) {
      console.error("Skipping inventory CSV row", error);
      skippedRows += 1;
    }
  }

  if (importMode === "sync" && seenSerials.size > 0) {
    const activeInventory = await prisma.inventory.findMany({
      where: {
        sap_is_active: {
          not: false,
        },
      },
      select: {
        inventory_id: true,
        serial_number: true,
      },
    });
    const inactiveIds = activeInventory
      .filter((item) => !seenSerials.has(item.serial_number))
      .map((item) => item.inventory_id);

    for (const idChunk of chunk(inactiveIds, 500)) {
      const result = await prisma.inventory.updateMany({
        where: {
          inventory_id: {
            in: idChunk,
          },
        },
        data: {
          sap_is_active: false,
          last_import_file: limitText(file.name, 255),
        },
      });
      deactivatedInventory += result.count;
    }
  }

  await prisma.audit_logs.create({
    data: {
      user_id: user.user_id,
      action: "import_inventory_csv",
      table_name: "inventory",
      new_data: JSON.stringify({
        fileName: file.name,
        rows: rows.length,
        mode: importMode,
        createdEquipment,
        createdInventory,
        updatedInventory,
        deactivatedInventory,
        skippedRows,
      }),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/system");
  revalidatePath("/inventory");
  revalidatePath("/reports");
  revalidatePath("/reports/create");
  revalidatePath("/technician/jobs");
  redirect(
    `${withLocale(
      returnPath,
      locale,
    )}&inventory_imported=${rows.length}&inventory_created=${createdInventory}&inventory_updated=${updatedInventory}&inventory_deactivated=${deactivatedInventory}&inventory_skipped=${skippedRows}&inventory_mode=${importMode}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parseBusinessPartnerRows = (content: string) =>
  parseCsvRows(content).map((row) => {
    const bpCode = limitText(
      readValue(row, ["รหัสลูกค้า", "BP Code", "Customer Code", "CardCode"]) ||
        readValue(row, ["1"]),
      50,
    );
    const bpName = limitText(
      readValue(row, ["ชื่อตาม ภ.พ.20", "ชื่อลูกค้า", "Customer", "BP Name", "CardName"]),
      255,
    );
    const address1 = readValue(row, ["ที่อยู่ 1", "Address 1", "address1"]);
    const address2 = readValue(row, ["ที่อยู่ 2", "Address 2", "address2"]);
    const taxId = limitText(
      readValue(row, [
        "เลขประจำตัวผู้เสียภาษีอากร",
        "Tax ID",
        "TaxId",
        "Federal Tax ID",
      ]),
      50,
    );
    const accountBalance = readDecimal(
      readValue(row, ["ยอดคงเหลือ", "Balance", "Account Balance"]),
    );
    const addressParts = parseThaiAddress(address1, address2);

    return {
      bpCode,
      bpName,
      accountBalance,
      taxId,
      ...addressParts,
    };
  });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parseCustomerCsvRows = (content: string) =>
  parseCsvRows(content).map((row) => {
    const bpCode = limitText(
      readValue(row, [
        "รหัสลูกค้า",
        "BP Code",
        "Customer Code",
        "CardCode",
        "CustomerCode",
      ]),
      50,
    );
    const bpName = limitText(
      readValue(row, [
        "ชื่อตาม ภ.พ.20",
        "ชื่อลูกค้า",
        "ชื่อลูกค้า/บริษัท",
        "Customer",
        "BP Name",
        "CardName",
        "Customer Name",
      ]),
      255,
    );
    const address1 = readValue(row, [
      "ที่อยู่ 1",
      "Address 1",
      "Address1",
      "Bill To Address",
    ]);
    const address2 = readValue(row, [
      "ที่อยู่ 2",
      "Address 2",
      "Address2",
      "Ship To Address",
    ]);
    const taxId = limitText(
      readValue(row, [
        "เลขประจำตัวผู้เสียภาษีอากร",
        "เลขประจำตัวผู้เสียภาษี",
        "Tax ID",
        "TaxId",
        "Federal Tax ID",
      ]),
      50,
    );
    const accountBalance = readDecimal(
      readValue(row, ["ยอดคงเหลือ", "Balance", "Account Balance"]),
    );
    const addressParts = parseCustomerAddress(address1, address2);

    return {
      bpCode,
      bpName,
      accountBalance,
      taxId,
      ...addressParts,
    };
  });

const parseCustomerAddressStrict = (address1: string, address2: string) => {
  const address = cleanAddressToken([address1, address2].filter(Boolean).join(" "));
  const postalCode = pickAddressPart(address, [/(\d{5})(?!\d)/]);
  const province = pickAddressPart(address, [
    /(?:\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\u0E08\.)\s*([^\d,]+?)(?=\s+\d{5}|$)/,
  ]);
  const district = pickAddressPart(address, [
    /(?:\u0E2D\u0E33\u0E40\u0E20\u0E2D|\u0E2D\.)\s*([^\d,]+?)(?=\s+(?:\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\u0E08\.|\u0E15\u0E33\u0E1A\u0E25|\u0E15\.|\u0E41\u0E02\u0E27\u0E07|\u0E40\u0E02\u0E15|\d{5})|$)/,
    /(?:\u0E40\u0E02\u0E15)\s*([^\d,]+?)(?=\s+(?:\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\u0E08\.|\u0E41\u0E02\u0E27\u0E07|\d{5})|$)/,
  ]);
  const subdistrict = pickAddressPart(address, [
    /(?:\u0E15\u0E33\u0E1A\u0E25|\u0E15\.)\s*([^\d,]+?)(?=\s+(?:\u0E2D\u0E33\u0E40\u0E20\u0E2D|\u0E2D\.|\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\u0E08\.|\d{5})|$)/,
    /(?:\u0E41\u0E02\u0E27\u0E07)\s*([^\d,]+?)(?=\s+(?:\u0E40\u0E02\u0E15|\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\u0E08\.|\d{5})|$)/,
  ]);
  const road = pickAddressPart(address, [
    /(?:\u0E16\u0E19\u0E19|\u0E16\.)\s*([^\d,]+?)(?=\s+(?:\u0E15\.|\u0E15\u0E33\u0E1A\u0E25|\u0E2D\.|\u0E2D\u0E33\u0E40\u0E20\u0E2D|\u0E41\u0E02\u0E27\u0E07|\u0E40\u0E02\u0E15|\u0E08\.|\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\d{5})|$)/,
  ]);
  const villageNo = pickAddressPart(address, [
    /(?:\u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48|\u0E2B\u0E21\u0E39\u0E48|\u0E21\.)\s*([0-9A-Za-z\u0E01-\u0E59/-]+)/,
  ]);
  const houseNo = pickAddressPart(address, [
    /(?:\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48)\s*([0-9A-Za-z/-]+)/,
    /^([0-9A-Za-z]+(?:[/-][0-9A-Za-z]+)*)(?=\s|$)/,
  ]);

  return {
    address,
    houseNo,
    villageNo,
    road,
    subdistrict,
    district,
    province,
    postalCode,
  };
};

const splitCsvLine = (line: string) => {
  const columns: string[] = [];
  let currentValue = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"") {
      if (quoted && nextChar === "\"") {
        currentValue += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      columns.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  columns.push(currentValue.trim());

  return columns;
};

const normalizeTaxId = (value: string) => {
  const digits = value.replace(/\D/g, "");

  return digits.length >= 10 && digits.length <= 13 ? digits : "";
};

const looksLikeAddressStart = (value: string) => {
  const normalized = value.trim();

  return (
    /^[0-9]/.test(normalized) ||
    /^p\.?\s*o\.?\s*box/i.test(normalized) ||
    /^(?:\u0E40\u0E25\u0E02\u0E17\u0E35\u0E48|\u0E2B\u0E21\u0E39\u0E48|\u0E16\u0E19\u0E19|\u0E16\.|\u0E15\u0E33\u0E1A\u0E25|\u0E15\.|\u0E2D\u0E33\u0E40\u0E20\u0E2D|\u0E2D\.|\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E31\u0E14|\u0E08\.|\u0E2D\u0E32\u0E04\u0E32\u0E23|\u0E19\u0E34\u0E04\u0E21)/.test(
      normalized,
    )
  );
};

const normalizeCustomerCsvRow = (columns: string[]) => {
  const bpCode = limitText(columns[1] ?? "", 50);
  const tail = columns
    .slice(2)
    .map((column) => column.trim())
    .filter((column, index, items) => column || index < items.length - 1);
  const taxIndex = tail.findLastIndex((column) => Boolean(normalizeTaxId(column)));
  const taxId = taxIndex >= 0 ? normalizeTaxId(tail[taxIndex]) : "";
  const body = (taxIndex >= 0 ? tail.slice(0, taxIndex) : tail).filter(
    (column, index, items) => column || index < items.length - 1,
  );
  const addressStartIndex = body.findIndex(
    (column, index) => index > 0 && looksLikeAddressStart(column),
  );
  const splitIndex = addressStartIndex > 0 ? addressStartIndex : 1;
  const bpName = limitText(
    body
      .slice(0, splitIndex)
      .filter(Boolean)
      .join(", "),
    255,
  );
  const address = body.slice(splitIndex).filter(Boolean).join(" ");
  const addressParts = parseCustomerAddressStrict(address, "");

  return {
    bpCode,
    bpName,
    accountBalance: null,
    taxId,
    ...addressParts,
  };
};

const parseCustomerCsvRowsStrict = (content: string) =>
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => normalizeCustomerCsvRow(splitCsvLine(line)));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parseCustomerCsvRowsStrictLegacy = (content: string) =>
  parseCsvRows(content).map((row) => {
    const bpCode = limitText(
      readValue(row, [
        "\u0E23\u0E2B\u0E31\u0E2A\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
        "BP Code",
        "Customer Code",
        "CardCode",
        "CustomerCode",
      ]),
      50,
    );
    const bpName = limitText(
      readValue(row, [
        "\u0E0A\u0E37\u0E48\u0E2D\u0E15\u0E32\u0E21 \u0E20.\u0E1E.20",
        "\u0E0A\u0E37\u0E48\u0E2D\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
        "Customer",
        "BP Name",
        "CardName",
        "Customer Name",
      ]),
      255,
    );
    const address1 = readValue(row, [
      "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 1",
      "Address 1",
      "Address1",
      "Bill To Address",
    ]);
    const address2 = readValue(row, [
      "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 2",
      "Address 2",
      "Address2",
      "Ship To Address",
    ]);
    const taxId = limitText(
      readValue(row, [
        "\u0E40\u0E25\u0E02\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E15\u0E31\u0E27\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E20\u0E32\u0E29\u0E35\u0E2D\u0E32\u0E01\u0E23",
        "Tax ID",
        "TaxId",
        "Federal Tax ID",
      ]),
      50,
    );
    const accountBalance = readDecimal(
      readValue(row, [
        "\u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D",
        "Balance",
        "Account Balance",
      ]),
    );
    const addressParts = parseCustomerAddressStrict(address1, address2);

    return {
      bpCode,
      bpName,
      accountBalance,
      taxId,
      ...addressParts,
    };
  });

export async function importBusinessPartnersCsvAction(formData: FormData) {
  const locale = getLocale(String(formData.get("lang") ?? "en"));
  const user = await requireUser(locale);
  const returnPath = readImportReturnPath(formData);

  if (user.roles.role_name !== "admin") {
    throw new Error("Only admin users can import customer CSV.");
  }

  const file = formData.get("businessPartnersCsv");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${withLocale(returnPath, locale)}&customer_import_error=missing`);
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    redirect(`${withLocale(returnPath, locale)}&customer_import_error=size`);
  }

  const rows = parseCustomerCsvRowsStrict(await decodeCsvFile(file));
  let createdCustomers = 0;
  let updatedCustomers = 0;
  let createdSites = 0;
  let updatedSites = 0;
  let skippedRows = 0;
  const lookupRows = rows.filter((row) => row.bpCode);
  const bpCodes = Array.from(new Set(lookupRows.map((row) => row.bpCode)));
  const bpNames = Array.from(
    new Set(lookupRows.map((row) => row.bpName || row.bpCode)),
  );
  const existingCustomers =
    bpCodes.length > 0 || bpNames.length > 0
      ? await prisma.customers.findMany({
          where: {
            OR: [
              ...(bpCodes.length > 0 ? [{ sap_bp_code: { in: bpCodes } }] : []),
              ...(bpNames.length > 0 ? [{ company_name: { in: bpNames } }] : []),
            ],
          },
        })
      : [];
  const customerByCode = new Map(
    existingCustomers
      .filter((customer) => customer.sap_bp_code)
      .map((customer) => [customer.sap_bp_code as string, customer]),
  );
  const customerByName = new Map(
    existingCustomers.map((customer) => [customer.company_name, customer]),
  );
  const existingSites =
    bpCodes.length > 0 || bpNames.length > 0
      ? await prisma.customer_sites.findMany({
          where: {
            OR: [
              ...(bpCodes.length > 0 ? [{ site_code: { in: bpCodes } }] : []),
              ...(bpNames.length > 0 ? [{ site_name: { in: bpNames } }] : []),
            ],
          },
        })
      : [];
  const siteByCustomerAndCode = new Map(
    existingSites
      .filter((site) => site.site_code)
      .map((site) => [`${site.customer_id}:${site.site_code}`, site]),
  );
  const siteByCustomerAndName = new Map(
    existingSites.map((site) => [`${site.customer_id}:${site.site_name}`, site]),
  );

  for (const row of rows) {
    if (!row.bpCode) {
      skippedRows += 1;
      continue;
    }

    try {
      const companyName = row.bpName || row.bpCode;
      let existingCustomer =
        customerByCode.get(row.bpCode) ?? customerByName.get(companyName);

      if (existingCustomer) {
        existingCustomer = await prisma.customers.update({
          where: {
            customer_id: existingCustomer.customer_id,
          },
          data: {
            sap_bp_code: row.bpCode,
            company_name: companyName,
            tax_id: row.taxId || null,
            address: row.address || null,
            province: row.province || null,
            postal_code: row.postalCode || null,
            account_balance: row.accountBalance,
          },
        });
        updatedCustomers += 1;
      } else {
        existingCustomer = await prisma.customers.create({
          data: {
            sap_bp_code: row.bpCode,
            company_name: companyName,
            tax_id: row.taxId || null,
            address: row.address || null,
            province: row.province || null,
            postal_code: row.postalCode || null,
            account_balance: row.accountBalance,
          },
        });
        createdCustomers += 1;
      }
      customerByCode.set(row.bpCode, existingCustomer);
      customerByName.set(companyName, existingCustomer);

      if (row.address) {
        const siteCodeKey = `${existingCustomer.customer_id}:${row.bpCode}`;
        const siteNameKey = `${existingCustomer.customer_id}:${companyName}`;
        const existingSite =
          siteByCustomerAndCode.get(siteCodeKey) ??
          siteByCustomerAndName.get(siteNameKey);
        const siteData = {
          site_code: row.bpCode,
          site_name: companyName,
          address: row.address,
          house_no: row.houseNo || null,
          village_no: row.villageNo || null,
          road: row.road || null,
          subdistrict: row.subdistrict || null,
          district: row.district || null,
          province: row.province || null,
          postal_code: row.postalCode || null,
          is_active: true,
        };

        if (existingSite) {
          const updatedSite = await prisma.customer_sites.update({
            where: {
              site_id: existingSite.site_id,
            },
            data: siteData,
          });
          siteByCustomerAndCode.set(siteCodeKey, updatedSite);
          siteByCustomerAndName.set(siteNameKey, updatedSite);
          updatedSites += 1;
        } else {
          const createdSite = await prisma.customer_sites.create({
            data: {
              customer_id: existingCustomer.customer_id,
              ...siteData,
            },
          });
          siteByCustomerAndCode.set(siteCodeKey, createdSite);
          siteByCustomerAndName.set(siteNameKey, createdSite);
          createdSites += 1;
        }
      }
    } catch (error) {
      console.error("Skipping customer CSV row", error);
      skippedRows += 1;
    }
  }

  await prisma.audit_logs.create({
    data: {
      user_id: user.user_id,
      action: "import_business_partners_csv",
      table_name: "customers",
      new_data: JSON.stringify({
        fileName: file.name,
        rows: rows.length,
        createdCustomers,
        updatedCustomers,
        createdSites,
        updatedSites,
        skippedRows,
      }),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/system");
  revalidatePath("/customers");
  revalidatePath("/reports/create");
  redirect(
    `${withLocale(
      returnPath,
      locale,
    )}&customer_imported=${rows.length}&customer_created=${createdCustomers}&customer_updated=${updatedCustomers}&customer_sites_created=${createdSites}&customer_sites_updated=${updatedSites}&customer_skipped=${skippedRows}`,
  );
}
