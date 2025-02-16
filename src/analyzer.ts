import { stat } from 'fs/promises';
import { dirname, resolve } from 'path';
import { findTsFiles, processFile, resolveImportPath } from './utils';

/**
 * Options for import analysis
 */
export interface AnalyzeOptions {
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Represents the result of analyzing imports in a Next.js project
 */
export interface AnalysisResult {
  /** Map of file paths to their imported dependencies */
  imports: Record<string, string[]>;
  /** Map of file paths to their content */
  content: Record<string, string>;
}

/**
 * Analyzes imports in a Next.js project starting from the given path
 * @param path - The path to analyze (file or directory)
 * @param maxDepth - Maximum depth to follow imports (0 means only analyze the initial file)
 * @param options - Analysis options
 * @returns Promise resolving to the analysis result
 */
export const analyzeImports = async (
  path: string, 
  maxDepth: number = 0,
  options: AnalyzeOptions = {}
): Promise<AnalysisResult> => {
  const log = (...args: any[]) => {
    if (options.debug) {
      console.log(...args);
    }
  };

  log(`\nAnalyzing ${path} with max depth ${maxDepth}`);
  const absolutePath = resolve(process.cwd(), path);
  const stats = await stat(absolutePath);
  
  // Initialize result maps
  const result: AnalysisResult = {
    imports: {},
    content: {}
  };
  
  const processedPaths = new Set<string>();
  
  async function processFileRecursively(filePath: string, currentDepth: number) {
    if (processedPaths.has(filePath)) {
      log(`  [${currentDepth}] Already processed ${filePath}`);
      return;
    }
    log(`\n  [${currentDepth}] Processing ${filePath}`);
    processedPaths.add(filePath);
    
    const node = await processFile(filePath, options);
    result.content[node.path] = node.content;
    
    log(`  [${currentDepth}] Found imports:`, node.imports);
    const resolvedImports = await Promise.all(
      node.imports.map(importPath => 
        resolveImportPath(importPath, dirname(node.path), options)
      )
    );
    log(`  [${currentDepth}] Resolved to:`, resolvedImports);
    
    result.imports[node.path] = resolvedImports;
    
    // Follow imports if we haven't reached max depth
    if (currentDepth < maxDepth) {
      log(`  [${currentDepth}] Following imports (depth < ${maxDepth})`);
      for (const resolvedPath of resolvedImports) {
        if (resolvedPath) {
          try {
            await stat(resolvedPath);
            await processFileRecursively(resolvedPath, currentDepth + 1);
          } catch (err: any) {
            log(`  [${currentDepth}] Failed to process ${resolvedPath}:`, err?.message || String(err));
          }
        }
      }
    } else {
      log(`  [${currentDepth}] Max depth reached, stopping`);
    }
  }
  
  // Process initial files
  const initialFiles = stats.isDirectory() 
    ? await findTsFiles(absolutePath)
    : [absolutePath];
    
  await Promise.all(initialFiles.map(file => processFileRecursively(file, 0)));
  
  return result;
};
