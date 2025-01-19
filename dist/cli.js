#!/usr/bin/env node
#!/usr/bin/env node

// src/cli.ts
import { resolve as resolve3 } from "path";

// src/analyzer.ts
import { stat as stat2 } from "fs/promises";
import { dirname as dirname2, resolve as resolve2 } from "path";

// src/utils.ts
import { readFile, readdir, stat } from "fs/promises";
import { join, resolve } from "path";
var isJsOrTsFile = (path) => {
  return /\.(js|jsx|ts|tsx)$/.test(path);
};
var extractImports = (content) => {
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([./][^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
};
var resolveImportPath = async (importPath, currentDir) => {
  const resolvedPath = resolve(currentDir, importPath);
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  if (/\.[^/.]+$/.test(importPath)) {
    try {
      await stat(resolvedPath);
      return resolvedPath;
    } catch {
    }
  }
  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    try {
      await stat(pathWithExt);
      return pathWithExt;
    } catch {
      continue;
    }
  }
  for (const ext of extensions) {
    const indexPath = join(resolvedPath, `index${ext}`);
    try {
      await stat(indexPath);
      return indexPath;
    } catch {
      continue;
    }
  }
  return resolvedPath;
};
var processFile = async (filePath) => {
  const content = await readFile(filePath, "utf-8");
  const imports = extractImports(content);
  return {
    path: filePath,
    content,
    imports
  };
};
var findTsFiles = async (dir) => {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) {
        continue;
      }
      files.push(...await findTsFiles(path));
    } else if (isJsOrTsFile(path)) {
      files.push(path);
    }
  }
  return files;
};

// src/analyzer.ts
var analyzeImports = async (path) => {
  const absolutePath = resolve2(process.cwd(), path);
  const stats = await stat2(absolutePath);
  const result = {
    imports: {},
    content: {}
  };
  const filesToProcess = stats.isDirectory() ? await findTsFiles(absolutePath) : [absolutePath];
  const fileNodes = await Promise.all(
    filesToProcess.map(processFile)
  );
  for (const node of fileNodes) {
    result.content[node.path] = node.content;
    const resolvedImports = await Promise.all(
      node.imports.map(
        (importPath) => resolveImportPath(importPath, dirname2(node.path))
      )
    );
    result.imports[node.path] = resolvedImports;
  }
  return result;
};

// src/cli.ts
async function main() {
  try {
    const [, , path] = process.argv;
    if (!path) {
      console.error("Please provide a path to analyze");
      console.error("Usage: deepcontext <path>");
      process.exit(1);
    }
    const absolutePath = resolve3(process.cwd(), path);
    const result = await analyzeImports(absolutePath);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
main();
//# sourceMappingURL=cli.js.map