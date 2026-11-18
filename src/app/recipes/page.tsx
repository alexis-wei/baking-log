import type { Metadata } from "next";
import { createBlankRecipe } from "@/app/actions";
import {
  BakingFooter,
  BakingHeader,
  CountLine,
} from "@/components/BakingHeader";
import { NewButton } from "@/components/forms";
import { RecipeLibrary } from "@/components/RecipeList";
import { isEditor } from "@/lib/auth";
import { listRecipes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "recipes | baking" };

export default async function RecipesPage() {
  const [recipes, editor] = await Promise.all([listRecipes(), isEditor()]);
  return (
    <>
      <BakingHeader
        active="recipes"
        action={
          editor && <NewButton action={createBlankRecipe} label="recipe" />
        }
      />
      <CountLine
        count={recipes.length}
        noun={["recipe", "recipes"]}
        editor={editor}
      />
      <RecipeLibrary recipes={recipes} />
      <BakingFooter editor={editor} />
    </>
  );
}
