import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { collectorPublicUrl, integrationScript, trackerFilePath } from "../tracker-assets.js";

test("localiza o tracker compilado em dist/public", () => {
  assert.match(trackerFilePath, /dist[\\/]public[\\/]tracker\.js$/);
  assert.equal(existsSync(trackerFilePath), true);
});

test("usa a URL pública configurada sem barra final", () => {
  const req = { protocol: "http", get: () => "localhost:4000" } as never;
  assert.equal(collectorPublicUrl(req, "https://analytics.example.com/"), "https://analytics.example.com");
});

test("infere a origem real da requisição quando API_PUBLIC_URL não foi configurada", () => {
  const req = { protocol: "https", get: () => "analytics.example.com" } as never;
  assert.equal(collectorPublicUrl(req), "https://analytics.example.com");
});

test("gera snippet com coleta e gravação habilitadas", () => {
  assert.equal(
    integrationScript("https://analytics.example.com", "ak_example"),
    '<script async src="https://analytics.example.com/tracker.js?v=3" data-site="ak_example" data-recording="on"></script>'
  );
});
