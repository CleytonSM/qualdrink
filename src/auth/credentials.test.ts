import assert from "node:assert/strict";
import { test } from "node:test";

import { EMAIL_INVALID, PASSWORD_TOO_SHORT, validateCredentials } from "./credentials";

test("senha curta é recusada antes da rede", () => {
  assert.equal(validateCredentials("pessoa@email.com", "123"), PASSWORD_TOO_SHORT);
});

test("e-mail sem arroba é recusado antes da rede", () => {
  assert.equal(validateCredentials("pessoa", "123456"), EMAIL_INVALID);
});

test("e-mail e senha válidos seguem para o Auth", () => {
  assert.equal(validateCredentials("  pessoa@email.com  ", "123456"), null);
});
