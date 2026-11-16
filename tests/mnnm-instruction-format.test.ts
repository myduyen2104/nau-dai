import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeMnnmInstructionSteps } from "../src/services/mnnmCatalog.ts";

const recent = JSON.parse(await readFile(new URL("../public/data/mnnm/recent.json", import.meta.url), "utf8"));
const item = recent.recipes.find((recipe: { id: string }) => recipe.id === "monngonmoingay:suon-cong-nuong-rau-cu");
const detailShard = JSON.parse(await readFile(new URL("../public/data/mnnm/recipes-00.json", import.meta.url), "utf8"));
const detail = detailShard.find((recipe: { id: string }) => recipe.id === item.id);

test("MNMN finished-dish criteria stay together instead of rendering an empty step", () => {
  const steps = normalizeMnnmInstructionSteps(detail.instruction_sections);
  const result = steps.find(({ instruction }) => instruction.startsWith("Yêu cầu thành phẩm:"));

  assert.ok(result);
  assert.match(result.instruction, /Trạng thái:/);
  assert.match(result.instruction, /Màu sắc:/);
  assert.match(result.instruction, /Hương vị:/);
  assert.equal(steps.some(({ instruction }) => /^Yêu cầu thành phẩm:\s*$/u.test(instruction)), false);
});
