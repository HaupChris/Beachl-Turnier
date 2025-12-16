# Beachl-Turnier Development Guidelines

## Code Style Rules

### File Length Limit

**Maximum 300 lines per file** (excluding blank lines and comments).

This is enforced by ESLint with the `max-lines` rule as an error. Files exceeding this limit will fail the lint check.

Configuration in `eslint.config.js`:
```javascript
'max-lines': ['error', {
  max: 300,
  skipBlankLines: true,
  skipComments: true,
}],
```

#### How to handle files that exceed the limit:

1. **Extract helper functions** into separate utility files
2. **Split large components** into smaller sub-components
3. **Move types/interfaces** to dedicated type files
4. **Extract constants** to configuration files
5. **Use composition** instead of large monolithic components

## Running Lint

```bash
npm run lint
```

## Project Structure

- `src/components/` - React components
- `src/pages/` - Page components
- `src/utils/` - Utility functions
- `src/context/` - React context and state management
- `src/types/` - TypeScript type definitions
