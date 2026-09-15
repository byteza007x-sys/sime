import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Save, UserRound } from "lucide-react";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeToggle from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth";
import { requireFeature } from "@/lib/features";
import { getLocale, type Locale, type RouteSearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { updateCustomerAction } from "../../actions";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    back: "Customers",
    title: "Edit customer",
    subtitle: "Update customer master data used in service reports.",
    customerSection: "Customer information",
    contactSection: "Contact and address",
    bpCode: "BP Code",
    companyName: "Customer name",
    taxId: "Tax ID",
    contactPerson: "Contact person",
    phone: "Phone",
    email: "Email",
    address: "Address",
    province: "Province",
    postalCode: "Postal code",
    save: "Save customer",
    required: "Required",
    hint: "These fields are stored in the customer database. A future SAP import may update matching BP Code records again.",
  },
  th: {
    back: "\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
    title: "\u0e41\u0e01\u0e49\u0e44\u0e02\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
    subtitle:
      "\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e43\u0e19\u0e43\u0e1a\u0e40\u0e0b\u0e2d\u0e23\u0e4c\u0e27\u0e34\u0e0b",
    customerSection: "\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
    contactSection: "\u0e1c\u0e39\u0e49\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d\u0e41\u0e25\u0e30\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48",
    bpCode: "BP Code",
    companyName: "\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
    taxId: "Tax ID",
    contactPerson: "\u0e1c\u0e39\u0e49\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d",
    phone: "\u0e42\u0e17\u0e23\u0e28\u0e31\u0e1e\u0e17\u0e4c",
    email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
    address: "\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48",
    province: "\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14",
    postalCode: "\u0e23\u0e2b\u0e31\u0e2a\u0e44\u0e1b\u0e23\u0e29\u0e13\u0e35\u0e22\u0e4c",
    save: "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
    required: "\u0e08\u0e33\u0e40\u0e1b\u0e47\u0e19",
    hint:
      "\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e35\u0e49\u0e08\u0e30\u0e16\u0e39\u0e01\u0e40\u0e01\u0e47\u0e1a\u0e43\u0e19\u0e10\u0e32\u0e19\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32 \u0e16\u0e49\u0e32\u0e19\u0e33\u0e40\u0e02\u0e49\u0e32 SAP \u0e23\u0e2d\u0e1a\u0e43\u0e2b\u0e21\u0e48 \u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 BP Code \u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19\u0e2d\u0e32\u0e08\u0e16\u0e39\u0e01\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07",
  },
} satisfies Record<Locale, Record<string, string>>;

interface EditCustomerPageProps {
  params: Promise<{
    customerId: string;
  }>;
  searchParams: RouteSearchParams;
}

export default async function EditCustomerPage({
  params,
  searchParams,
}: EditCustomerPageProps) {
  const [routeParams, queryParams] = await Promise.all([params, searchParams]);
  const locale = getLocale(queryParams.lang);
  const user = await requireUser(locale);
  await requireFeature({ key: "customers", user, locale });

  if (user.roles.role_name !== "admin") {
    redirect(withLocale("/technician/jobs", locale));
  }

  const customerId = Number(routeParams.customerId);
  if (!Number.isInteger(customerId)) {
    notFound();
  }

  const customer = await prisma.customers.findUnique({
    where: {
      customer_id: customerId,
    },
    select: {
      customer_id: true,
      sap_bp_code: true,
      company_name: true,
      tax_id: true,
      contact_person: true,
      phone: true,
      email: true,
      address: true,
      province: true,
      postal_code: true,
    },
  });

  if (!customer) {
    notFound();
  }

  const t = copy[locale];

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={withLocale("/customers", locale)}
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300"
              >
                <ArrowLeft size={16} />
                {t.back}
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Building2 size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">{t.title}</h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher
                locale={locale}
                pathname={`/customers/${customer.customer_id}/edit`}
              />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <form
          action={updateCustomerAction}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <input type="hidden" name="lang" value={locale} />
          <input type="hidden" name="customerId" value={customer.customer_id} />

          <section className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                <UserRound size={20} />
              </div>
              <div>
                <h2 className="text-base font-black">{t.customerSection}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t.hint}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={t.bpCode} name="sapBpCode" defaultValue={customer.sap_bp_code} />
              <Field
                label={t.companyName}
                name="companyName"
                defaultValue={customer.company_name}
                required
                requiredLabel={t.required}
              />
              <Field label={t.taxId} name="taxId" defaultValue={customer.tax_id} />
            </div>
          </section>

          <section className="p-5">
            <h2 className="text-base font-black">{t.contactSection}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label={t.contactPerson}
                name="contactPerson"
                defaultValue={customer.contact_person}
              />
              <Field label={t.phone} name="phone" defaultValue={customer.phone} />
              <Field label={t.email} name="email" defaultValue={customer.email} type="email" />
              <Field label={t.province} name="province" defaultValue={customer.province} />
              <Field
                label={t.postalCode}
                name="postalCode"
                defaultValue={customer.postal_code}
              />
              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t.address}
                </span>
                <textarea
                  name="address"
                  defaultValue={customer.address || ""}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:justify-end">
            <Link
              href={withLocale("/customers", locale)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t.back}
            </Link>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Save size={17} />
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required = false,
  requiredLabel,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  required?: boolean;
  requiredLabel?: string;
  type?: "email" | "text";
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
        {required && requiredLabel ? (
          <span className="text-xs font-bold text-rose-500">{requiredLabel}</span>
        ) : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue || ""}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
      />
    </label>
  );
}
