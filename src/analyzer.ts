import { stat } from 'fs/promises';
import { dirname, resolve } from 'path';
import { FileNode, findTsFiles, processFile, resolveImportPath } from './utils';

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
 * @returns Promise resolving to the analysis result
 */
export const analyzeImports = async (path: string): Promise<AnalysisResult> => {
  const absolutePath = resolve(process.cwd(), path);
  const stats = await stat(absolutePath);
  
  // Initialize result maps
  const result: AnalysisResult = {
    imports: {},
    content: {}
  };
  
  // Process all files
  const filesToProcess = stats.isDirectory() 
    ? await findTsFiles(absolutePath)
    : [absolutePath];
    
  // Process each file and collect their nodes
  const fileNodes: FileNode[] = await Promise.all(
    filesToProcess.map(processFile)
  );
  
  // Build the result maps
  for (const node of fileNodes) {
    // Store the content
    result.content[node.path] = node.content;
    
    // Resolve and store imports
    const resolvedImports = await Promise.all(
      node.imports.map(importPath => 
        resolveImportPath(importPath, dirname(node.path))
      )
    );
    
    result.imports[node.path] = resolvedImports;
  }
  
  return result;
};
