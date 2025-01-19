# DeepContext

A Next.js import analyzer for deep context analysis. This tool helps you analyze and understand import relationships in your Next.js projects.

## Usage

```bash
npx deepcontext <path> [depth]
```

### Parameters

- `path`: Path to a file or directory to analyze
- `depth` (optional): How many levels deep to analyze imports. Defaults to 0 (surface-level imports only)

### Examples

```bash
# Analyze a single file's direct imports
npx deepcontext pages/index.tsx

# Analyze a file with nested imports (depth of 2)
npx deepcontext pages/index.tsx 2

# Analyze all files in a directory
npx deepcontext src/
```

## Requirements

- Node.js >= 18

## Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/deepcontext.git
cd deepcontext
```

2. Install dependencies:
```bash
npm install
```

3. Available scripts:
- `npm run build` - Build the project
- `npm run dev` - Watch mode for development
- `npm run test` - Run tests
- `npm run typecheck` - Run TypeScript type checking

## License

MIT
