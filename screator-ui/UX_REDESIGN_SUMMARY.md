# UX Redesign: Slide Library Sidebar

## Overview
Fundamentally changed the slide picking UX in screator-ui to provide a persistent slide library sidebar that is always visible to the left of paragraphs.

## Key Changes

### 1. New Slide Library Component
Created a new standalone component (`app-slide-library`) that displays all available slides in a vertical, scrollable sidebar:
- **Location**: `src/app/components/slide-library/`
- **Features**:
  - Persistent vertical layout with its own scrollbar
  - Slide selection via click (single selection at a time)
  - Visual indication of selected slide
  - Delete button per slide (visible on hover)
  - Empty state when no slides available

### 2. State Management Updates
Updated NgRx store to track the selected library slide:
- **New State Property**: `selectedLibrarySlide: string | null` in `AppState`
- **New Actions**:
  - `selectSlideFromLibrary({ slideFile })` - Select a slide from library
  - `deselectSlideFromLibrary()` - Clear library selection
- **New Selector**: `selectSelectedLibrarySlide` - Get currently selected library slide
- **Updated Reducer**: 
  - Handles library selection/deselection
  - Clears selection when deleting the selected slide

### 3. Two-Column Layout
Modified script-editor component to show library and paragraphs side-by-side:
- **Layout**: Flex container with slide library (20rem fixed width) on left, paragraphs (flex-grow) on right
- **Sticky Positioning**: Library sidebar stays in view while scrolling paragraphs
- **Responsive Gap**: 1.5rem spacing between columns

### 4. Paragraph Editor Changes
Removed mode switching, simplified slide interaction:

**Removed**:
- Mode switch toggle between "Suggestions" and "Library"
- Selection visibility state
- Library carousel in paragraph area
- Mode switching logic

**Updated**:
- Plus button now always visible but disabled when no library slide is selected
- Plus button adds the currently selected library slide when enabled
- Suggestions displayed in a dedicated section when available
- Cancel button on suggestions removes all candidates
- Cleaner, more focused UI per paragraph

### 5. CSS Updates
- Two-column flex layout styles in script-editor
- Sticky sidebar positioning with calculated height
- Suggestions section styling (background, border, spacing)
- Disabled button state for plus button
- Removed all mode-switch related styles

## User Experience Flow

### Adding a Slide from Library
1. User clicks a slide in the left sidebar (slide becomes selected/highlighted)
2. Plus button in target paragraph becomes enabled
3. User clicks plus button
4. Selected slide is added to paragraph
5. Library selection is cleared automatically

### Working with Suggestions
1. Suggestions appear automatically when available (in their own section)
2. User can approve or reject individual suggestions
3. Clicking "Cancel" removes all remaining suggestions for that paragraph
4. Suggestions section disappears when all candidates are handled

### Completing a Paragraph
A paragraph is considered complete when:
- It has at least one selected slide, OR
- It has no slide candidates (either none were matched or all were rejected)

## File Changes Summary

### Created Files
- `src/app/components/slide-library/slide-library.component.ts`
- `src/app/components/slide-library/slide-library.component.html`
- `src/app/components/slide-library/slide-library.component.css`

### Modified Files
- `src/app/app.actions.ts` - Added library selection actions
- `src/app/app.selectors.ts` - Added library slide selector
- `src/app/app.reducers.ts` - Added selectedLibrarySlide state and handlers
- `src/app/components/script-editor/script-editor.component.html` - Two-column layout
- `src/app/components/script-editor/script-editor.component.ts` - Import library component
- `src/app/components/script-editor/script-editor.component.css` - Layout styles
- `src/app/components/paragraph-editor/paragraph-editor.component.html` - Removed mode switch, updated UI
- `src/app/components/paragraph-editor/paragraph-editor.component.ts` - Simplified logic, removed mode switching
- `src/app/components/paragraph-editor/paragraph-editor.component.css` - Suggestions section styles

## Benefits
- **Always Visible**: Library is always accessible without mode switching
- **Clearer Intent**: Plus button state clearly indicates when a slide is selected
- **Better Separation**: Library and suggestions are distinct UI elements
- **Simpler Flow**: No mode confusion, more intuitive interaction
- **Better Use of Space**: Sidebar makes efficient use of horizontal screen space
