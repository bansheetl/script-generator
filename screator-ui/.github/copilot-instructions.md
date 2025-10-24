# GitHub Copilot Instructions for Screator-UI

## Project Overview
This is an Angular 20 + Electron desktop application for editing script-slide matches in an educational content creation workflow. The app provides a visual editor where users can review AI-generated paragraph-slide associations and make manual adjustments.

## Architecture & Key Technologies
- **Frontend**: Angular 20 (standalone components) with PrimeNG UI components
- **State Management**: NgRx store with custom undo/redo functionality
- **Desktop**: Electron with Node.js integration (`nodeIntegration: true`)
- **Build System**: Angular CLI with custom Electron integration
- **UI Library**: PrimeNG (Toolbar, Select, Button, Card, Carousel components)

## Core Data Flow & File Structure
- **Data Input**: Reads `script.json` and `slide_matches.json` from `../output/<scriptId>/` directories
- **State Management**: All user interactions flow through NgRx actions/reducers with manual undo/redo stacks
- **File System Access**: Uses Node.js `fs` module directly (exposed via Electron's `nodeIntegration`)
- **Slide Assets**: References slide images via relative paths with `SLIDE_PREFIX = '../../../../../'`

## Key Components & Models

### Core Data Models (`app.model.ts`)
```typescript
interface Paragraph {
    id: number;
    text: string;
    slideCandidates: SlideCandidate[];
    selectedSlides: SlideCandidate[];
}

interface SlideCandidate {
    slide_file: string;
    score: number;
    selected: boolean;
}
```

### State Management (`app.reducers.ts`)
- **Immutable State**: Always use `copyState()` for deep cloning before mutations
- **Undo/Redo**: Manual implementation with `undoHistory[]` and `redoHistory[]` arrays
- **Actions**: All user interactions (select slide, split paragraph, etc.) create undo snapshots

### Main Component (`app.component.ts`)
- **Script Loading**: Dynamically reads available scripts from filesystem
- **Slide Management**: Handles slide selection, rejection, and paragraph associations
- **File Paths**: Uses `SCRIPT_ROOT_DIR = '../output'` for relative path calculations

## Development Guidelines

### State Management Rules
1. **Always create undo snapshots** before state mutations using `copyState(state)`
2. **Clear redo history** on new actions (undo/redo should be linear)
3. **Deep clone objects** when modifying nested properties (slideCandidates, selectedSlides)
4. **Use selectors** from `app.selectors.ts` for derived state access

### Component Development
1. **Use standalone components** (Angular 20 pattern) with explicit imports
2. **Import PrimeNG modules** explicitly in component decorators
3. **Leverage observables** with `async` pipe for reactive UI updates
4. **Handle array safety** - always provide default empty arrays for `slideCandidates`

### File System Integration
1. **Use relative paths** consistently with established constants (`SLIDE_PREFIX`, `SCRIPT_ROOT_DIR`)
2. **Handle Node.js errors** when reading files (script directories may not exist)
3. **Validate file existence** before attempting operations
4. **Use path.join()** for cross-platform path construction

### UI/UX Patterns
1. **Maintain completion stats** - track paragraph completion for progress indicators
2. **Provide visual feedback** for slide selection/rejection states
3. **Use PrimeNG themes** consistently with `@primeng/themes` integration
4. **Handle empty states** gracefully when no scripts or slides are available

## Common Code Patterns

### Adding New Actions
```typescript
// 1. Define action in app.actions.ts
export const newAction = createAction('[App] New Action', props<{ data: any }>());

// 2. Add reducer case with undo snapshot
on(newAction, (state, { data }) => ({
    undoHistory: [...state.undoHistory, copyState(state)],
    redoHistory: [],
    // ... state changes
}))

// 3. Dispatch from component
this.store.dispatch(newAction({ data }));
```

### Safe Array Operations
```typescript
// Always provide defaults for optional arrays
const candidates = paragraph.slideCandidates ?? [];
const selected = paragraph.selectedSlides ?? [];

// Deep clone when modifying nested arrays
slideCandidates: p.slideCandidates.map(sc => ({ ...sc }))
```

### File System Operations
```typescript
// Use error handling for file operations
try {
    const data = fs.readFileSync(path.join(scriptDir, 'script.json'), 'utf8');
    return JSON.parse(data);
} catch (error) {
    console.error('Failed to read script:', error);
    return null;
}
```

## Build & Development Commands
- `npm run start` - Build Angular app and launch Electron
- `npm run build` - Build production Angular bundle
- `npm run test` - Run Angular unit tests
- `npm run watch` - Build in watch mode for development
- `npm run start_electron` - Launch Electron without rebuilding Angular

## Testing Guidelines
1. **Test NgRx reducers** thoroughly - state immutability is critical
2. **Mock file system** operations in unit tests
3. **Test undo/redo workflows** - ensure state consistency
4. **Validate slide path resolution** in different environments

## Performance Considerations
1. **OnPush change detection** for performance with large slide sets
2. **Lazy load slide images** to avoid memory issues
3. **Debounce text input** for paragraph editing
4. **Limit undo history size** to prevent memory leaks

## Integration Points
- **Input Contract**: Expects `script.json` and `slide_matches.json` in specific formats
- **Output Contract**: Generates `script_edited.json` for downstream processing
- **Python Pipeline**: Coordinates with `script_generator_edited.py` for final output generation
- **Asset Dependencies**: Requires slide PNG files in `slides/` subdirectories