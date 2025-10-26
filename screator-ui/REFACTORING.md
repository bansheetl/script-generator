# UI Refactoring Summary

## Overview
The Screator UI needs tobe refactored into a component-based architecture with clear separation of concerns, which is described below.

## Component Structure

### 1. AppComponent (`app.component.ts`)
**Responsibility**: Script loading and saving only

**Key Features**:
- Loads available scripts from the file system
- Handles script selection
- Loads script data (paragraphs, slides, slide matches)
- Saves edited scripts to `script_edited.json`
- Merges edited content with original paragraphs
- No direct interaction with paragraphs or slides

**State Management**:
- Dispatches `scriptSelected` when a script is chosen
- Dispatches `scriptDataLoaded` when all data is loaded
- Dispatches `scriptSaved` when saving completes

---

### 2. ScriptEditorComponent (`components/script-editor/`)
**Responsibility**: Manages the overarching script editing workflow

**Key Features**:
- Handles undo/redo operations
- Calculates completion statistics
- Manages available slides (filters out assigned slides)

**State Management**:
- Subscribes to `paragraphs$`, `undoHistoryExists$`, `redoHistoryExists$`
- Dispatches `undo()` and `redo()` actions
- Manages local UI state (view modes, visibility, completion overrides)

**Child Components**:
- `ParagraphEditorComponent` - for editing paragraph text

---

### 3. ParagraphEditorComponent (`components/paragraph-editor/`)
**Responsibility**: Handles paragraph text editing and splitting

**Key Features**:
- Tracks whether the paragraph has the selection UI visible
- Coordinates between paragraph editing and slide selection
- Enter/exit edit mode
- Save changes to paragraph text
- Cancel edits (with undo support)
- Split paragraphs on Enter key
- Tracks edit baseline for undo history

**Inputs**:
- `paragraph`: The paragraph to edit
- `isCompleted`: Whether the paragraph is marked complete

**Outputs**:
- `editingStateChange`: Emits when entering/exiting edit mode
- `cancelWithUndos`: Emits when cancelling with undo count

**State Management**:
- Dispatches `updateParagraphText` when saving
- Dispatches `splitParagraph` when splitting text
- Parent handles undo dispatch based on `cancelWithUndos` event

**Child Components**:
- `SlideSelectionComponent` - for selecting slides

---

### 4. SlideSelectionComponent (`components/slide-selection/`)
**Responsibility**: Handles slide suggestions and library selection

**Key Features**:
- Displays selected slides with remove functionality
- Manages the view mode (suggestions vs library)
- Shows/hides selection UI
- Switches between "Suggestions" and "Slide library" modes
- Approve/reject slide suggestions
- Insert slides from library
- Cancel selection (clears candidates)

**Inputs**:
- `paragraph`: The paragraph being edited
- `isVisible`: Whether selection UI is shown
- `viewMode`: 'suggestions' or 'library'
- `availableSlides`: Slides not yet assigned
- `modeChange`: When user switches between suggestions/library
- `selectionOpened`: When user clicks the + button

**Outputs**:
- `slideSelected`: When a slide is approved
- `slideRejected`: When a slide is rejected/removed
- `selectionCancelled`: When selection UI is cancelled
- `librarySlideChosen`: When a library slide is inserted

**State Management**:
- Dispatches `selectSlideForParagraph` when approving/inserting
- Dispatches `rejectSlideForParagraph` when rejecting/removing
- Dispatches `clearSlideCandidatesForParagraph` when cancelling

---

## State Architecture

### Store Structure

```typescript
AppState {
  currentScriptId: string | null
  scripts: ScriptOption[]
  scriptStates: { 
    [scriptId]: ScriptState 
  }
}

ScriptState {
  paragraphs: Paragraph[]
  scriptEdited: boolean
  undoHistory: ScriptState[]
  redoHistory: ScriptState[]
}
```

### Benefits of Multi-Script State
- Each script maintains its own undo/redo history
- Switching between scripts preserves their state
- Efficient memory usage (only loaded scripts in memory)

### Actions Organization

**App-level** (AppComponent):
- `scriptSelected` - user selects a script
- `scriptDataLoaded` - script data loaded from files
- `scriptSaved` - script saved to disk

**Script Editor** (ScriptEditorComponent):
- `undo` - undo last change
- `redo` - redo last undone change

**Paragraph Editor** (ParagraphEditorComponent):
- `updateParagraphText` - update paragraph text
- `splitParagraph` - split paragraph into two

**Slide Selection** (SlideSelectionComponent):
- `selectSlideForParagraph` - assign slide to paragraph
- `rejectSlideForParagraph` - remove slide from paragraph
- `moveSlideToParagraph` - move slide to different paragraph
- `clearSlideCandidatesForParagraph` - clear all candidates

---

## File Organization

```
screator-ui/src/app/
├── store/
│   ├── app.model.ts         # All interfaces and types
│   ├── app.actions.ts       # All NgRx actions
│   ├── app.reducers.ts      # Root reducer with script state logic
│   └── app.selectors.ts     # Selectors for accessing state
│
├── components/
│   ├── script-editor/
│   │   ├── script-editor.component.ts
│   │   ├── script-editor.component.html
│   │   └── script-editor.component.css
│   │
│   ├── paragraph-editor/
│   │   ├── paragraph-editor.component.ts
│   │   ├── paragraph-editor.component.html
│   │   └── paragraph-editor.component.css
│   │
│   └── slide-selection/
│       ├── slide-selection.component.ts
│       ├── slide-selection.component.html
│       └── slide-selection.component.css
│
├── app.component.ts         # Top-level: script loading/saving
├── app.component.html       # Toolbar + script-editor outlet
├── app.component.css        # Shared styles
└── app.config.ts            # NgRx store configuration
```

