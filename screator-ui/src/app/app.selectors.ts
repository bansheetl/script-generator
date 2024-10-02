import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AppState } from './app.reducers';

export const selectAppState = createFeatureSelector<AppState>('app');

export const selectParagraphs = createSelector(
    selectAppState,
    (state: AppState) => state.paragraphs
);

export const selectScriptEdited = createSelector(
    selectAppState,
    (state: AppState) => state.scriptEdited
);