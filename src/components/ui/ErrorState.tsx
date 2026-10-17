import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function ErrorState({ title, detail, action }: { title: string; detail?: string; action: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-gold" />
      <h1 className="mt-4 font-display text-lg font-semibold">{title}</h1>
      {detail && <p className="mt-2 text-sm text-muted">{detail}</p>}
      <Link href="/" className="mt-6 inline-block rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-text">
        {action}
      </Link>
    </div>
  );
}
