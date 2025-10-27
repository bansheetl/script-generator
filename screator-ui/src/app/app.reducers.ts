import { Action, createReducer, on } from '@ngrx/store';
import { clearSlideCandidatesForParagraph, moveSlideToParagraph, redo, rejectSlideForParagraph, scriptDataLoaded, scriptSaved, scriptSelected, selectSlideForParagraph, splitParagraph, undo, updateParagraphText } from './app.actions';
import { Paragraph, SlideCandidate } from './app.model';

export interface AppState {
    currentScriptId: string | null;
    paragraphs: Paragraph[];
    scriptEdited: boolean;
    undoHistory: AppState[];
    redoHistory: AppState[];
}

export const initialState: AppState = {
    currentScriptId: null,
    paragraphs: [],
    scriptEdited: false,
    undoHistory: [],
    redoHistory: []
};

function copyState(state: AppState): AppState {
    return {
        currentScriptId: state.currentScriptId,
        paragraphs: state.paragraphs.map((p) => ({
            ...p,
            slideCandidates: p.slideCandidates.map((sc) => ({ ...sc })),
            selectedSlides: (p.selectedSlides ?? []).map((sc) => ({ ...sc }))
        })),
        scriptEdited: state.scriptEdited,
        undoHistory: [],
        redoHistory: []
    };
}

function cloneParagraph(paragraph: Paragraph): Paragraph {
    return {
        ...paragraph,
        slideCandidates: (paragraph.slideCandidates ?? []).map((candidate) => ({ ...candidate })),
        selectedSlides: (paragraph.selectedSlides ?? []).map((selected) => ({ ...selected }))
    };
}

const _appReducer = createReducer(
    initialState,
    on(scriptSelected, (_state, { scriptId }) => ({
        ...initialState,
        currentScriptId: scriptId
    })),
    on(scriptDataLoaded, (state, { scriptId, paragraphs }) => {
        if (state.currentScriptId !== scriptId) {
            return state;
        }

        return {
            currentScriptId: scriptId,
            undoHistory: [],
            redoHistory: [],
            scriptEdited: false,
            paragraphs: paragraphs.map((paragraph) => ({
                ...paragraph,
                slideCandidates: paragraph.slideCandidates ?? [],
                selectedSlides: paragraph.selectedSlides ?? []
            }))
        };
    }),
    on(selectSlideForParagraph, (state, { paragraph, slideCandidate }) => ({
        currentScriptId: state.currentScriptId,
        undoHistory: [...state.undoHistory, copyState(state)],
        redoHistory: [],
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                const currentCandidates = p.slideCandidates ?? [];
                const currentSelected = p.selectedSlides ?? [];
                const existingSelection = currentSelected.some((sc) => sc.slide_file === slideCandidate.slide_file);
                const updatedSelected = existingSelection
                    ? currentSelected.map((sc) => sc.slide_file === slideCandidate.slide_file ? { ...sc, selected: true } : { ...sc })
                    : [...currentSelected.map((sc) => ({ ...sc })), { ...slideCandidate, selected: true }];
                return {
                    ...p,
                    slideCandidates: currentCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file),
                    selectedSlides: updatedSelected
                };
            } else {
                const currentCandidates = p.slideCandidates ?? [];
                return {
                    ...p,
                    slideCandidates: currentCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file),
                    selectedSlides: (p.selectedSlides ?? []).filter((sc) => sc.slide_file !== slideCandidate.slide_file)
                };
            }
        })
    })),
    on(rejectSlideForParagraph, (state, { paragraph, slideCandidate }) => ({
        currentScriptId: state.currentScriptId,
        undoHistory: [...state.undoHistory, copyState(state)],
        redoHistory: [],
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                return {
                    ...p,
                    slideCandidates: (p.slideCandidates ?? []).filter((sc) => sc.slide_file !== slideCandidate.slide_file),
                    selectedSlides: (p.selectedSlides ?? []).filter((sc) => sc.slide_file !== slideCandidate.slide_file)
                };
            } else {
                return p;
            }
        })
    })),
    on(moveSlideToParagraph, (state, { slideCandidate, paragraph }) => ({
        currentScriptId: state.currentScriptId,
        undoHistory: [...state.undoHistory, copyState(state)],
        redoHistory: [],
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                const currentCandidates = p.slideCandidates ?? [];
                const currentSelected = p.selectedSlides ?? [];
                const existingSelection = currentSelected.some((sc) => sc.slide_file === slideCandidate.slide_file);
                const updatedSelected = existingSelection
                    ? currentSelected.map((sc) => sc.slide_file === slideCandidate.slide_file ? { ...sc, selected: true } : { ...sc })
                    : [...currentSelected.map((sc) => ({ ...sc })), { ...slideCandidate, selected: true }];
                return {
                    ...p,
                    slideCandidates: currentCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file),
                    selectedSlides: updatedSelected
                };
            } else {
                const currentCandidates = p.slideCandidates ?? [];
                return {
                    ...p,
                    slideCandidates: currentCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file),
                    selectedSlides: (p.selectedSlides ?? []).filter((sc) => sc.slide_file !== slideCandidate.slide_file)
                };
            }
        })
    })),
    on(clearSlideCandidatesForParagraph, (state, { paragraphId }) => {
        const targetParagraph = state.paragraphs.find((p) => p.id === paragraphId);
        if (!targetParagraph || (targetParagraph.slideCandidates ?? []).length === 0) {
            return state;
        }

        return {
            currentScriptId: state.currentScriptId,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: state.paragraphs.map((p) => (
                p.id === paragraphId
                    ? { ...cloneParagraph(p), slideCandidates: [] }
                    : cloneParagraph(p)
            ))
        };
    }),
    on(updateParagraphText, (state, { paragraphId, newText }) => {
        const targetParagraph = state.paragraphs.find((p) => p.id === paragraphId);
        if (!targetParagraph || targetParagraph.text === newText) {
            return state;
        }

        return {
            currentScriptId: state.currentScriptId,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: state.paragraphs.map((p) => (
                p.id === paragraphId ? { ...cloneParagraph(p), text: newText } : cloneParagraph(p)
            ))
        };
    }),
    on(splitParagraph, (state, { paragraphId, updatedText, newParagraphText }) => {
        const targetIndex = state.paragraphs.findIndex((p) => p.id === paragraphId);
        if (targetIndex === -1) {
            return state;
        }

        const paragraphsCopy = state.paragraphs.map((paragraph) => cloneParagraph(paragraph));
        const updatedParagraph = { ...paragraphsCopy[targetIndex], text: updatedText };
        const maxId = paragraphsCopy.reduce((acc, paragraph) => Math.max(acc, paragraph.id), 0);
        const newParagraph: Paragraph = {
            id: maxId + 1,
            text: newParagraphText,
            slideCandidates: [],
            selectedSlides: []
        };

        const updatedParagraphs = [
            ...paragraphsCopy.slice(0, targetIndex),
            updatedParagraph,
            newParagraph,
            ...paragraphsCopy.slice(targetIndex + 1)
        ];

        return {
        currentScriptId: state.currentScriptId,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs
        };
    }),
    on(undo, (state) => {
        if (state.undoHistory.length > 0) {
            const lastState = state.undoHistory[state.undoHistory.length - 1];
            return {
                currentScriptId: state.currentScriptId,
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
                currentScriptId: state.currentScriptId,
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