import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createCollectorCors, originMatchesDomains } from "../middleware/collector-cors.js";
const domains = ["example.com", "loja.example.com"];
test("autoriza o domínio cadastrado por HTTP ou HTTPS", () => {
    assert.equal(originMatchesDomains("http://example.com", domains), true);
    assert.equal(originMatchesDomains("https://example.com", domains), true);
});
test("autoriza subdomínios e ignora a porta da origem", () => {
    assert.equal(originMatchesDomains("http://app.example.com:5173", domains), true);
    assert.equal(originMatchesDomains("https://checkout.loja.example.com", domains), true);
    assert.equal(originMatchesDomains("https://example.com", ["http://example.com:8080"]), true);
});
test("rejeita domínios não cadastrados ou origens inválidas", () => {
    assert.equal(originMatchesDomains("https://example.com.evil.test", domains), false);
    assert.equal(originMatchesDomains("não-é-uma-origem", domains), false);
});
test("preflight usa a chave da URL e retorna a origem cadastrada", async () => {
    const app = express();
    app.use("/v1", createCollectorCors(async (siteKey) => (siteKey === "ak_valid" ? ["example.com"] : null), false));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/v1/replay-events?siteKey=ak_valid`, {
            method: "OPTIONS",
            headers: {
                origin: "http://app.example.com:5173",
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type",
                "access-control-request-private-network": "true",
                "access-control-request-local-network": "true"
            }
        });
        assert.equal(response.status, 204);
        assert.equal(response.headers.get("access-control-allow-origin"), "http://app.example.com:5173");
        assert.equal(response.headers.get("access-control-allow-credentials"), "true");
        assert.equal(response.headers.get("access-control-allow-methods"), "POST, OPTIONS");
        assert.equal(response.headers.get("access-control-allow-private-network"), "true");
        assert.equal(response.headers.get("access-control-allow-local-network"), "true");
    }
    finally {
        await new Promise((resolve) => server.close(() => resolve()));
    }
});
test("preflight rejeita chave ou domínio não correspondente", async () => {
    const app = express();
    app.use("/v1", createCollectorCors(async () => ["example.com"], false));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/v1/replay-events?siteKey=ak_other`, {
            method: "OPTIONS",
            headers: { origin: "https://evil.test", "access-control-request-method": "POST" }
        });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get("access-control-allow-origin"), null);
    }
    finally {
        await new Promise((resolve) => server.close(() => resolve()));
    }
});
