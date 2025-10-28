import { Action, createReducer, on } from '@ngrx/store';
import { clearSlideCandidatesForParagraph, redo, rejectSlideForParagraph, scriptDataLoaded, scriptSaved, scriptSelected, selectSlideForParagraph, slidesLoaded, splitParagraph, undo, updateParagraphText } from './app.actions';
import { Paragraph, SlideCandidate } from './app.model';
import { Slide } from './slide.model';

export interface AppState {
    currentScriptId: string | null;
    paragraphs: Paragraph[];
    allSlides: Slide[];
    scriptEdited: boolean;
    undoHistory: AppState[];
    redoHistory: AppState[];
}

export const initialState: AppState = {
    currentScriptId: null,
    paragraphs: [],
    allSlides: [],
    scriptEdited: false,
    undoHistory: [],
    redoHistory: []
};

function copyState(state: AppState): AppState {
    return {
        currentScriptId: state.currentScriptId,
        paragraphs: state.paragraphs.map((paragraph) => Paragraph.fromJson(paragraph)),
        allSlides: state.allSlides.map((slide) => ({ ...slide })),
        scriptEdited: state.scriptEdited,
        undoHistory: [],
        redoHistory: []
    };
}

function cloneParagraph(paragraph: Paragraph): Paragraph {
    return Paragraph.fromJson(paragraph);
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
            allSlides: state.allSlides,
            undoHistory: [],
            redoHistory: [],
            scriptEdited: false,
            paragraphs: paragraphs.map((paragraph) => Paragraph.fromJson(paragraph))
        };
    }),
    on(slidesLoaded, (state, { slides }) => ({
        ...state,
        allSlides: slides.map((slide) => ({ ...slide }))
    })),
    on(selectSlideForParagraph, (state, { paragraph, slideCandidate }) => {
        const updatedParagraphs = state.paragraphs.map((p) => {
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
        });

        return {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs.map((item) => Paragraph.fromJson(item))
        };
    }),
    on(rejectSlideForParagraph, (state, { paragraph, slideCandidate }) => {
        const updatedParagraphs = state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                return {
                    ...p,
                    slideCandidates: (p.slideCandidates ?? []).filter((sc) => sc.slide_file !== slideCandidate.slide_file),
                    selectedSlides: (p.selectedSlides ?? []).filter((sc) => sc.slide_file !== slideCandidate.slide_file)
                };
            } else {
                return p;
            }
        });

        return {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs.map((item) => Paragraph.fromJson(item))
        };
    }),
    on(clearSlideCandidatesForParagraph, (state, { paragraphId }) => {
        const targetParagraph = state.paragraphs.find((p) => p.id === paragraphId);
        if (!targetParagraph || (targetParagraph.slideCandidates ?? []).length === 0) {
            return state;
        }

        const updatedParagraphs = state.paragraphs.map((p) => (
            p.id === paragraphId
                ? { ...cloneParagraph(p), slideCandidates: [] }
                : cloneParagraph(p)
        ));

        return {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs.map((item) => Paragraph.fromJson(item))
        };
    }),
    on(updateParagraphText, (state, { paragraphId, newText }) => {
        const targetParagraph = state.paragraphs.find((p) => p.id === paragraphId);
        if (!targetParagraph || targetParagraph.text === newText) {
            return state;
        }

        const updatedParagraphs = state.paragraphs.map((p) => (
            p.id === paragraphId ? { ...cloneParagraph(p), text: newText } : cloneParagraph(p)
        ));

        return {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs.map((item) => Paragraph.fromJson(item))
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
        const newParagraph = new Paragraph(maxId + 1, newParagraphText, [], []);

        const updatedParagraphs = [
            ...paragraphsCopy.slice(0, targetIndex),
            updatedParagraph,
            newParagraph,
            ...paragraphsCopy.slice(targetIndex + 1)
        ];

        return {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs.map((item) => Paragraph.fromJson(item))
        };
    }),
    on(undo, (state) => {
        if (state.undoHistory.length > 0) {
            const lastState = state.undoHistory[state.undoHistory.length - 1];
            return {
                currentScriptId: state.currentScriptId,
                allSlides: lastState.allSlides,
                undoHistory: state.undoHistory.slice(0, state.undoHistory.length - 1),
                redoHistory: [...state.redoHistory, copyState(state)],
                scriptEdited: true,
                paragraphs: lastState.paragraphs.map((paragraph) => Paragraph.fromJson(paragraph))
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
                allSlides: lastState.allSlides,
                undoHistory: [...state.undoHistory, copyState(state)],
                redoHistory: state.redoHistory.slice(0, state.redoHistory.length - 1),
                scriptEdited: true,
                paragraphs: lastState.paragraphs.map((paragraph) => Paragraph.fromJson(paragraph))
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