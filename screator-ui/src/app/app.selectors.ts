import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AppState } from './app.reducers';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectUndoHistoryExists = createSelector(
    selectAppState,
    (state: AppState) => state.undoHistory.length > 0
);

export const selectUndoHistoryLength = createSelector(
    selectAppState,
    (state: AppState) => state.undoHistory.length
);

export const selectRedoHistoryExists = createSelector(
    selectAppState,
    (state: AppState) => state.redoHistory.length > 0
);

export const selectParagraphs = createSelector(
    selectAppState,
    (state: AppState) => state.paragraphs
);

export const selectScriptEdited = createSelector(
    selectAppState,
    (state: AppState) => state.scriptEdited
);

export const selectAllSlides = createSelector(
    selectAppState,
    (state: AppState) => state.allSlides
);

export const selectAvailableSlides = createSelector(
    selectAppState,
    (state: AppState) => {
        const assigned = new Set<string>();
        state.paragraphs.forEach((paragraph) => {
            (paragraph.selectedSlides ?? []).forEach((selected) => assigned.add(selected.slide_file));
        });
        return state.allSlides.filter((slide) => !assigned.has(slide.slide_file));
    }
);
