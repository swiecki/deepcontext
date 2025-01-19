#!/usr/bin/env node

// src/cli.ts
import { resolve as resolve3 } from "path";

// src/analyzer.ts
import { stat as stat2 } from "fs/promises";
import { dirname as dirname2, resolve as resolve2 } from "path";

// src/utils.ts
import { readFile, readdir, stat } from "fs/promises";
import { join, resolve, dirname } from "path";
var isJsOrTsFile = (path) => {
  return /\.(js|jsx|ts|tsx)$/.test(path);
};
var extractImports = (content, options = {}) => {
  const log = (...args) => {
    if (options.debug) {
      console.log(...args);
    }
  };
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([@./][^'"]+)['"]/g;
  const imports = [];
  let match;
  const normalizedContent = content.replace(/\r\n/g, "\n");
  while ((match = importRegex.exec(normalizedContent)) !== null) {
    log("  Found import match:", match[0], "-> path:", match[1]);
    imports.push(match[1]);
  }
  return imports;
};
var loadTsConfig = async (startDir, options = {}) => {
  const log = (...args) => {
    if (options.debug) {
      console.log(...args);
    }
  };
  let currentDir = startDir;
  while (currentDir !== "/") {
    try {
      const tsconfigPath = join(currentDir, "tsconfig.json");
      await stat(tsconfigPath);
      const content = await readFile(tsconfigPath, "utf-8");
      const tsconfig = JSON.parse(content);
      log("  Found tsconfig at:", tsconfigPath);
      log("  Paths:", tsconfig.compilerOptions?.paths);
      return {
        baseUrl: tsconfig.compilerOptions?.baseUrl,
        paths: tsconfig.compilerOptions?.paths,
        tsconfigDir: currentDir
      };
    } catch {
      currentDir = dirname(currentDir);
    }
  }
  log("  No tsconfig.json found");
  return {};
};
var resolveImportPath = async (importPath, currentDir, options = {}) => {
  const log = (...args) => {
    if (options.debug) {
      console.log(...args);
    }
  };
  log(`
  Resolving import: ${importPath} from ${currentDir}`);
  if (importPath.startsWith("@")) {
    log("  Import uses @ prefix, checking tsconfig paths");
    const tsconfig = await loadTsConfig(currentDir, options);
    if (tsconfig.paths && tsconfig.tsconfigDir) {
      for (const [pattern, [replacement]] of Object.entries(tsconfig.paths)) {
        const patternRegex = new RegExp("^" + pattern.replace("*", "(.*)") + "$");
        const match = importPath.match(patternRegex);
        if (match) {
          log(`  Matched pattern ${pattern} -> ${replacement}`);
          const baseDir = tsconfig.baseUrl ? join(tsconfig.tsconfigDir, tsconfig.baseUrl) : tsconfig.tsconfigDir;
          const resolvedPath2 = join(baseDir, replacement.replace("*", match[1]));
          log(`  Resolved to: ${resolvedPath2}`);
          return resolveImportPath(resolvedPath2, baseDir, options);
        }
      }
      log("  No matching pattern found in tsconfig paths");
    }
  }
  const resolvedPath = resolve(currentDir, importPath);
  log(`  Trying path: ${resolvedPath}`);
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  if (/\.[^/.]+$/.test(importPath)) {
    try {
      await stat(resolvedPath);
      log(`  Found exact match: ${resolvedPath}`);
      return resolvedPath;
    } catch {
      log(`  Exact match not found: ${resolvedPath}`);
    }
  }
  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    try {
      await stat(pathWithExt);
      log(`  Found with extension: ${pathWithExt}`);
      return pathWithExt;
    } catch {
      log(`  Not found with extension: ${pathWithExt}`);
    }
  }
  for (const ext of extensions) {
    const indexPath = join(resolvedPath, `index${ext}`);
    try {
      await stat(indexPath);
      log(`  Found index file: ${indexPath}`);
      return indexPath;
    } catch {
      log(`  Index file not found: ${indexPath}`);
    }
  }
  log(`  Could not resolve ${importPath}, returning original resolved path`);
  return resolvedPath;
};
var processFile = async (filePath, options = {}) => {
  const content = await readFile(filePath, "utf-8");
  const imports = extractImports(content, options);
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
var analyzeImports = async (path, maxDepth = 0, options = {}) => {
  const log = (...args) => {
    if (options.debug) {
      console.log(...args);
    }
  };
  log(`
Analyzing ${path} with max depth ${maxDepth}`);
  const absolutePath = resolve2(process.cwd(), path);
  const stats = await stat2(absolutePath);
  const result = {
    imports: {},
    content: {}
  };
  const processedPaths = /* @__PURE__ */ new Set();
  async function processFileRecursively(filePath, currentDepth) {
    if (processedPaths.has(filePath)) {
      log(`  [${currentDepth}] Already processed ${filePath}`);
      return;
    }
    log(`
  [${currentDepth}] Processing ${filePath}`);
    processedPaths.add(filePath);
    const node = await processFile(filePath, options);
    result.content[node.path] = node.content;
    log(`  [${currentDepth}] Found imports:`, node.imports);
    const resolvedImports = await Promise.all(
      node.imports.map(
        (importPath) => resolveImportPath(importPath, dirname2(node.path), options)
      )
    );
    log(`  [${currentDepth}] Resolved to:`, resolvedImports);
    result.imports[node.path] = resolvedImports;
    if (currentDepth < maxDepth) {
      log(`  [${currentDepth}] Following imports (depth < ${maxDepth})`);
      for (const resolvedPath of resolvedImports) {
        if (resolvedPath) {
          try {
            await stat2(resolvedPath);
            await processFileRecursively(resolvedPath, currentDepth + 1);
          } catch (err) {
            log(`  [${currentDepth}] Failed to process ${resolvedPath}:`, err?.message || String(err));
          }
        }
      }
    } else {
      log(`  [${currentDepth}] Max depth reached, stopping`);
    }
  }
  const initialFiles = stats.isDirectory() ? await findTsFiles(absolutePath) : [absolutePath];
  await Promise.all(initialFiles.map((file) => processFileRecursively(file, 0)));
  return result;
};

// src/cli.ts
async function main() {
  try {
    const args = process.argv.slice(2);
    const debugIndex = args.indexOf("--debug");
    const debug = debugIndex !== -1;
    if (debug) {
      args.splice(debugIndex, 1);
    }
    const [path, depthArg = "0"] = args;
    if (!path) {
      console.error("Please provide a path to analyze");
      console.error("Usage: deepcontext <path> [depth] [--debug]");
      console.error("Example: deepcontext admin-wrapper.tsx 2");
      process.exit(1);
    }
    const depth = parseInt(depthArg, 10);
    if (isNaN(depth) || depth < 0) {
      console.error("Depth must be a non-negative number");
      process.exit(1);
    }
    const absolutePath = resolve3(process.cwd(), path);
    const result = await analyzeImports(absolutePath, depth, { debug });
    Object.entries(result.content).forEach(([filepath, content]) => {
      console.log(`
------- ${filepath} -------`);
      console.log(content);
    });
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
main();
//# sourceMappingURL=cli.js.map