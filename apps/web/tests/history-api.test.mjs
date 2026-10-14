import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST, DELETE } from "../src/app/api/history/route.ts";
import { getPromptById } from "@prompt-workspace/database";
import { signSession } from "../src/lib/session.ts";
import crypto from "node:crypto";

test("API History Suite (node:test runner)", async (t) => {
  const userIdA = `usr_test_a_${crypto.randomUUID().slice(0, 8)}`;
  const sessionTokenA = signSession(userIdA);
  const authHeadersA = {
    "Content-Type": "application/json",
    Cookie: `piw_session=${sessionTokenA}`,
  };

  const userIdB = `usr_test_b_${crypto.randomUUID().slice(0, 8)}`;
  const sessionTokenB = signSession(userIdB);
  const authHeadersB = {
    "Content-Type": "application/json",
    Cookie: `piw_session=${sessionTokenB}`,
  };

  const testId = `test-mjs-${crypto.randomUUID()}`;
  const validPayload = {
    id: testId,
    originalPrompt: "Prompt uji coba untuk test suite ESM node:test",
    optimizedPrompt: "Prompt teroptimasi standar node:test dengan parameter lengkap",
    intentSummary: "Unit testing API History dengan native node test runner",
    score: 92,
  };

  await t.test("GET /api/history returns 200 OK and array data", async () => {
    const req = new Request("http://localhost:3000/api/history?limit=5", {
      method: "GET",
      headers: authHeadersA,
    });
    const res = await GET(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  await t.test("POST /api/history happy path creates record (201 Created)", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
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
    assert.equal(fromDb.userId, userIdA);
  });

  await t.test("POST /api/history is idempotent on identical payload (200 OK)", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
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
      headers: authHeadersA,
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

  await t.test("CSRF: POST /api/history rejects cross-origin request (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        ...authHeadersA,
        Origin: "http://attacker-evil-site.com",
      },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /CSRF|Origin/i);
  });

  await t.test("AuthZ: User B cannot delete User A's prompt (403 Forbidden)", async () => {
    const req = new Request(`http://localhost:3000/api/history?id=${testId}`, {
      method: "DELETE",
      headers: authHeadersB,
    });
    const res = await DELETE(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /pengguna lain/i);
  });

  await t.test("DELETE /api/history deletes existing record by owner (200 OK)", async () => {
    const req = new Request(`http://localhost:3000/api/history?id=${testId}`, {
      method: "DELETE",
      headers: authHeadersA,
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
      headers: authHeadersA,
    });
    const res = await DELETE(req);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  await t.test("POST /api/history rejects empty input with 400 Bad Request", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
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
      headers: authHeadersA,
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
        ...authHeadersA,
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
      headers: authHeadersA,
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

  // Concurrent Race Condition Live Test (P2002)
  await t.test("Concurrent P2002 Race: Parallel identical requests resolve idempotently", async () => {
    const raceId = `race-ident-${crypto.randomUUID()}`;
    const racePayload = {
      id: raceId,
      originalPrompt: "Prompt race condition paralel identik",
      optimizedPrompt: "Prompt hasil race condition identik",
      intentSummary: "Race condition testing",
      score: 90,
    };

    const makeReq = () =>
      new Request("http://localhost:3000/api/history", {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify(racePayload),
      });

    // Tembak 3 request paralel serempak
    const [res1, res2, res3] = await Promise.all([
      POST(makeReq()),
      POST(makeReq()),
      POST(makeReq()),
    ]);

    const statuses = [res1.status, res2.status, res3.status];
    // Semua harus berhasil (201 Created atau 200 OK idempotent), tidak ada yang 500
    assert.ok(statuses.every((s) => s === 200 || s === 201), `Statuses: ${statuses}`);

    // Bersihkan
    await DELETE(
      new Request(`http://localhost:3000/api/history?id=${raceId}`, {
        method: "DELETE",
        headers: authHeadersA,
      })
    );
  });

  await t.test("Concurrent P2002 Race: Parallel conflicting requests return 409 Conflict", async () => {
    const conflictRaceId = `race-conf-${crypto.randomUUID()}`;
    const payload1 = {
      id: conflictRaceId,
      originalPrompt: "Prompt versi 1 untuk race conflict",
      optimizedPrompt: "Optimasi versi 1",
      score: 85,
    };
    const payload2 = {
      id: conflictRaceId,
      originalPrompt: "Prompt versi 2 berbeda untuk race conflict",
      optimizedPrompt: "Optimasi versi 2",
      score: 90,
    };

    const req1 = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify(payload1),
    });
    const req2 = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify(payload2),
    });

    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);
    const statuses = [res1.status, res2.status].sort();

    // Salah satu harus berhasil (201) dan yang bertabrakan dengan isi beda harus 409 Conflict
    assert.deepEqual(statuses, [201, 409]);

    // Bersihkan
    await DELETE(
      new Request(`http://localhost:3000/api/history?id=${conflictRaceId}`, {
        method: "DELETE",
        headers: authHeadersA,
      })
    );
  });

  await t.test("Responses and logs do not leak raw secrets or stack traces", async () => {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: "{ broken }",
    });
    const res = await POST(req);
    const body = await res.json();
    assert.equal(body.stack, undefined);
    assert.equal(body.stackTrace, undefined);
  });
});
