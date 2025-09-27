import { build } from "esbuild";

build({
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "cjs",
  sourcemap: true,
  target: ["es2022"],
  outExtension: { ".js": ".cjs" },
});
