import { configDefaults, defineConfig } from "vitest/config";

// Agent worktrees live under .claude/worktrees/: their copies of the tests are not this checkout's tests.
// dist/ is the tsc build output (npm run build, also run by lerd link): compiled copies, not the tests.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, ".claude/**", "dist/**"] } });
