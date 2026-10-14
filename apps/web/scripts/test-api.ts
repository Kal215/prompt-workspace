/**
 * apps/web/scripts/test-api.ts
 * Suite Uji Regresi API History Nyata (Real Handler & SQLite Database)
 * 
 * Menguji langsung handler Next.js API (GET, POST, DELETE) tanpa mock fiktif.
 * Memvalidasi:
 * 1. Happy path GET, POST, DELETE
 * 2. Idempotensi (save dua kali dengan ID identik)
 * 3. Konflik ID duplikat dengan payload berbeda (HTTP 409)
 * 4. Input kosong (originalPrompt/optimizedPrompt kosong atau whitespace)
 * 5. Malformed JSON
 * 6. Payload terlalu besar (> 50.000 karakter / > 256 KB)
 * 7. Score di luar rentang (skor < 0 atau skor > 100)
 * 8. Delete ID tidak ditemukan (HTTP 404)
 * 9. Sanitasi error (tidak ada stack trace atau raw secret/prompt di log dan response)
 */

import { GET, POST, DELETE } from "../src/app/api/history/route";
import { getPromptById } from "@prompt-workspace/database";
import crypto from "crypto";

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
  console.log("🧪 MENJALANKAN API REGRESSION TEST SUITE (apps/web/src/app/api/history)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const testId = `test-${crypto.randomUUID()}`;
  const validPayload = {
    id: testId,
    originalPrompt: "Prompt uji coba untuk validasi regresi sistem database.",
    optimizedPrompt: "Prompt teroptimasi berstandar industri dengan batasan ketat dan panduan jelas.",
    intentSummary: "Validasi fungsionalitas API History",
    score: 95,
  };

  // 1. Test Initial GET /api/history
  console.log("▶ [Test 1] GET /api/history (Initial fetch)");
  try {
    const req = new Request("http://localhost:3000/api/history?limit=10", {
      method: "GET",
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
  console.log("\n▶ [Test 2] POST /api/history (Simpan Prompt Baru)");
  try {
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    assert(json.data?.id === testId, "Mengembalikan data yang sama tanpa menduplikasi baris");
  } catch (err: unknown) {
    assert(false, "Save dua kali idempotent", String(err));
  }

  // 4. Test Duplicate ID dengan Payload Berbeda (Conflict 409)
  console.log("\n▶ [Test 4] POST /api/history (Duplicate ID dengan Payload Berbeda)");
  try {
    const conflictingPayload = {
      ...validPayload,
      originalPrompt: "Prompt yang berbeda dari data asli yang tersimpan.",
    };
    const req = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  // 5. Test Input Kosong
  console.log("\n▶ [Test 5] POST /api/history (Input Kosong & Whitespace)");
  try {
    // 5a. originalPrompt kosong
    const reqEmptyOriginal = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, id: "test-empty-1", originalPrompt: "   " }),
    });
    const resEmptyOriginal = await POST(reqEmptyOriginal);
    assert(resEmptyOriginal.status === 400, "originalPrompt kosong ditolak dengan HTTP 400");

    // 5b. optimizedPrompt kosong
    const reqEmptyOptimized = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, id: "test-empty-2", optimizedPrompt: "" }),
    });
    const resEmptyOptimized = await POST(reqEmptyOptimized);
    assert(resEmptyOptimized.status === 400, "optimizedPrompt kosong ditolak dengan HTTP 400");
  } catch (err: unknown) {
    assert(false, "Input kosong test", String(err));
  }

  // 6. Test Malformed JSON
  console.log("\n▶ [Test 6] POST /api/history (Malformed JSON Body)");
  try {
    const reqMalformed = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{\"broken_json\": true,", // syntax error
    });
    const resMalformed = await POST(reqMalformed);
    const jsonMalformed = await resMalformed.json();
    assert(resMalformed.status === 400, "Malformed JSON ditolak dengan HTTP 400");
    assert(jsonMalformed.success === false, "Response success: false");
    assert(
      typeof jsonMalformed.error === "string" && jsonMalformed.error.includes("JSON"),
      "Pesan error spesifik terkait format JSON tidak valid"
    );
  } catch (err: unknown) {
    assert(false, "Malformed JSON test", String(err));
  }

  // 7. Test Payload Terlalu Besar
  console.log("\n▶ [Test 7] POST /api/history (Payload Terlalu Besar > 50.000 Karakter)");
  try {
    const hugePrompt = "A".repeat(55000);
    const reqHuge = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        id: "test-huge",
        originalPrompt: hugePrompt,
      }),
    });
    const resHuge = await POST(reqHuge);
    assert(resHuge.status === 400 || resHuge.status === 413, "Prompt > 50.000 karakter ditolak dengan HTTP 400/413");
  } catch (err: unknown) {
    assert(false, "Payload size test", String(err));
  }

  // 8. Test Score di Luar Rentang
  console.log("\n▶ [Test 8] POST /api/history (Score di Luar Rentang 0-100)");
  try {
    // 8a. score > 100
    const reqScoreHigh = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, id: "test-score-1", score: 120 }),
    });
    const resScoreHigh = await POST(reqScoreHigh);
    assert(resScoreHigh.status === 400, "Score 120 ditolak dengan HTTP 400");

    // 8b. score < 0
    const reqScoreLow = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, id: "test-score-2", score: -10 }),
    });
    const resScoreLow = await POST(reqScoreLow);
    assert(resScoreLow.status === 400, "Score -10 ditolak dengan HTTP 400");
  } catch (err: unknown) {
    assert(false, "Score range test", String(err));
  }

  // 9. Test Delete ID Tidak Ditemukan
  console.log("\n▶ [Test 9] DELETE /api/history (ID Tidak Ditemukan / Kosong)");
  try {
    // 9a. ID tidak ditemukan (P2025 -> 404)
    const reqNotFound = new Request(
      "http://localhost:3000/api/history?id=non-existent-uuid-999999",
      { method: "DELETE" }
    );
    const resNotFound = await DELETE(reqNotFound);
    const jsonNotFound = await resNotFound.json();
    assert(resNotFound.status === 404, "Delete ID tidak ditemukan mengembalikan HTTP 404");
    assert(jsonNotFound.success === false, "Response success: false");

    // 9b. Tanpa parameter id
    const reqNoId = new Request("http://localhost:3000/api/history", {
      method: "DELETE",
    });
    const resNoId = await DELETE(reqNoId);
    assert(resNoId.status === 400, "Delete tanpa parameter 'id' mengembalikan HTTP 400");
  } catch (err: unknown) {
    assert(false, "Delete not found test", String(err));
  }

  // 10. Test Delete Sukses & Verifikasi Persistensi
  console.log("\n▶ [Test 10] DELETE /api/history (Delete Sukses)");
  try {
    const reqDelete = new Request(
      `http://localhost:3000/api/history?id=${encodeURIComponent(testId)}`,
      { method: "DELETE" }
    );
    const resDelete = await DELETE(reqDelete);
    const jsonDelete = await resDelete.json();
    assert(resDelete.status === 200, "Delete mengembalikan HTTP 200 OK");
    assert(jsonDelete.success === true, "Response success: true");

    // Verifikasi ke database nyata bahwa record terhapus
    const checkDb = await getPromptById(testId);
    assert(checkDb === null, "Konfirmasi record terhapus permanen dari SQLite");
  } catch (err: unknown) {
    assert(false, "Delete success test", String(err));
  }

  // 11. Test Sanitasi Error & Tidak Ada Bocoran Secret / Stack Trace
  console.log("\n▶ [Test 11] Sanitasi Error Logging & Response");
  try {
    const reqBad = new Request("http://localhost:3000/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  // Ringkasan
  console.log("\n═══════════════════════════════════════════════════════════════════");
  const failedCount = results.filter((r) => !r.passed).length;
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`🏁 HASIL AKHIR: ${passedCount} LULUS, ${failedCount} GAGAL (Total ${results.length} Asersi)`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runApiRegressionSuite().catch((err) => {
  console.error("Fatal Test Suite Crash:", err);
  process.exit(1);
});
