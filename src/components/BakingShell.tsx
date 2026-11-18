import { DoneEditingButton } from "@/components/forms";
import { isEditor } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** The page frame around every page, plus the pinned button while editing. */
export default async function BakingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const editor = await isEditor();
  return (
    <div className="min-h-dvh bg-white text-black">
      <div
        className={cn(
          "mx-auto max-w-2xl px-4",
          // Room for the pinned "done editing" button below the last item.
          editor
            ? "pb-[calc(env(safe-area-inset-bottom)+6rem)]"
            : "pb-[calc(env(safe-area-inset-bottom)+3rem)]",
        )}
      >
        {children}
      </div>
      {editor && <DoneEditingButton />}
    </div>
  );
}
