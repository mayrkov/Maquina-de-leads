// QA (Quinn), second pass: independent re-verification of commit a299188 ("Corrige falhas ... QA").
//
// `it.fails` = a residual bug or a new hole found while re-verifying the fixes. The assertion states the
// correct behaviour and currently fails, so vitest reports it as an expected failure. Once the bug is fixed,
// vitest reports it as a failure: remove `.fails` then. Fakes only; writes go to the OS temp dir.
import { execFileSync } from "node:child_process";
import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { minimalChildEnv } from "../../src/orchestrator/lib/childEnv.js";
import { resolveFfmpegBinaries } from "../../src/orchestrator/lib/ffmpeg.js";
import { withFileLock } from "../../src/orchestrator/lib/fileLock.js";
import { redactSecrets } from "../../src/orchestrator/lib/redact.js";

const isWindows = process.platform === "win32";

// ---------------------------------------------------------------------------------------------
// fileLock (upload lock + history lock)
// ---------------------------------------------------------------------------------------------

/** Runs `contenders` concurrent holders `trials` times; returns errors seen and the max simultaneous holders. */
async function contend(trials: number, contenders: number, staleLockAtStart: boolean, holdMs = 5) {
  const errors: string[] = [];
  let maxHolders = 0;
  for (let n = 0; n < trials; n++) {
    const lock = join(mkdtempSync(join(tmpdir(), "qa-lock-")), "upload.lock");
    if (staleLockAtStart) {
      writeFileSync(lock, "{}"); // left behind by a crashed process 4 h ago
      const old = new Date(Date.now() - 4 * 3600_000);
      utimesSync(lock, old, old);
    }
    let active = 0;
    const holder = () =>
      withFileLock(lock, { staleMs: 3 * 3600_000, waitMs: 10_000, pollMs: 5 }, async () => {
        active++;
        maxHolders = Math.max(maxHolders, active);
        await new Promise((r) => setTimeout(r, holdMs));
        active--;
      });
    const results = await Promise.allSettled(Array.from({ length: contenders }, holder));
    for (const r of results) if (r.status === "rejected") errors.push(String((r.reason as NodeJS.ErrnoException).code ?? r.reason));
  }
  return { errors, maxHolders };
}

describe("withFileLock under contention", () => {
  // On Windows, open(lock, "wx") racing a holder's rm(lock) fails with EPERM (file in delete-pending state),
  // which withFileLock rethrows instead of treating as "busy". Measured here: ~55% of 6-way contentions
  // (~5-10% of 3-way ones). For appendUploadRecord this means: video uploaded, history append throws.
  (isWindows ? it : it.skip)("FIXED (Windows): a waiting contender crashes with EPERM instead of waiting its turn", async () => {
    const { errors } = await contend(40, 6, false);
    expect(errors).toEqual([]);
  }, 60_000);

  // Stale takeover is check-then-act: two waiters both see the old lock as stale; the second one's
  // rm() deletes the FIRST waiter's fresh lock, and both enter the critical section (cap check + upload).
  // The release path has the same flaw: rm() in `finally` removes whoever's lock is there now.
  // Measured: two simultaneous holders in ~7% of 6-way contentions on a stale lock (EPERM errors ignored here).
  (isWindows ? it : it.skip)("FIXED: stale-lock takeover lets two holders into the critical section at once", async () => {
    const { maxHolders } = await contend(100, 6, true);
    expect(maxHolders).toBe(1);
  }, 60_000);
});

// ---------------------------------------------------------------------------------------------
// Publishability: verdicts are trusted without being bound to the content they judged
// ---------------------------------------------------------------------------------------------

describe("redactSecrets coverage", () => {
  it("control: query keys and Bearer tokens are masked", () => {
    const out = redactSecrets("GET https://x/api?q=1&key=AIzaFAKE123456 Authorization: Bearer ya29.FAKEaccess-token_123");
    expect(out).not.toMatch(/AIzaFAKE|ya29\.FAKE/);
  });

  // OAuth client secret / refresh token live in files, not env vars, so literal masking never covers them.
  // No current code path logs them; these document the gap for any future error that echoes a token body.
  it("FIXED: refresh_token/client_secret inside a JSON body are not masked", () => {
    const out = redactSecrets('{"client_secret":"GOCSPX-FAKEsecret123","refresh_token":"1//0gFAKErefresh"}', {});
    expect(out).not.toMatch(/GOCSPX-FAKE|1\/\/0gFAKE/);
  });

  it("FIXED: the first parameter of a form-encoded token request body is not masked", () => {
    expect(redactSecrets("client_secret=GOCSPX-FAKEsecret123&grant_type=refresh_token", {})).not.toContain("GOCSPX-FAKE");
  });
});

describe("minimalChildEnv keeps the real children working", () => {
  it("Remotion's ffprobe runs under the minimal env", () => {
    const { ffprobe, dir } = resolveFfmpegBinaries();
    const out = execFileSync(ffprobe, ["-version"], { cwd: dir, env: minimalChildEnv(), encoding: "utf8", windowsHide: true });
    expect(out).toMatch(/ffprobe version/);
  });
});
