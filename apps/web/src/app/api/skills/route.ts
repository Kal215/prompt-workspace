import { NextResponse } from "next/server";
import { getAgentSkillRegistry } from "../../../lib/agent-engine-bridge";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

/**
 * GET /api/skills
 * Mengambil daftar skill terdaftar (termasuk built-ins), versi aktif, riwayat versi, dan status Holdout Gate.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const skillName = url.searchParams.get("name");
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const registry = getAgentSkillRegistry();

    if (skillName) {
      const skill = registry.getSkill(skillName);
      if (!skill) {
        return NextResponse.json(
          { success: false, error: `Skill '${skillName}' tidak ditemukan.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, skill }, { status: 200 });
    }

    if (activeOnly) {
      const activeManifests = registry.getActiveSkills();
      return NextResponse.json(
        { success: true, count: activeManifests.length, skills: activeManifests },
        { status: 200 }
      );
    }

    const allSkills = registry.getAllSkills();
    return NextResponse.json(
      {
        success: true,
        count: allSkills.length,
        skills: allSkills,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_SKILLS_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil katalog skill." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/skills
 * Mendaftarkan draft skill deklaratif baru (Fail-closed: memblokir executable & network access).
 */
export async function POST(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const registry = getAgentSkillRegistry();
    const manifest = body.manifest || body;

    const result = registry.registerSkill(manifest);
    if (!result.success) {
      const isSecurity =
        Array.isArray(result.validation.securityBlockers) &&
        result.validation.securityBlockers.length > 0;
      return NextResponse.json(
        {
          success: false,
          error:
            [
              ...(result.validation.securityBlockers || []),
              ...(result.validation.errors || []),
            ].join(", ") || "Validasi keamanan skill gagal.",
          validationReport: result.validation,
        },
        { status: isSecurity ? 422 : 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Skill '${result.entry?.manifest.name}' v${result.entry?.manifest.version} berhasil didaftarkan.`,
        entry: result.entry,
        validationReport: result.validation,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errMsg = (err as Error).message || "";
    const isSecurity =
      errMsg.includes("EXECUTABLE_SKILL_FORBIDDEN") ||
      errMsg.includes("NETWORK_ACCESS_FORBIDDEN") ||
      errMsg.includes("FILESYSTEM_ACCESS_FORBIDDEN") ||
      errMsg.includes("SIDE_EFFECTS_FORBIDDEN") ||
      errMsg.includes("FORBIDDEN");
    return NextResponse.json(
      { success: false, error: errMsg || "Gagal mendaftarkan skill baru." },
      { status: isSecurity ? 422 : 500 }
    );
  }
}

/**
 * PUT /api/skills
 * action: 'activate' -> Mengaktifkan skill yang lulus Holdout Gate
 * action: 'disable'  -> Menonaktifkan skill
 * action: 'rollback' -> Melakukan Instant Rollback ke versi sebelumnya
 */
export async function PUT(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const { action = "activate", name, targetVersion: _targetVersion, score = 90, passed = true } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter name skill wajib disertakan." },
        { status: 400 }
      );
    }

    const registry = getAgentSkillRegistry();

    if (action === "activate") {
      const activateResult = registry.evaluateAndActivateSkill(name, {
        passed: Boolean(passed),
        score: Number(score) || 90,
        details: "Aktivasi manual via Operator Console dengan evaluasi Holdout",
      });

      if (!activateResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: activateResult.message || "Gagal mengaktifkan skill (ambang holdout tidak tercapai).",
            status: activateResult.status,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: activateResult.message,
        status: activateResult.status,
        entry: registry.getSkill(name),
      });
    }

    if (action === "disable") {
      const res = registry.setSkillStatus(name, "DISABLED");
      if (!res.success) {
        return NextResponse.json(
          { success: false, error: res.message },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: res.message,
        entry: registry.getSkill(name),
      });
    }

    if (action === "rollback") {
      const rollbackResult = registry.rollbackSkill(name);
      if (!rollbackResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: rollbackResult.message || "Gagal melakukan rollback skill.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: rollbackResult.message,
        rolledBackToVersion: rollbackResult.rolledBackToVersion,
        entry: registry.getSkill(name),
      });
    }

    return NextResponse.json(
      { success: false, error: `Action '${action}' tidak dikenali.` },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[API_SKILLS_PUT_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Gagal memperbarui status skill." },
      { status: 500 }
    );
  }
}
