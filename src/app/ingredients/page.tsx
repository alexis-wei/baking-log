import type { Metadata } from "next";
import { createBlankIngredient } from "@/app/actions";
import {
  BakingFooter,
  BakingHeader,
  CountLine,
} from "@/components/BakingHeader";
import { NewButton } from "@/components/forms";
import { IngredientLibrary } from "@/components/IngredientGrid";
import { isEditor } from "@/lib/auth";
import { listIngredients } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ingredients | baking" };

export default async function IngredientsPage() {
  const [ingredients, editor] = await Promise.all([
    listIngredients(),
    isEditor(),
  ]);
  return (
    <>
      <BakingHeader
        active="ingredients"
        action={
          editor && (
            <NewButton action={createBlankIngredient} label="ingredient" />
          )
        }
      />
      <CountLine
        count={ingredients.length}
        noun={["ingredient", "ingredients"]}
        editor={editor}
      />
      <IngredientLibrary ingredients={ingredients} />
      <BakingFooter editor={editor} />
    </>
  );
}
