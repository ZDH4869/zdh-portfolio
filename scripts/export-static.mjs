import { copyFile, lstat, mkdir, readdir, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const requested = resolve(process.argv[2] ?? join(repository, "..", "upload"));
const output = join(await realpath(dirname(requested)), basename(requested));

function isWithin(directory, path) {
  const delta = relative(directory, path);
  return delta === "" || (delta !== ".." && !delta.startsWith(".." + sep) && !isAbsolute(delta));
}

if (isWithin(repository, output) || isWithin(output, repository)) {
  throw new Error("Choose an output directory outside the source repository, such as ../upload.");
}

const stills = [
  "xaj-overview", "xaj-result", "bim-iteration", "bim-skills", "dify-review", "ppt-framework",
  "ppt-library", "ppt-agent", "ppt-collaboration", "ppt-tank",
];
const files = [
  "index.html", "portfolio.css", "portfolio.js", "assets/xaj-overview-840.webp",
  "assets/hydrolab-animation.webp", "assets/hydrolab-poster.webp",
  "assets/original/hydrolab.gif",
  ...stills.flatMap((name) => [
    "assets/" + name + "-720.webp", "assets/" + name + "-1440.webp", "assets/original/" + name + ".png",
  ]),
];
const allowedFiles = new Set(files);
const allowedDirectories = new Set(["assets", "assets/original"]);
const unexpected = [];

async function inspectDirectory(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory() && allowedDirectories.has(path)) {
      await inspectDirectory(join(directory, entry.name), path + "/");
    } else if (!entry.isFile() || !allowedFiles.has(path)) {
      unexpected.push(path);
    }
  }
}

const existing = await lstat(output).catch((error) => {
  if (error.code === "ENOENT") return null;
  throw error;
});
if (existing) {
  if (!existing.isDirectory()) throw new Error("The output path must be a regular directory.");
  await inspectDirectory(output);
}
if (unexpected.length) {
  throw new Error("Unexpected entries in " + output + ". Move them manually before exporting:\n" + unexpected.join("\n"));
}

for (const path of files) {
  if (!(await lstat(join(repository, path))).isFile()) {
    throw new Error("A publishable source file is missing or invalid: " + path);
  }
}

await mkdir(join(output, "assets", "original"), { recursive: true });
for (const path of files) {
  await copyFile(join(repository, path), join(output, path));
}
console.log("Exported " + files.length + " static files to " + output);
