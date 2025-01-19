import { resolve } from 'path';
import { analyzeImports } from './analyzer';

async function main() {
  try {
    const [,, path] = process.argv;
    
    if (!path) {
      console.error('Please provide a path to analyze');
      console.error('Usage: deepcontext <path>');
      process.exit(1);
    }
    
    const absolutePath = resolve(process.cwd(), path);
    const result = await analyzeImports(absolutePath);
    
    // Pretty print the result
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
