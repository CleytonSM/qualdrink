import assert from "node:assert/strict";
import { test } from "node:test";

import { foldName } from "./fold";

test("fold com acento", () => {
  assert.equal(foldName("Limão"), "limao");
});

test("fold com espaço", () => {
  assert.equal(foldName("  Gin Tônica "), "gin tonica");
});

test("fold de Piña colada", () => {
  assert.equal(foldName("Piña colada"), "pina colada");
});

test("fold de Limonada suíça", () => {
  assert.equal(foldName("Limonada suíça"), "limonada suica");
});
