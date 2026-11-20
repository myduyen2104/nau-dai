import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const dependencyDir = await mkdtemp(join(tmpdir(), "nau-dai-python-build-"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
}

try {
  run("python3", [
    "-m", "pip", "install", "--disable-pip-version-check", "--quiet",
    "--target", dependencyDir, "-r", "requirements-build.txt",
  ]);

  run("python3", ["scripts/build-optimized-source-images.py"], {
    env: {
      ...process.env,
      PYTHONPATH: [dependencyDir, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
    },
  });
} finally {
  await rm(dependencyDir, { recursive: true, force: true });
}
