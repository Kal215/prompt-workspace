/**
 * apps/web/scripts/test-api.ts
 * Suite Uji Regresi API Komprehensif (Task #19: Security, Auth, Rate Limit, CSRF, Concurrency)
 * 
 * Menguji langsung handler Next.js API (GET, POST, DELETE) terhadap database SQLite terisolasi.
 */

import { GET, POST, DELETE } from "../src/app/api/history/route";
import { GET as GET_PROVIDERS } from "../src/app/api/providers/route";
import { POST as POST_EXECUTE } from "../src/app/api/execute/route";
import { POST as POST_CRAWL, GET as GET_CRAWL } from "../src/app/api/crawl/route";
import { POST as POST_SPIDER, GET as GET_SPIDER } from "../src/app/api/spider/route";
import {
  getPromptById,
  savePrompt,
  createPromptVersion,
  prisma,
  setDatabaseUrl,
} from "@prompt-workspace/database";
import { signSession } from "../src/lib/session";
import {
  InMemorySlidingWindowLimiter,
  getCrawlRateLimiter,
  getSpiderRateLimiter,
} from "../src/lib/rate-limiter";
import crypto from "crypto";
import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    results.push({ name, passed: true, details });
  } else {
    console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
    results.push({ name, passed: false, details });
  }
}

async function runApiRegressionSuite() {
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🧪 MENJALANKAN API REGRESSION TEST SUITE (Task #19 Security & Regression)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  // 0. Setup isolated temporary SQLite database
  const tempDbName = `test-api-reg-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const tempDbPath = path.join(os.tmpdir(), tempDbName).replace(/\\/g, "/");
  const tempDbUrl = `file:${tempDbPath}`;
  const schemaPath = path.resolve(__dirname, "../../../packages/database/prisma/schema.prisma");

  console.log(`[0] Menginisialisasi database SQLite sementara terisolasi: ${tempDbPath}`);
  execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
    env: { ...process.env, DATABASE_URL: tempDbUrl },
    stdio: "ignore",
  });
  setDatabaseUrl(tempDbUrl);

  try {
  const userIdA = `usr_test_a_${crypto.randomUUID().slice(0, 8)}`;
  const sessionTokenA = signSession(userIdA);
  const authHeadersA = {
    "Content-Type": "application/json",
    Origin: "http://localhost:3000",
    Cookie: `piw_session=${sessionTokenA}`,
  };

  const userIdB = `usr_test_b_${crypto.randomUUID().slice(0, 8)}`;
  const sessionTokenB = signSession(userIdB);
  const authHeadersB = {
    "Content-Type": "application/json",
    Origin: "http://localhost:3000",
    Cookie: `piw_session=${sessionTokenB}`,
  };

  const testId = `test-api-${crypto.randomUUID()}`;
  const validPayload = {
    id: testId,
    originalPrompt: "Prompt uji coba untuk validasi regresi sistem database Task 19.",
    optimizedPrompt: "Prompt teroptimasi berstandar industri dengan batasan ketat dan panduan jelas.",
    intentSummary: "Validasi fungsionalitas API History Task 19",
    score: 95,
  };

  // 1. Test GET /api/history
  console.log("▶ [Test 1] GET /api/history (Initial fetch)");
  try {
    const req = new Request("http://localhost:3000/api/history?limit=10", {
      method: "GET",
      headers: authHeadersA,
    });
    const res = await GET(req);
    const json = await res.json();
    assert(res.status === 200, "HTTP Status 200 OK");
    assert(json.success === true, "Response JSON success: true");
    assert(Array.isArray(json.data), "Response data berupa array riwayat");
  } catch (err: unknown) {
    assert(false, "GET /api/history", String(err));
  }

  // 2. Test POST /api/history (Happy path)
  console.log("\n▶ [Test 2] POST /api/history (Simpan Prompt Baru oleh User A)");
  try {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 201, "HTTP Status 201 Created");
    assert(json.success === true, "Response JSON success: true");
    assert(json.data?.id === testId, "Prompt tersimpan dengan ID yang sesuai");
    assert(json.data?.score === 95, "Score tersimpan sesuai nilai input (95)");
  } catch (err: unknown) {
    assert(false, "POST /api/history valid", String(err));
  }

  // 3. Test Save Dua Kali (Idempotent Request)
  console.log("\n▶ [Test 3] POST /api/history (Save Dua Kali / Idempotent Replay)");
  try {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 200, "HTTP Status 200 OK (Idempotent replay)");
    assert(json.success === true, "Response success: true");
    assert(
      typeof json.message === "string" && json.message.includes("idempotent"),
      "Pesan konfirmasi idempotensi dikembalikan"
    );
    assert(json.data?.id === testId, "Mengembalikan data yang sama tanpa duplikasi");
  } catch (err: unknown) {
    assert(false, "Save dua kali idempotent", String(err));
  }

  // 4. Test Duplicate ID dengan Payload Berbeda (Conflict 409)
  console.log("\n▶ [Test 4] POST /api/history (Duplicate ID dengan Payload Berbeda -> 409)");
  try {
    const conflictingPayload = {
      ...validPayload,
      originalPrompt: "Prompt yang berbeda dari data asli yang tersimpan.",
    };
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify(conflictingPayload),
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 409, "HTTP Status 409 Conflict");
    assert(json.success === false, "Response success: false");
    assert(
      typeof json.error === "string" && json.error.includes("Conflict"),
      "Error menyebutkan konflik ID prompt duplikat"
    );
  } catch (err: unknown) {
    assert(false, "Duplicate ID conflict", String(err));
  }

  // 5. Test AuthZ Lintas Pengguna (IDOR Prevention: User B mencoba menghapus prompt User A -> 403)
  console.log("\n▶ [Test 5] AuthZ: User B mencoba menghapus prompt User A (IDOR Prevention -> 403)");
  try {
    const reqForbidden = new Request(`http://localhost:3000/api/history?id=${testId}`, {
      method: "DELETE",
      headers: authHeadersB,
    });
    const resForbidden = await DELETE(reqForbidden);
    const jsonForbidden = await resForbidden.json();
    assert(resForbidden.status === 403, "Akses hapus lintas pengguna ditolak dengan HTTP 403 Forbidden");
    assert(jsonForbidden.success === false, "Response success: false");
    assert(
      typeof jsonForbidden.error === "string" && jsonForbidden.error.includes("pengguna lain"),
      "Pesan error spesifik melarang akses prompt milik pengguna lain"
    );
  } catch (err: unknown) {
    assert(false, "AuthZ lintas user test", String(err));
  }

  // 6. Test CSRF Protection (Origin lintas situs tidak diizinkan -> 403)
  console.log("\n▶ [Test 6] CSRF Protection: Request dengan Origin tidak diizinkan (Cross-Site -> 403)");
  try {
    const reqCsrf = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        ...authHeadersA,
        Origin: "http://malicious-cross-origin.com",
      },
      body: JSON.stringify(validPayload),
    });
    const resCsrf = await POST(reqCsrf);
    const jsonCsrf = await resCsrf.json();
    assert(resCsrf.status === 403, "Request cross-origin ditolak dengan HTTP 403 Forbidden");
    assert(jsonCsrf.success === false, "Response success: false");
    assert(
      typeof jsonCsrf.error === "string" &&
        (jsonCsrf.error.toLowerCase().includes("csrf") ||
          jsonCsrf.error.toLowerCase().includes("origin") ||
          jsonCsrf.error.toLowerCase().includes("tidak diizinkan")),
      "Pesan error spesifik terkait CSRF / Origin tidak diizinkan"
    );
  } catch (err: unknown) {
    assert(false, "CSRF test", String(err));
  }

  // 7. Test Rate Limiter (HTTP 429 & Retry-After)
  console.log("\n▶ [Test 7] Rate Limiting: Verifikasi modul Rate Limiter menghasilkan HTTP 429 & Retry-After");
  try {
    const testLimiter = new InMemorySlidingWindowLimiter(3, 60);

    const key = "test-client-ip";
    const r1 = testLimiter.check(key);
    const r2 = testLimiter.check(key);
    const r3 = testLimiter.check(key);
    const r4 = testLimiter.check(key); // melebihi batas

    assert(r1.allowed === true && r2.allowed === true && r3.allowed === true, "Request 1-3 dalam kuota diizinkan");
    assert(r4.allowed === false, "Request ke-4 melebihi kuota dan ditolak (allowed: false)");
    assert(r4.retryAfter > 0, "Retry-After berisi nilai detik tunggu valid (> 0)");
  } catch (err: unknown) {
    assert(false, "Rate Limiting test", String(err));
  }

  // 8. Test Live Concurrent Race Condition (P2002)
  console.log("\n▶ [Test 8] Concurrency P2002: Live Concurrent Race Condition Test");
  try {
    // 8a. Parallel identical requests -> idempotent 200/201 (zero 500)
    const raceIdenticalId = `race-api-ident-${crypto.randomUUID()}`;
    const raceIdentPayload = {
      id: raceIdenticalId,
      originalPrompt: "Prompt konkurensi paralel identik P2002",
      optimizedPrompt: "Prompt optimasi hasil uji balapan identik",
      intentSummary: "Uji konkurensi P2002 identik",
      score: 88,
    };

    const makeIdentReq = () =>
      new Request("http://localhost:3000/api/history", {
        method: "POST",
        headers: authHeadersA,
        body: JSON.stringify(raceIdentPayload),
      });

    const [raceRes1, raceRes2, raceRes3] = await Promise.all([
      POST(makeIdentReq()),
      POST(makeIdentReq()),
      POST(makeIdentReq()),
    ]);

    const identStatuses = [raceRes1.status, raceRes2.status, raceRes3.status];
    assert(
      identStatuses.every((s) => s === 200 || s === 201),
      "Semua request paralel identik sukses konsisten (200/201) tanpa error 500"
    );

    // Bersihkan
    await DELETE(
      new Request(`http://localhost:3000/api/history?id=${raceIdenticalId}`, {
        method: "DELETE",
        headers: authHeadersA,
      })
    );

    // 8b. Parallel conflicting requests -> 201 + 409
    const raceConflictId = `race-api-conf-${crypto.randomUUID()}`;
    const reqConf1 = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({
        id: raceConflictId,
        originalPrompt: "Prompt varian A untuk konflik paralel",
        optimizedPrompt: "Optimasi varian A",
        score: 80,
      }),
    });
    const reqConf2 = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({
        id: raceConflictId,
        originalPrompt: "Prompt varian B untuk konflik paralel",
        optimizedPrompt: "Optimasi varian B",
        score: 85,
      }),
    });

    const [confRes1, confRes2] = await Promise.all([POST(reqConf1), POST(reqConf2)]);
    const confStatuses = [confRes1.status, confRes2.status].sort();
    assert(
      confStatuses[0] === 201 && confStatuses[1] === 409,
      "Salah satu berhasil (201) dan request bertabrakan dengan isi beda ditolak dengan HTTP 409 Conflict"
    );

    // Bersihkan
    await DELETE(
      new Request(`http://localhost:3000/api/history?id=${raceConflictId}`, {
        method: "DELETE",
        headers: authHeadersA,
      })
    );
  } catch (err: unknown) {
    assert(false, "Concurrency race test", String(err));
  }

  // 9. Test Input Kosong & Whitespace
  console.log("\n▶ [Test 9] POST /api/history (Input Kosong & Whitespace)");
  try {
    const reqEmptyOriginal = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({ ...validPayload, id: "test-empty-1", originalPrompt: "   " }),
    });
    const resEmptyOriginal = await POST(reqEmptyOriginal);
    assert(resEmptyOriginal.status === 400, "originalPrompt kosong ditolak dengan HTTP 400");
  } catch (err: unknown) {
    assert(false, "Input kosong test", String(err));
  }

  // 10. Test Malformed JSON
  console.log("\n▶ [Test 10] POST /api/history (Malformed JSON Body)");
  try {
    const reqMalformed = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: "{\"broken_json\": true,",
    });
    const resMalformed = await POST(reqMalformed);
    assert(resMalformed.status === 400, "Malformed JSON ditolak dengan HTTP 400");
  } catch (err: unknown) {
    assert(false, "Malformed JSON test", String(err));
  }

  // 11. Test Payload Terlalu Besar (413 Payload Too Large)
  console.log("\n▶ [Test 11] POST /api/history (Stream Body Limit 256 KB -> 413)");
  try {
    const hugePrompt = "A".repeat(300 * 1024);
    const reqHuge = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        ...authHeadersA,
        "Content-Length": String(hugePrompt.length),
      },
      body: JSON.stringify({
        ...validPayload,
        id: "test-huge",
        originalPrompt: hugePrompt,
      }),
    });
    const resHuge = await POST(reqHuge);
    assert(resHuge.status === 413, "Body > 256 KB ditolak dengan HTTP 413 Payload Too Large");
  } catch (err: unknown) {
    assert(false, "Payload size test", String(err));
  }

  // 12. Test Score di Luar Rentang
  console.log("\n▶ [Test 12] POST /api/history (Score di Luar Rentang 0-100)");
  try {
    const reqScoreHigh = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({ ...validPayload, id: "test-score-1", score: 150 }),
    });
    const resScoreHigh = await POST(reqScoreHigh);
    assert(resScoreHigh.status === 400, "Score 150 ditolak dengan HTTP 400");
  } catch (err: unknown) {
    assert(false, "Score range test", String(err));
  }

  // 13. Test Delete ID Tidak Ditemukan (404)
  console.log("\n▶ [Test 13] DELETE /api/history (ID Tidak Ditemukan -> 404)");
  try {
    const reqNotFound = new Request(
      "http://localhost:3000/api/history?id=non-existent-uuid-999999",
      { method: "DELETE", headers: authHeadersA }
    );
    const resNotFound = await DELETE(reqNotFound);
    assert(resNotFound.status === 404, "Delete ID tidak ditemukan mengembalikan HTTP 404");
  } catch (err: unknown) {
    assert(false, "Delete not found test", String(err));
  }

  // 14. Test Delete Sukses oleh Pemilik Sah (User A)
  console.log("\n▶ [Test 14] DELETE /api/history (Delete Sukses oleh Pemilik Sah)");
  try {
    const reqDelete = new Request(
      `http://localhost:3000/api/history?id=${encodeURIComponent(testId)}`,
      { method: "DELETE", headers: authHeadersA }
    );
    const resDelete = await DELETE(reqDelete);
    const jsonDelete = await resDelete.json();
    assert(resDelete.status === 200, "Delete mengembalikan HTTP 200 OK");
    assert(jsonDelete.success === true, "Response success: true");

    const checkDb = await getPromptById(testId);
    assert(checkDb === null, "Konfirmasi record terhapus permanen dari SQLite");
  } catch (err: unknown) {
    assert(false, "Delete success test", String(err));
  }

  // 15. Test Sanitasi Error
  console.log("\n▶ [Test 15] Sanitasi Error Logging & Response");
  try {
    const reqBad = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: authHeadersA,
      body: "invalid",
    });
    const resBad = await POST(reqBad);
    const jsonBad = await resBad.json();
    assert(jsonBad.stack === undefined, "Response body TIDAK mengekspos properti 'stack'");
    assert(jsonBad.stackTrace === undefined, "Response body TIDAK mengekspos properti 'stackTrace'");
    assert(
      !JSON.stringify(jsonBad).includes("gsk_") &&
      !JSON.stringify(jsonBad).includes("DATABASE_URL"),
      "Response body bersih dari API key dan env secrets"
    );
  } catch (err: unknown) {
    assert(false, "Sanitasi error test", String(err));
  }

  // 16. Test CSRF Fail-Closed (Missing Origin & Referer -> 403 Forbidden)
  console.log("\n▶ [Test 16] CSRF Fail-Closed: Request tanpa Origin & Referer ditolak 403");
  try {
    const reqNoOrigin = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `piw_session=${sessionTokenA}`,
      },
      body: JSON.stringify(validPayload),
    });
    const resNoOrigin = await POST(reqNoOrigin);
    assert(resNoOrigin.status === 403, "Request tanpa Origin/Referer ditolak dengan HTTP 403 Forbidden");
  } catch (err: unknown) {
    assert(false, "CSRF fail-closed test", String(err));
  }

  // 17. Test DELETE Tanpa Sesi (401 Unauthorized)
  console.log("\n▶ [Test 17] Session: DELETE /api/history tanpa sesi ditolak 401");
  try {
    const reqNoSession = new Request("http://localhost:3000/api/history?id=some-id", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
    });
    const resNoSession = await DELETE(reqNoSession);
    assert(resNoSession.status === 401, "DELETE tanpa sesi mengembalikan HTTP 401 Unauthorized");
  } catch (err: unknown) {
    assert(false, "DELETE tanpa sesi test", String(err));
  }

  // 18. Test DELETE dengan Sesi Tampered (401 Unauthorized)
  console.log("\n▶ [Test 18] Session: DELETE /api/history dengan token palsu ditolak 401");
  try {
    const reqTampered = new Request("http://localhost:3000/api/history?id=some-id", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: "piw_session=fake_user:12345:invalid_signature",
      },
    });
    const resTampered = await DELETE(reqTampered);
    assert(resTampered.status === 401, "DELETE dengan cookie palsu mengembalikan HTTP 401 Unauthorized");
  } catch (err: unknown) {
    assert(false, "DELETE sesi palsu test", String(err));
  }

  // 19. Test POST dengan Sesi Tampered (401 Unauthorized)
  console.log("\n▶ [Test 19] Session: POST /api/history dengan token palsu ditolak 401");
  try {
    const reqPostTampered = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: "piw_session=forged_token",
      },
      body: JSON.stringify(validPayload),
    });
    const resPostTampered = await POST(reqPostTampered);
    assert(resPostTampered.status === 401, "POST dengan cookie palsu mengembalikan HTTP 401 Unauthorized");
  } catch (err: unknown) {
    assert(false, "POST sesi palsu test", String(err));
  }

  // 20. Test POST Sesi Baru Menerbitkan Set-Cookie
  console.log("\n▶ [Test 20] Session: POST /api/history tanpa sesi menerbitkan Set-Cookie");
  try {
    const reqNewSession = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        originalPrompt: "Prompt dari sesi baru tanpa cookie sebelumnya",
        optimizedPrompt: "Prompt teroptimasi otomatis dengan header sesi",
        score: 89,
      }),
    });
    const resNewSession = await POST(reqNewSession);
    assert(resNewSession.status === 201, "POST baru mengembalikan HTTP 201");
    const setCookie = resNewSession.headers.get("Set-Cookie");
    assert(Boolean(setCookie && setCookie.includes("piw_session=")), "Header Set-Cookie piw_session berhasil diterbitkan");
  } catch (err: unknown) {
    assert(false, "Set-Cookie generation test", String(err));
  }

  // 21. Test Proteksi Legacy Record (legacy_default_user tidak bisa dihapus user biasa)
  console.log("\n▶ [Test 21] AuthZ: Proteksi data legacy (legacy_default_user) dari penghapusan user biasa");
  try {
    const legacyPrompt = await savePrompt({
      userId: "legacy_default_user",
      originalPrompt: "Prompt legacy historis",
      optimizedPrompt: "Prompt optimasi legacy",
      score: 91,
    });
    const reqDelLegacy = new Request(`http://localhost:3000/api/history?id=${legacyPrompt.id}`, {
      method: "DELETE",
      headers: authHeadersA,
    });
    const resDelLegacy = await DELETE(reqDelLegacy);
    assert(resDelLegacy.status === 403, "Penghapusan prompt legacy oleh user biasa ditolak dengan HTTP 403 Forbidden");

    const checkLegacy = await getPromptById(legacyPrompt.id);
    assert(checkLegacy !== null, "Record legacy tetap aman dan utuh di database");
  } catch (err: unknown) {
    assert(false, "Legacy protection test", String(err));
  }

  // 22. Test GET /api/providers (Multi-Provider Capabilities & Zero-Secret Leakage)
  console.log("\n▶ [Test 22] GET /api/providers (Kapabilitas Provider & Proteksi Rahasia)");
  try {
    const resProviders = await GET_PROVIDERS();
    assert(resProviders.status === 200, "GET /api/providers mengembalikan HTTP 200 OK");
    const jsonProviders = await resProviders.json();
    assert(jsonProviders.success === true, "Response JSON success: true");
    assert(Array.isArray(jsonProviders.providers), "Response providers berupa array");
    assert(jsonProviders.providers.length === 4, "Mengembalikan tepat 4 provider (groq, gemini, openrouter, ollama)");

    const providerIds = jsonProviders.providers.map((p: { providerId: string }) => p.providerId).sort();
    assert(
      JSON.stringify(providerIds) === JSON.stringify(["gemini", "groq", "ollama", "openrouter"]),
      "Provider IDs sesuai: gemini, groq, ollama, openrouter"
    );

    // Verifikasi Zero Secret Leakage pada JSON response
    const rawJsonStr = JSON.stringify(jsonProviders);
    const hasGskLeak = /gsk_[a-zA-Z0-9_-]{10,}/.test(rawJsonStr);
    const hasAizaLeak = /AIza[a-zA-Z0-9_-]{20,}/.test(rawJsonStr);
    const hasSkOrLeak = /sk-or-v1-[a-zA-Z0-9_-]{10,}/.test(rawJsonStr);
    assert(!hasGskLeak && !hasAizaLeak && !hasSkOrLeak, "Response JSON 100% bebas dari kebocoran string API key");
  } catch (err: unknown) {
    assert(false, "GET /api/providers test", String(err));
  }

  // 23. Test POST /api/execute (Target Model Execution Playground API)
  console.log("\n▶ [Test 23] POST /api/execute (CSRF Protection, Schema Validation & Safe Execution)");
  try {
    // 23.1 CSRF Fail-Closed: Request tanpa Origin / Referer harus ditolak HTTP 403
    const reqNoOrigin = new Request("http://localhost:3000/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Test prompt" }),
    });
    const resNoOrigin = await POST_EXECUTE(reqNoOrigin);
    assert(resNoOrigin.status === 403, "CSRF: Request /api/execute tanpa Origin/Referer ditolak HTTP 403");

    // 23.2 CSRF Valid Origin, Payload Kosong / Invalid -> HTTP 400
    const reqInvalid = new Request("http://localhost:3000/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ prompt: "" }),
    });
    const resInvalid = await POST_EXECUTE(reqInvalid);
    assert(resInvalid.status === 400, "Validasi: Payload dengan prompt kosong ditolak HTTP 400");
    const jsonInvalid = await resInvalid.json();
    assert(jsonInvalid.success === false, "Response penolakan memuat success: false");

    // 23.3 Eksekusi Terstruktur atau Penanganan Error Ramah
    const reqExecute = new Request("http://localhost:3000/api/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        prompt: "Halo model, katakan 'SIAP' dalam satu kata.",
        placeholderValues: {},
        providerId: "groq",
        parameters: { temperature: 0.1, maxOutputTokens: 64 },
      }),
    });
    const resExecute = await POST_EXECUTE(reqExecute);
    assert(
      [200, 429, 503, 504].includes(resExecute.status),
      `POST /api/execute mengembalikan status valid [200/429/503/504] (diterima: ${resExecute.status})`
    );
    const jsonExecute = await resExecute.json();
    if (resExecute.status === 200) {
      assert(jsonExecute.success === true, "Eksekusi berhasil dengan success: true");
      assert(typeof jsonExecute.data?.output === "string", "Response memuat output teks model");
      assert(typeof jsonExecute.data?.resolvedPrompt === "string", "Response memuat resolvedPrompt");
    } else {
      assert(jsonExecute.success === false, "Error response memuat success: false");
      assert(typeof jsonExecute.error === "string", "Error response memuat pesan ramah pengguna");
      assert(!JSON.stringify(jsonExecute).includes("stack"), "Error response tidak membocorkan stack trace");
    }
  } catch (err: unknown) {
    assert(false, "POST /api/execute test", String(err));
  }

  // 24. Test POST & GET /api/crawl (Web Crawler & Grounding Facts API)
  console.log("\n▶ [Test 24] /api/crawl (CSRF, Session, SSRF/Allowlist Rejection, Extraction, & Anti-IDOR)");
  try {
    // 24.1 CSRF Fail-Closed: POST /api/crawl tanpa Origin / Referer ditolak 403
    const reqCrawlNoOrigin = new Request("http://localhost:3000/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: "https://raw.githubusercontent.com/owner/repo/main/prompt.md" }),
    });
    const resCrawlNoOrigin = await POST_CRAWL(reqCrawlNoOrigin);
    assert(resCrawlNoOrigin.status === 403, "CSRF: Request /api/crawl tanpa Origin/Referer ditolak HTTP 403");

    // 24.2 Session: Token sesi palsu ditolak 401
    const reqCrawlFakeSession = new Request("http://localhost:3000/api/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: "piw_session=fake.signature.token",
      },
      body: JSON.stringify({ targetUrl: "https://raw.githubusercontent.com/owner/repo/main/prompt.md" }),
    });
    const resCrawlFakeSession = await POST_CRAWL(reqCrawlFakeSession);
    assert(resCrawlFakeSession.status === 401, "Session: Request /api/crawl dengan token palsu ditolak HTTP 401");

    // 24.3 SSRF & Allowlist: URL HTTP biasa ditolak 422
    const reqCrawlHttp = new Request("http://localhost:3000/api/crawl", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({ targetUrl: "http://raw.githubusercontent.com/repo/file.txt" }),
    });
    const resCrawlHttp = await POST_CRAWL(reqCrawlHttp);
    assert(resCrawlHttp.status === 422, "SSRF: URL non-HTTPS ditolak HTTP 422");

    // 24.4 SSRF & Allowlist: URL di luar allowlist ditolak 422
    const reqCrawlDisallowed = new Request("http://localhost:3000/api/crawl", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({ targetUrl: "https://malicious-external-site.com/evil.txt" }),
    });
    const resCrawlDisallowed = await POST_CRAWL(reqCrawlDisallowed);
    assert(resCrawlDisallowed.status === 422, "SSRF: Host di luar allowlist P0 ditolak HTTP 422");

    // 24.5 Eksekusi Berhasil (Happy Path) POST /api/crawl
    const reqCrawlHappy = new Request("http://localhost:3000/api/crawl", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({
        targetUrl: "https://raw.githubusercontent.com/test-org/test-repo/main/PROMPT.md",
        mode: "EXTRACT_GROUNDING_CONTEXT",
        sourceType: "GITHUB_RAW_FILE",
      }),
    });
    const resCrawlHappy = await POST_CRAWL(reqCrawlHappy);
    assert(resCrawlHappy.status === 201, "POST /api/crawl mengembalikan status HTTP 201 Created");
    const jsonCrawl = await resCrawlHappy.json();
    assert(jsonCrawl.success === true, "POST /api/crawl memuat success: true");
    assert(Array.isArray(jsonCrawl.data?.items), "POST /api/crawl mengembalikan array items");
    assert(typeof jsonCrawl.data?.crawlerSourceId === "string", "POST /api/crawl mengembalikan crawlerSourceId");

    const createdCrawlSourceId = jsonCrawl.data.crawlerSourceId;

    // 24.6 Anti-IDOR pada GET /api/crawl:
    // Buat SavedPrompt untuk User A dan kaitkan dengan CrawlerSource ini
    // Reset rate limiter crawl agar tidak terhambat kuota saat uji anti-IDOR
    getCrawlRateLimiter().reset();

    // User B mencoba mengakses dokumen crawler milik User A -> HTTP 403
    const reqGetCrawlUserB = new Request(`http://localhost:3000/api/crawl?id=${createdCrawlSourceId}`, {
      method: "GET",
      headers: authHeadersB,
    });
    const resGetCrawlUserB = await GET_CRAWL(reqGetCrawlUserB);
    assert(resGetCrawlUserB.status === 403, "Anti-IDOR: User B mengakses CrawlerSource milik User A ditolak HTTP 403");

    // User A mengakses dokumen miliknya sendiri -> HTTP 200
    const reqGetCrawlUserA = new Request(`http://localhost:3000/api/crawl?id=${createdCrawlSourceId}`, {
      method: "GET",
      headers: authHeadersA,
    });
    const resGetCrawlUserA = await GET_CRAWL(reqGetCrawlUserA);
    assert(resGetCrawlUserA.status === 200, "User A berhasil mengakses CrawlerSource miliknya sendiri (HTTP 200)");
  } catch (err: unknown) {
    assert(false, "/api/crawl suite test", String(err));
  }

  // 25. Test POST & GET /api/spider (Prompt Spider Matrix & Adversarial Benchmark API)
  console.log("\n▶ [Test 25] /api/spider (CSRF, Session, Validation, 5 Categories Execution, & Anti-IDOR)");
  try {
    // 25.1 CSRF Fail-Closed: POST /api/spider tanpa Origin / Referer ditolak 403
    const reqSpiderNoOrigin = new Request("http://localhost:3000/api/spider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptContent: "Test prompt content" }),
    });
    const resSpiderNoOrigin = await POST_SPIDER(reqSpiderNoOrigin);
    assert(resSpiderNoOrigin.status === 403, "CSRF: Request /api/spider tanpa Origin/Referer ditolak HTTP 403");

    // 25.2 Session: Token sesi palsu ditolak 401
    const reqSpiderFakeSession = new Request("http://localhost:3000/api/spider", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: "piw_session=fake.signature.token",
      },
      body: JSON.stringify({ promptContent: "Test prompt content" }),
    });
    const resSpiderFakeSession = await POST_SPIDER(reqSpiderFakeSession);
    assert(resSpiderFakeSession.status === 401, "Session: Request /api/spider dengan token palsu ditolak HTTP 401");

    // 25.3 Validasi: Body kosong ditolak 400
    const reqSpiderEmpty = new Request("http://localhost:3000/api/spider", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({}),
    });
    const resSpiderEmpty = await POST_SPIDER(reqSpiderEmpty);
    assert(resSpiderEmpty.status === 400, "Validasi: Request /api/spider tanpa promptContent ditolak HTTP 400");

    // 25.4 Happy Path POST /api/spider (Langsung promptContent)
    const reqSpiderHappy = new Request("http://localhost:3000/api/spider", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({
        promptContent: "Bertindaklah sebagai arsitek sistem yang teliti dan selalu validasi schema JSON.",
        targetProvider: "groq",
        targetModel: "llama-3.3-70b-versatile",
      }),
    });
    const resSpiderHappy = await POST_SPIDER(reqSpiderHappy);
    assert(resSpiderHappy.status === 201, "POST /api/spider berhasil (HTTP 201 Created)");
    const jsonSpider = await resSpiderHappy.json();
    assert(jsonSpider.success === true, "POST /api/spider memuat success: true");
    assert(typeof jsonSpider.data?.criticalGatePassed === "boolean", "POST /api/spider mengevaluasi criticalGatePassed");
    assert(Array.isArray(jsonSpider.data?.testCases) && jsonSpider.data.testCases.length === 5, "POST /api/spider menjalankan tepat 5 kasus uji");
    assert(typeof jsonSpider.data?.qualityMetrics?.robustnessScore === "number", "POST /api/spider memuat skor robustness");

    // 25.5 Anti-IDOR pada PromptVersion dan SpiderRun:
    // Buat prompt untuk User A dan PromptVersion
    const promptUserA = await savePrompt({
      userId: userIdA,
      originalPrompt: "Prompt User A for Spider",
      optimizedPrompt: "Optimized Prompt User A for Spider",
      score: 88,
    });
    const versionUserA = await createPromptVersion({
      savedPromptId: promptUserA.id,
      userId: userIdA,
      promptContent: promptUserA.optimizedPrompt,
    });

    // User B mencoba menjalankan spider terhadap version milik User A -> HTTP 403
    const reqSpiderRunUserB = new Request("http://localhost:3000/api/spider", {
      method: "POST",
      headers: authHeadersB,
      body: JSON.stringify({
        promptVersionId: versionUserA.id,
      }),
    });
    const resSpiderRunUserB = await POST_SPIDER(reqSpiderRunUserB);
    assert(resSpiderRunUserB.status === 403, "Anti-IDOR: User B menjalankan uji Spider pada promptVersion milik User A ditolak HTTP 403");

    // User A menjalankan spider terhadap versinya sendiri -> HTTP 201
    const reqSpiderRunUserA = new Request("http://localhost:3000/api/spider", {
      method: "POST",
      headers: authHeadersA,
      body: JSON.stringify({
        promptVersionId: versionUserA.id,
      }),
    });
    const resSpiderRunUserA = await POST_SPIDER(reqSpiderRunUserA);
    assert(resSpiderRunUserA.status === 201, "User A berhasil menjalankan uji Spider pada versinya sendiri (HTTP 201)");
    const jsonSpiderRunA = await resSpiderRunUserA.json();
    const createdSpiderRunId = jsonSpiderRunA.data.runId;

    // Reset spider rate limiter untuk pengujian anti-IDOR
    getSpiderRateLimiter().reset();

    // User B mencoba membaca SpiderRun milik User A via GET /api/spider?id=... -> HTTP 403
    const reqGetSpiderUserB = new Request(`http://localhost:3000/api/spider?id=${createdSpiderRunId}`, {
      method: "GET",
      headers: authHeadersB,
    });
    const resGetSpiderUserB = await GET_SPIDER(reqGetSpiderUserB);
    assert(resGetSpiderUserB.status === 403, "Anti-IDOR: User B membaca hasil SpiderRun milik User A ditolak HTTP 403");

    // User A membaca SpiderRun miliknya sendiri -> HTTP 200
    const reqGetSpiderUserA = new Request(`http://localhost:3000/api/spider?id=${createdSpiderRunId}`, {
      method: "GET",
      headers: authHeadersA,
    });
    const resGetSpiderUserA = await GET_SPIDER(reqGetSpiderUserA);
    assert(resGetSpiderUserA.status === 200, "User A berhasil membaca hasil SpiderRun miliknya sendiri (HTTP 200)");
  } catch (err: unknown) {
    assert(false, "/api/spider suite test", String(err));
  }

  // Ringkasan
  console.log("\n═══════════════════════════════════════════════════════════════════");
  const failedCount = results.filter((r) => !r.passed).length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`🏁 HASIL AKHIR: ${passedCount} LULUS, ${failedCount} GAGAL (Total ${results.length} Asersi)`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (failedCount > 0) {
    process.exit(1);
  }
  } finally {
    await prisma.$disconnect();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(`${tempDbPath}-journal`)) fs.unlinkSync(`${tempDbPath}-journal`);
    } catch {}
  }
}

runApiRegressionSuite().catch((err) => {
  console.error("Fatal Test Suite Crash:", err);
  process.exit(1);
});
