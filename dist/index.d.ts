/**
 * Options for import analysis
 */
interface AnalyzeOptions {
    /** Enable debug logging */
    debug?: boolean;
}
/**
 * Represents the result of analyzing imports in a Next.js project
 */
interface AnalysisResult {
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
declare const analyzeImports: (path: string, maxDepth?: number, options?: AnalyzeOptions) => Promise<AnalysisResult>;

export { analyzeImports };
