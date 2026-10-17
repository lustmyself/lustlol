import { ErrorState } from "@/components/ui/ErrorState";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { dict } = await getDictionary();
  return <ErrorState title="404" detail={dict.err_not_found} action={dict.back_home} />;
}
