import test from "node:test";
import assert from "node:assert/strict";
import { analyticsWindow } from "./dates.js";

test("inclui todo o dia final usando limite exclusivo no dia seguinte", () => {
  const period = analyticsWindow("2026-07-01", "2026-07-03", "America/Sao_Paulo");
  assert.equal(period.startAt.toISOString(), "2026-07-01T03:00:00.000Z");
  assert.equal(period.endExclusive.toISOString(), "2026-07-04T03:00:00.000Z");
});

test("respeita a mudança de horário de verão do fuso", () => {
  const period = analyticsWindow("2026-03-07", "2026-03-08", "America/New_York");
  assert.equal(period.startAt.toISOString(), "2026-03-07T05:00:00.000Z");
  assert.equal(period.endExclusive.toISOString(), "2026-03-09T04:00:00.000Z");
});
