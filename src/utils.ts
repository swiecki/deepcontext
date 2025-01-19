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
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([./][^'"]+)['"]/g;
  const imports: string[] = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
};

/**
 * Resolves a relative import path to an absolute file path
 */
export const resolveImportPath = async (importPath: string, currentDir: string): Promise<string> => {
  // Handle index files
  const resolvedPath = resolve(currentDir, importPath);
  const extensions = ['.tsx', '.ts', '.jsx', '.js'];
  
  // If path already has an extension, try it first
  if (/\.[^/.]+$/.test(importPath)) {
    try {
      await stat(resolvedPath);
      return resolvedPath;
    } catch {
      // Continue to try other possibilities
    }
  }
  
  // Try with each extension
  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    try {
      await stat(pathWithExt);
      return pathWithExt;
    } catch {
      continue;
    }
  }
  
  // Try as directory with index files
  for (const ext of extensions) {
    const indexPath = join(resolvedPath, `index${ext}`);
    try {
      await stat(indexPath);
      return indexPath;
    } catch {
      continue;
    }
  }
  
  // If nothing found, return original resolved path
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
