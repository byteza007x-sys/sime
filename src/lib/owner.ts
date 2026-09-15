import "server-only";

import { type Locale, withLocale } from "@/lib/i18n";
import { redirect } from "next/navigation";

export const OWNER_USERNAME = (process.env.OWNER_USERNAME || "byteza007x").toLowerCase();

type OwnerLikeUser = {
  username: string | null;
};

export const isOwnerUser = (user: OwnerLikeUser | null | undefined) =>
  String(user?.username ?? "").toLowerCase() === OWNER_USERNAME;

export const requireOwner = (
  user: OwnerLikeUser | null | undefined,
  locale: Locale,
) => {
  if (!isOwnerUser(user)) {
    redirect(withLocale("/dashboard", locale));
  }
};
