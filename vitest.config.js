import { defineConfig } from "vitest/config";
import { putyPlugin } from "puty/vitest";

export default defineConfig({
  plugins: [putyPlugin()],
  test: {
    // Sub-millisecond performance assertions measure wall time. Competing
    // workers can exceed their unchanged thresholds even on unpatched main.
    fileParallelism: false,
  },
});
