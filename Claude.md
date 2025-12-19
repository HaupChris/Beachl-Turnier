# Claude.md - Beachl-Turnier Development Guidelines

## Project Overview

**Beachl-Turnier** is a client-side React application for managing beach volleyball tournaments. It supports 8 tournament systems and handles 8-32 teams with configurable group phases and knockout brackets.

## Tech Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 4** for styling
- **React Router 7** for navigation
- **React Context + useReducer** for state management
- **localStorage** for persistence (no backend)
- **Vitest** for testing

## Code Standards

### 300-Line File Limit (ENFORCED)

**Maximum 300 lines per file** (excluding blank lines and comments). This is enforced via ESLint and will fail CI/CD.

When a file exceeds this limit:
1. Extract components to separate files
2. Move helper functions to `utils/`
3. Create custom hooks for reusable logic
4. Split types into separate files

### File Structure Conventions

- `src/pages/` - Page components (Home, Configure, Matches, Standings)
- `src/components/` - Reusable UI components
- `src/components/matches/` - Match-related sub-components
- `src/components/standings/` - Standings-related sub-components
- `src/context/` - State management (TournamentContext)
- `src/context/reducerActions/` - Modular reducer handlers
- `src/utils/` - Business logic utilities
- `src/utils/knockout/` - SSVB knockout system
- `src/utils/placementTree/` - Placement tree system
- `src/utils/shortMainRound/` - Multi-bracket system
- `src/utils/scheduling/` - Time calculation utilities
- `src/types/` - TypeScript interfaces
- `src/hooks/` - Custom React hooks

## Key Patterns

### State Management

Use dispatch actions from TournamentContext:
```typescript
dispatch({ type: 'UPDATE_MATCH_SCORE', payload: { ... } });
dispatch({ type: 'COMPLETE_MATCH', payload: { matchId } });
```

### Tournament Systems

8 supported systems:
1. `round-robin` - Every team plays every other
2. `swiss` - Paired by strength
3. `playoff` - Adjacent pairing (1v2, 3v4)
4. `knockout` - Direct elimination
5. `placement-tree` - Full placement tree
6. `group-phase` - Groups + SSVB knockout
7. `beachl-all-placements` - Groups + full placement tree
8. `beachl-short-main-round` - Groups + multi-bracket

### Group Configuration

- Groups can have 3, 4, or 5 teams
- Byes (Freilose) are handled automatically
- Snake-draft seeding balances groups

## Testing

Run tests before committing:
```bash
npm test         # Watch mode
npm run test:run # Single run
npm run lint     # Includes 300-line check
```

## Common Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
npm test         # Run tests
```

## Important Files

- `src/context/TournamentContext.tsx` - Main state provider
- `src/context/tournamentReducer.ts` - State update logic
- `src/types/tournament.ts` - Core TypeScript interfaces
- `src/utils/knockout/generator.ts` - SSVB bracket generation
- `src/utils/groupPhase.ts` - Group creation & seeding
- `src/utils/standings.ts` - Ranking calculation

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Technical architecture
- [TESTING_PLAN.md](./docs/TESTING_PLAN.md) - Test framework plan
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - 300-line policy details
