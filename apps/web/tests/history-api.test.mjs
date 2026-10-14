import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST, DELETE } from "../src/app/api/history/route.ts";
import { getPromptById } from "@prompt-workspace/database";
import crypto from "node:crypto";

test("API History Suite (node:test runner)", async (t) => {
  const testId = `test-mjs-${crypto.randomUUID()}`;
  const validPayload = {
    id: testId,
    originalPrompt: "Prompt uji coba untuk test suite ESM node:test",
    optimizedPrompt: "Prompt teroptimasi standar node:test dengan parameter lengkap",
    intentSummary: "Unit testing API History dengan native node test runner",
    score: 92,
  };

  await t.test("GET /api/history returns 200 OK and array data", async () => {
    const req = new Request("http://localhost:3000/api/history?limit=5", { method: "GET" });
    const res = await GET(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  await t.test("POST /api/history happy path creates record (201 Created)", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, testId);
    assert.equal(body.data.score, 92);

    const fromDb = await getPromptById(testId);
    assert.ok(fromDb);
    assert.equal(fromDb.originalPrompt, validPayload.originalPrompt);
  });

  await t.test("POST /api/history is idempotent on identical payload (200 OK)", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, testId);
  });

  await t.test("POST /api/history rejects duplicate ID with different payload (409 Conflict)", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        originalPrompt: "Prompt berbeda yang memicu konflik",
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /Conflict/i);
  });

  await t.test("POST /api/history rejects empty input with 400 Bad Request", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "   ",
        optimizedPrompt: "Valid",
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test("POST /api/history rejects malformed JSON with 400 Bad Request", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid_json_syntax: true ",
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test("POST /api/history rejects payload exceeding limit with 413", async () => {
    const hugePrompt = "A".repeat(300 * 1024);
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(hugePrompt.length),
      },
      body: JSON.stringify({
        originalPrompt: hugePrompt,
        optimizedPrompt: "Short",
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test("POST /api/history rejects out-of-range score with 400", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalPrompt: "Valid prompt",
        optimizedPrompt: "Valid prompt",
        score: 150,
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test("DELETE /api/history deletes existing record (200 OK)", async () => {
    const req = new Request(`http://localhost:3000/api/history?id=${testId}`, {
      method: "DELETE",
    });
    const res = await DELETE(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const recheck = await getPromptById(testId);
    assert.equal(recheck, null);
  });

  await t.test("DELETE /api/history returns 404 for non-existent ID", async () => {
    const req = new Request("http://localhost:3000/api/history?id=non-existent-id-99999", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test("Responses and logs do not leak raw secrets or stack traces", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ broken }",
    });
    const res = await POST(req);
    const body = await res.json();
    assert.equal(body.stack, undefined);
    assert.equal(body.stackTrace, undefined);
  });
});
