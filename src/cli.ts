import { resolve } from 'path';
import { analyzeImports } from './analyzer';

async function main() {
  try {
    const [,, path, depthArg = '0'] = process.argv;
    
    if (!path) {
      console.error('Please provide a path to analyze');
      console.error('Usage: deepcontext <path> [depth]');
      console.error('Example: deepcontext admin-wrapper.tsx 2');
      process.exit(1);
    }

    const depth = parseInt(depthArg, 10);
    if (isNaN(depth) || depth < 0) {
      console.error('Depth must be a non-negative number');
      process.exit(1);
    }
    
    const absolutePath = resolve(process.cwd(), path);
    const result = await analyzeImports(absolutePath, depth);
    
    // Format and print the results
    Object.entries(result.content).forEach(([filepath, content]) => {
      console.log(`\n# ${filepath}\n`);
      console.log(content);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
