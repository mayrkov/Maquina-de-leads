import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { minimalChildEnv } from "../../src/orchestrator/lib/childEnv.js";
import { withFileLock } from "../../src/orchestrator/lib/fileLock.js";
import type { Logger } from "../../src/orchestrator/lib/logger.js";
import { redactDeep, redactSecrets } from "../../src/orchestrator/lib/redact.js";

const NOW = new Date("2026-10-03T12:00:00Z");
const silentLog: Logger = { filePath: "", debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined };

// ---------------------------------------------------------------------------------------------
// H5 redaction
// ---------------------------------------------------------------------------------------------

describe("redactSecrets", () => {
  const env = { GEMINI_API_KEY: "AIzaSyFAKE-gemini-key-1234567890", PEXELS_API_KEY: "short" } as NodeJS.ProcessEnv;

  it.each([
    ["https://pixabay.com/api/videos/?key=ABC123SECRET&q=lava", "https://pixabay.com/api/videos/?key=***&q=lava"],
    ["GET /x?q=1&api_key=zzz999 failed", "GET /x?q=1&api_key=*** failed"],
    ["?apikey=a1&token=t2&access_token=t3&client_secret=c4", "?apikey=***&token=***&access_token=***&client_secret=***"],
    ['"url": "https://h/?KEY=UPPER"', '"url": "https://h/?KEY=***"'],
    ["Authorization: Bearer ya29.a0AfH6SM-xyz_123", "Authorization: Bearer ***"],
  ])("masks %s", (input, expected) => {
    expect(redactSecrets(input, env)).toBe(expected);
  });

  it("masks literal values of known secret env vars, but not short values", () => {
    expect(redactSecrets("error with AIzaSyFAKE-gemini-key-1234567890 inside", env)).toBe("error with *** inside");
    expect(redactSecrets("a short word", env)).toBe("a short word");
  });

  it("leaves ordinary URLs and text alone", () => {
    expect(redactSecrets("https://commons.wikimedia.org/wiki/File:X.jpg?page=2", env)).toBe("https://commons.wikimedia.org/wiki/File:X.jpg?page=2");
  });

  it("redacts nested adapter payloads", () => {
    const out = redactDeep({ errors: [{ message: "for url: https://p/?key=SEKRET" }], n: 3 }, env);
    expect(out).toEqual({ errors: [{ message: "for url: https://p/?key=***" }], n: 3 });
  });
});

describe("minimalChildEnv", () => {
  const env = { PATH: "C:\\bin", SystemRoot: "C:\\Windows", GEMINI_API_KEY: "g", PEXELS_API_KEY: "p", TEMP: "C:\\t", EMPTY: "" } as NodeJS.ProcessEnv;

  it("keeps OS basics, forces UTF-8 and withholds secrets", () => {
    const out = minimalChildEnv([], env);
    expect(out).toMatchObject({ PATH: "C:\\bin", SystemRoot: "C:\\Windows", TEMP: "C:\\t", PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" });
    expect(out.GEMINI_API_KEY).toBeUndefined();
    expect(out.PEXELS_API_KEY).toBeUndefined();
  });

  it("passes only the requested keys", () => {
    const out = minimalChildEnv(["PEXELS_API_KEY"], env);
    expect(out.PEXELS_API_KEY).toBe("p");
    expect(out.GEMINI_API_KEY).toBeUndefined();
  });
});
