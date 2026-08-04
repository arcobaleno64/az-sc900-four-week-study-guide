import assert from "node:assert/strict";
import test from "node:test";
import { decodeRouteParam } from "../src/utils.ts";

test("路由參數解碼正常百分比編碼", () => {
  assert.equal(decodeRouteParam("AZ-900%20%E9%A1%8C%E5%BA%AB"), "AZ-900 題庫");
});

test("路由參數遇到畸形百分比編碼時安全回退", () => {
  assert.equal(decodeRouteParam("%"), "");
  assert.equal(decodeRouteParam("%E0%A4"), "");
});
