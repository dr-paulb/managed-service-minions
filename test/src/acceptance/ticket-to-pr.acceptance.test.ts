import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

interface RecipeParameter {
  key: string;
  requirement?: string;
}

interface Recipe {
  version: string;
  title: string;
  description?: string;
  parameters?: RecipeParameter[];
  instructions?: string;
}

function loadRecipe(name: string): Recipe {
  const filePath = path.join(process.cwd(), '..', 'commands', `${name}.yaml`);
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content) as Recipe;
}

function assertRecipeIsValid(recipe: Recipe): void {
  expect(recipe.version).toBeTruthy();
  expect(recipe.title).toBeTruthy();
  expect(recipe.instructions).toBeTruthy();
  expect(Array.isArray(recipe.parameters)).toBe(true);
  const requiredKeys = ['ticket', 'system', 'repo'];
  const keys = recipe.parameters?.map((p) => p.key) ?? [];
  for (const key of requiredKeys) {
    expect(keys).toContain(key);
  }
}

describe('ticket-to-pr acceptance', () => {
  it('has a valid recipe definition', () => {
    const recipe = loadRecipe('ticket-to-pr');
    assertRecipeIsValid(recipe);
  });

  it('mentions the approval gate in instructions', () => {
    const recipe = loadRecipe('ticket-to-pr');
    expect(recipe.instructions?.toLowerCase()).toContain('approval');
  });
});
