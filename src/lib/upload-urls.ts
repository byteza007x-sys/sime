const PUBLIC_MARKER = "/public/";
const UPLOADS_MARKER = "/uploads/";

export const normalizeUploadUrl = (value: string | null | undefined) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) return trimmed;

  const normalized = trimmed.replace(/\\/g, "/");

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const uploadPath = extractUploadPath(url.pathname);
      return uploadPath ? `${uploadPath}${url.search}` : normalized;
    } catch {
      return normalized;
    }
  }

  return extractUploadPath(normalized) ?? (normalized.startsWith("/") ? normalized : `/${normalized}`);
};

const extractUploadPath = (value: string) => {
  const publicIndex = value.lastIndexOf(PUBLIC_MARKER);
  const fromPublic =
    publicIndex >= 0 ? value.slice(publicIndex + PUBLIC_MARKER.length - 1) : value;

  const uploadsIndex = fromPublic.indexOf(UPLOADS_MARKER);
  if (uploadsIndex >= 0) return fromPublic.slice(uploadsIndex);

  const relativeUploadsIndex = fromPublic.indexOf("uploads/");
  if (relativeUploadsIndex >= 0) return `/${fromPublic.slice(relativeUploadsIndex)}`;

  return null;
};
