import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const dependencyDir = await mkdtemp(join(tmpdir(), "nau-dai-python-build-"));
const requirements = await readFile("requirements-build.txt", "utf8");
const requiredPillowVersion = requirements.match(/^Pillow==([^\s]+)/m)?.[1];
const systemPillow = spawnSync("python3", ["-c", "import PIL; print(PIL.__version__)"], { encoding: "utf8" });
const systemPillowMatches = systemPillow.status === 0 && systemPillow.stdout.trim() === requiredPillowVersion;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
}

try {
  if (!systemPillowMatches) {
    run("python3", [
      "-m", "pip", "install", "--disable-pip-version-check", "--quiet",
      "--target", dependencyDir, "-r", "requirements-build.txt",
    ]);
  }

  run("python3", ["scripts/build-optimized-source-images.py"], systemPillowMatches ? {} : {
    env: {
      ...process.env,
      PYTHONPATH: [dependencyDir, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
    },
  });
} finally {
  await rm(dependencyDir, { recursive: true, force: true });
}
