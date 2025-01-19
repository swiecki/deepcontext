#!/usr/bin/env node

// src/analyzer.ts
import { stat as stat2 } from "fs/promises";
import { dirname as dirname2, resolve as resolve2 } from "path";

// src/utils.ts
import { readFile, readdir, stat } from "fs/promises";
import { join, resolve, dirname } from "path";
var isJsOrTsFile = (path) => {
  return /\.(js|jsx|ts|tsx)$/.test(path);
};
var extractImports = (content) => {
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([@./][^'"]+)['"]/g;
  const imports = [];
  let match;
  const normalizedContent = content.replace(/\r\n/g, "\n");
  while ((match = importRegex.exec(normalizedContent)) !== null) {
    console.log("  Found import match:", match[0], "-> path:", match[1]);
    imports.push(match[1]);
  }
  return imports;
};
var loadTsConfig = async (startDir) => {
  let currentDir = startDir;
  while (currentDir !== "/") {
    try {
      const tsconfigPath = join(currentDir, "tsconfig.json");
      await stat(tsconfigPath);
      const content = await readFile(tsconfigPath, "utf-8");
      const tsconfig = JSON.parse(content);
      console.log("  Found tsconfig at:", tsconfigPath);
      console.log("  Paths:", tsconfig.compilerOptions?.paths);
      return {
        baseUrl: tsconfig.compilerOptions?.baseUrl,
        paths: tsconfig.compilerOptions?.paths,
        tsconfigDir: currentDir
      };
    } catch {
      currentDir = dirname(currentDir);
    }
  }
  console.log("  No tsconfig.json found");
  return {};
};
var resolveImportPath = async (importPath, currentDir) => {
  console.log(`
  Resolving import: ${importPath} from ${currentDir}`);
  if (importPath.startsWith("@")) {
    console.log("  Import uses @ prefix, checking tsconfig paths");
    const tsconfig = await loadTsConfig(currentDir);
    if (tsconfig.paths && tsconfig.tsconfigDir) {
      for (const [pattern, [replacement]] of Object.entries(tsconfig.paths)) {
        const patternRegex = new RegExp("^" + pattern.replace("*", "(.*)") + "$");
        const match = importPath.match(patternRegex);
        if (match) {
          console.log(`  Matched pattern ${pattern} -> ${replacement}`);
          const baseDir = tsconfig.baseUrl ? join(tsconfig.tsconfigDir, tsconfig.baseUrl) : tsconfig.tsconfigDir;
          const resolvedPath2 = join(baseDir, replacement.replace("*", match[1]));
          console.log(`  Resolved to: ${resolvedPath2}`);
          return resolveImportPath(resolvedPath2, baseDir);
        }
      }
      console.log("  No matching pattern found in tsconfig paths");
    }
  }
  const resolvedPath = resolve(currentDir, importPath);
  console.log(`  Trying path: ${resolvedPath}`);
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  if (/\.[^/.]+$/.test(importPath)) {
    try {
      await stat(resolvedPath);
      console.log(`  Found exact match: ${resolvedPath}`);
      return resolvedPath;
    } catch {
      console.log(`  Exact match not found: ${resolvedPath}`);
    }
  }
  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    try {
      await stat(pathWithExt);
      console.log(`  Found with extension: ${pathWithExt}`);
      return pathWithExt;
    } catch {
      console.log(`  Not found with extension: ${pathWithExt}`);
    }
  }
  for (const ext of extensions) {
    const indexPath = join(resolvedPath, `index${ext}`);
    try {
      await stat(indexPath);
      console.log(`  Found index file: ${indexPath}`);
      return indexPath;
    } catch {
      console.log(`  Index file not found: ${indexPath}`);
    }
  }
  console.log(`  Could not resolve ${importPath}, returning original resolved path`);
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
var analyzeImports = async (path, maxDepth = 0) => {
  console.log(`
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
      console.log(`  [${currentDepth}] Already processed ${filePath}`);
      return;
    }
    console.log(`
  [${currentDepth}] Processing ${filePath}`);
    processedPaths.add(filePath);
    const node = await processFile(filePath);
    result.content[node.path] = node.content;
    console.log(`  [${currentDepth}] Found imports:`, node.imports);
    const resolvedImports = await Promise.all(
      node.imports.map(
        (importPath) => resolveImportPath(importPath, dirname2(node.path))
      )
    );
    console.log(`  [${currentDepth}] Resolved to:`, resolvedImports);
    result.imports[node.path] = resolvedImports;
    if (currentDepth < maxDepth) {
      console.log(`  [${currentDepth}] Following imports (depth < ${maxDepth})`);
      for (const resolvedPath of resolvedImports) {
        if (resolvedPath) {
          try {
            await stat2(resolvedPath);
            await processFileRecursively(resolvedPath, currentDepth + 1);
          } catch (err) {
            console.log(`  [${currentDepth}] Failed to process ${resolvedPath}:`, err?.message || String(err));
          }
        }
      }
    } else {
      console.log(`  [${currentDepth}] Max depth reached, stopping`);
    }
  }
  const initialFiles = stats.isDirectory() ? await findTsFiles(absolutePath) : [absolutePath];
  await Promise.all(initialFiles.map((file) => processFileRecursively(file, 0)));
  return result;
};
export {
  analyzeImports
};
//# sourceMappingURL=index.js.map