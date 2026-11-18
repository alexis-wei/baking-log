import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UnlockForm } from "@/components/forms";
import { isEditor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  if (await isEditor()) redirect("/");
  return (
    <>
      <header className="-mx-4 border-b border-black/10 px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center">
          <Link
            href="/"
            className="-ml-1 inline-flex items-center gap-1.5 p-1 text-sm text-black/60 hover:text-black"
          >
            <ArrowLeft size={16} strokeWidth={1.25} /> logs
          </Link>
        </div>
      </header>
      <UnlockForm />
    </>
  );
}
