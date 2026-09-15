import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { isOwnerUser } from "@/lib/owner";

interface HomePageProps {
  searchParams: RouteSearchParams;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const locale = getLocale(params.lang);
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(withLocale("/login", locale));
  }

  redirect(
    withLocale(
      isOwnerUser(currentUser)
        ? "/owner"
        : currentUser.roles.role_name === "admin"
          ? "/dashboard"
          : "/technician/jobs",
      locale,
    ),
  );
}
