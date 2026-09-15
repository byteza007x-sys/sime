import { prisma } from "@/lib/prisma";
import { constants } from "fs";
import { access, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const checkWritableDirectory = async (directory: string) => {
  try {
    await mkdir(directory, { recursive: true });
    await access(directory, constants.W_OK);

    return "ok" as const;
  } catch {
    return "error" as const;
  }
};

export async function GET() {
  const startedAt = Date.now();
  const photosDir = path.join(process.cwd(), "public", "uploads", "photos");
  const signaturesDir = path.join(process.cwd(), "public", "uploads", "signatures");

  const [database, photos, signatures] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(
      () => "ok" as const,
      () => "error" as const,
    ),
    checkWritableDirectory(photosDir),
    checkWritableDirectory(signaturesDir),
  ]);
  const ok = database === "ok" && photos === "ok" && signatures === "ok";

  return Response.json(
    {
      ok,
      service: "e service",
      database,
      uploads: {
        photos,
        signatures,
      },
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
