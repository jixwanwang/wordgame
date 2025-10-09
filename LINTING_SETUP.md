# Linting and Formatting Setup

## Tools Installed

### ESLint

- **@eslint/js** - Core ESLint functionality
- **@typescript-eslint/eslint-plugin** - TypeScript-specific linting rules
- **@typescript-eslint/parser** - TypeScript parser for ESLint
- **eslint-plugin-react** - React-specific linting rules
- **eslint-plugin-react-hooks** - Rules for React Hooks
- **eslint-config-prettier** - Disables ESLint rules that conflict with Prettier

### Prettier

- **prettier** - Code formatter

## Configuration Files

### eslint.config.js

Modern flat config format with:

- TypeScript support
- React support (including JSX)
- React Hooks rules
- Integration with Prettier
- Relaxed rules for unused variables (warnings instead of errors)

### .prettierrc

Prettier configuration with:

- Semi-colons: enabled
- Trailing commas: all
- Single quotes: false (double quotes)
- Print width: 100 characters
- Tab width: 2 spaces
- Arrow parens: always

### .prettierignore

Excludes common directories from formatting:

- node_modules
- dist
- build
- .git
- package-lock.json

## Available Scripts

```bash
# Linting
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues

# Formatting
npm run format        # Format all files
npm run format:check  # Check if files are formatted

# Type checking
npm run check         # Run TypeScript type checker
```

## Recommended Workflow

1. **During development:**

   ```bash
   npm run lint:fix    # Fix auto-fixable issues
   npm run format      # Format code
   ```

2. **Before committing:**

   ```bash
   npm run check       # Type check
   npm run lint        # Check for issues
   npm run format:check # Verify formatting
   ```

3. **Quick cleanup:**
   ```bash
   npm run lint:fix && npm run format
   ```

## What Was Fixed

✅ Removed unused imports:

- Removed `GRID_ROWS`, `GRID_COLS` from crossword-grid.tsx
- Removed `Difficulty` from use-game-state.tsx
- Removed `DICTIONARY`, `UNCOMMON_DICTIONARY` from gen_puzzle.ts
- Removed unused variables from game.tsx and other files

✅ Fixed code formatting:

- Consistent indentation (2 spaces)
- Proper line breaks
- Consistent quote style
- Trailing commas

✅ Type safety improvements:

- All TypeScript errors resolved
- Proper type imports
- Correct interface definitions

## ESLint Rules Highlights

- **TypeScript unused vars**: Warns (not errors) - allows `_` prefix for intentionally unused
- **React JSX**: No need to import React in files (React 17+)
- **React Hooks**: Enforces rules of hooks
- **Prop types**: Disabled (using TypeScript instead)

## Notes

- Some warnings remain for React Hook dependencies - these are intentional and safe
- ESLint is configured to work with both .ts/.tsx and .js/.jsx files
- The configuration is optimized for a React + TypeScript project
