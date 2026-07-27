import assert from "node:assert/strict";
import test from "node:test";
import { resolveLogLevel, safeUrlDetails } from "../logger.js";
test("usa logs detalhados por padrão em development", () => {
    assert.equal(resolveLogLevel("development"), "debug");
});
test("mantém produção em info e silencia testes por padrão", () => {
    assert.equal(resolveLogLevel("production"), "info");
    assert.equal(resolveLogLevel("test"), "silent");
});
test("LOG_LEVEL explícito prevalece sobre o ambiente", () => {
    assert.equal(resolveLogLevel("development", "trace"), "trace");
    assert.equal(resolveLogLevel("production", "warn"), "warn");
});
test("registra somente nomes das query strings, sem seus valores", () => {
    assert.deepEqual(safeUrlDetails("/api/sites?token=segredo&start=2026-07-25&start=repetido"), {
        path: "/api/sites",
        queryKeys: ["token", "start"]
    });
});
