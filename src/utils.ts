import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve, relative, dirname } from 'path';

/**
 * Represents a file and its dependencies
 */
export interface FileNode {
  /** Absolute path to the file */
  path: string;
  /** Content of the file */
  content: string;
  /** Local import paths found in the file */
  imports: string[];
}

/**
 * Checks if a file is a TypeScript/JavaScript file
 */
export const isJsOrTsFile = (path: string): boolean => {
  return /\.(js|jsx|ts|tsx)$/.test(path);
};

/**
 * Extracts local imports from TypeScript/JavaScript file content
 */
export const extractImports = (content: string): string[] => {
  // Match both simple and destructured imports, including multi-line
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([@./][^'"]+)['"]/g;
  const imports: string[] = [];
  let match;

  // Handle multi-line content by normalizing newlines
  const normalizedContent = content.replace(/\r\n/g, '\n');

  while ((match = importRegex.exec(normalizedContent)) !== null) {
    console.log('  Found import match:', match[0], '-> path:', match[1]);
    imports.push(match[1]);
  }

  return imports;
};

/**
 * Loads and parses tsconfig.json from the current directory or parent directories
 */
export const loadTsConfig = async (startDir: string): Promise<{ baseUrl?: string; paths?: Record<string, string[]>; tsconfigDir?: string }> => {
  let currentDir = startDir;
  
  while (currentDir !== '/') {
    try {
      const tsconfigPath = join(currentDir, 'tsconfig.json');
      await stat(tsconfigPath);
      const content = await readFile(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(content);
      console.log('  Found tsconfig at:', tsconfigPath);
      console.log('  Paths:', tsconfig.compilerOptions?.paths);
      return {
        baseUrl: tsconfig.compilerOptions?.baseUrl,
        paths: tsconfig.compilerOptions?.paths,
        tsconfigDir: currentDir
      };
    } catch {
      currentDir = dirname(currentDir);
    }
  }
  
  console.log('  No tsconfig.json found');
  return {};
};

/**
 * Resolves a relative import path to an absolute file path
 */
export const resolveImportPath = async (importPath: string, currentDir: string): Promise<string> => {
  console.log(`\n  Resolving import: ${importPath} from ${currentDir}`);
  
  // Handle tsconfig paths for @ imports
  if (importPath.startsWith('@')) {
    console.log('  Import uses @ prefix, checking tsconfig paths');
    const tsconfig = await loadTsConfig(currentDir);
    if (tsconfig.paths && tsconfig.tsconfigDir) {
      for (const [pattern, [replacement]] of Object.entries(tsconfig.paths)) {
        const patternRegex = new RegExp('^' + pattern.replace('*', '(.*)') + '$');
        const match = importPath.match(patternRegex);
        if (match) {
          console.log(`  Matched pattern ${pattern} -> ${replacement}`);
          const baseDir = tsconfig.baseUrl ? join(tsconfig.tsconfigDir, tsconfig.baseUrl) : tsconfig.tsconfigDir;
          const resolvedPath = join(baseDir, replacement.replace('*', match[1]));
          console.log(`  Resolved to: ${resolvedPath}`);
          return resolveImportPath(resolvedPath, baseDir);
        }
      }
      console.log('  No matching pattern found in tsconfig paths');
    }
  }

  // Handle index files
  const resolvedPath = resolve(currentDir, importPath);
  console.log(`  Trying path: ${resolvedPath}`);
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  
  // If path already has an extension, try it first
  if (/\.[^/.]+$/.test(importPath)) {
    try {
      await stat(resolvedPath);
      console.log(`  Found exact match: ${resolvedPath}`);
      return resolvedPath;
    } catch {
      console.log(`  Exact match not found: ${resolvedPath}`);
    }
  }
  
  // Try with each extension
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
  
  // Try as directory with index files
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

/**
 * Reads a file and extracts its imports
 */
export const processFile = async (filePath: string): Promise<FileNode> => {
  const content = await readFile(filePath, 'utf-8');
  const imports = extractImports(content);
  return {
    path: filePath,
    content,
    imports
  };
};

/**
 * Recursively finds all TypeScript/JavaScript files in a directory
 */
export const findTsFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const path = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and other common exclude directories
      if (['node_modules', '.git', 'dist'].includes(entry.name)) {
        continue;
      }
      files.push(...await findTsFiles(path));
    } else if (isJsOrTsFile(path)) {
      files.push(path);
    }
  }
  
  return files;
};
