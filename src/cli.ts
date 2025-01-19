import { resolve } from 'path';
import { analyzeImports } from './analyzer';

async function main() {
  try {
    const args = process.argv.slice(2);
    const debugIndex = args.indexOf('--debug');
    const debug = debugIndex !== -1;
    if (debug) {
      args.splice(debugIndex, 1);
    }

    const [path, depthArg = '0'] = args;

    if (!path) {
      console.error('Please provide a path to analyze');
      console.error('Usage: deepcontext <path> [depth] [--debug]');
      console.error('Example: deepcontext admin-wrapper.tsx 2');
      process.exit(1);
    }

    const depth = parseInt(depthArg, 10);
    if (isNaN(depth) || depth < 0) {
      console.error('Depth must be a non-negative number');
      process.exit(1);
    }

    const absolutePath = resolve(process.cwd(), path);
    const result = await analyzeImports(absolutePath, depth, { debug });

    // Format and print the results
    Object.entries(result.content).forEach(([filepath, content]) => {
      console.log(`\n------- ${filepath} -------`);
      console.log(content);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
