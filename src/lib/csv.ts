const normalizeCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();

  return String(value).replace(/\r?\n/g, " ").trim();
};

export const toCsv = (headers: string[], rows: unknown[][]) => {
  const escapeCell = (value: unknown) => {
    const text = normalizeCell(value);
    const escaped = text.replace(/"/g, '""');

    return `"${escaped}"`;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
};

export const csvResponse = (filename: string, csv: string) =>
  new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
