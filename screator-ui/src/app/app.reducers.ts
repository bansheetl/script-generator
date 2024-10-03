import { Action, createReducer, on } from '@ngrx/store';
import { deleteSlideForParagraph, moveSlideToParagraph, redo, scriptLoaded, scriptSaved, selectSlideForParagraph, undo } from './app.actions';
import { Paragraph, SlideCandidate } from './app.model';

export interface AppState {
    paragraphs: Paragraph[];
    scriptEdited: boolean;
    undoHistory: AppState[];
    redoHistory: AppState[];
}

export const initialState: AppState = {
    paragraphs: [],
    scriptEdited: false,
    undoHistory: [],
    redoHistory: []
};

function copyState(state: AppState): AppState {
    return {
        paragraphs: state.paragraphs.map((p) => ({ ...p, slideCandidates: p.slideCandidates.map((sc) => ({ ...sc })) })),
        scriptEdited: state.scriptEdited,
        undoHistory: state.undoHistory,
        redoHistory: state.redoHistory
    };
}

const _appReducer = createReducer(
    initialState,
    on(selectSlideForParagraph, (state, { paragraph, slideCandidate }) => ({
        undoHistory: [...state.undoHistory, copyState(state)],
        redoHistory: [],
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                return { ...p, slideCandidates: [{ ...slideCandidate, selected: true }] };
            } else {
                return { ...p, slideCandidates: p.slideCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file) };
            }
        })
    })),
    on(deleteSlideForParagraph, (state, { paragraph, slideCandidate }) => ({
        undoHistory: [...state.undoHistory, copyState(state)],
        redoHistory: [],
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                return { ...p, slideCandidates: p.slideCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file) };
            } else {
                return p;
            }
        })
    })),
    on(moveSlideToParagraph, (state, { slideCandidate, paragraph }) => ({
        undoHistory: [...state.undoHistory, copyState(state)],
        redoHistory: [],
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                return { ...p, slideCandidates: [{ ...slideCandidate, selected: true }] };
            } else {
                return { ...p, slideCandidates: p.slideCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file) };
            }
        })
    })),
    on(scriptLoaded, (state, { paragraphs }) => ({
        undoHistory: [],
        redoHistory: [],
        scriptEdited: false,
        paragraphs
    })),
    on(undo, (state) => {
        if (state.undoHistory.length > 0) {
            const lastState = state.undoHistory[state.undoHistory.length - 1];
            return {
                undoHistory: state.undoHistory.slice(0, state.undoHistory.length - 1),
                redoHistory: [...state.redoHistory, copyState(state)],
                scriptEdited: true,
                paragraphs: lastState.paragraphs
            };
        } else {
            return state;
        }
    }),
    on(redo, (state) => {
        if (state.redoHistory.length > 0) {
            const lastState = state.redoHistory[state.redoHistory.length - 1];
            return {
                undoHistory: [...state.undoHistory, copyState(state)],
                redoHistory: state.redoHistory.slice(0, state.redoHistory.length - 1),
                scriptEdited: true,
                paragraphs: lastState.paragraphs
            };
        } else {
            return state;
        }
    }),
    on(scriptSaved, (state) => ({
        ...state,
        undoHistory: [],
        redoHistory: [],
        scriptEdited: false
    }))
);

export function appReducer(state: any, action: any): AppState {
    return _appReducer(state, action);
}