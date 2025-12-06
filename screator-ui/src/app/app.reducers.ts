import { Action, createReducer, on } from '@ngrx/store';
import { clearSlideCandidatesForParagraph, deleteSlideFromLibrary, deletedSlidesLoaded, deselectSlideFromLibrary, redo, rejectSlideForParagraph, scriptDataLoaded, scriptSaved, scriptSelected, selectSlideForParagraph, selectSlideFromLibrary, slidesLoaded, splitParagraph, undo, updateParagraphText } from './app.actions';
import { Paragraph, SlideCandidate } from './app.model';
import { Slide } from './slide.model';

export interface AppState {
    currentScriptId: string | null;
    paragraphs: Paragraph[];
    allSlides: Slide[];
    deletedSlides: string[];
    selectedLibrarySlide: string | null;
    scriptEdited: boolean;
    undoHistory: AppState[];
    redoHistory: AppState[];
}

export const initialState: AppState = {
    currentScriptId: null,
    paragraphs: [],
    allSlides: [],
    deletedSlides: [],
    selectedLibrarySlide: null,
    scriptEdited: false,
    undoHistory: [],
    redoHistory: []
};

function getAvailableSlides(state: AppState): Slide[] {
    const assigned = new Set<string>();
    state.paragraphs.forEach((paragraph) => {
        (paragraph.selectedSlides ?? []).forEach((selected) => assigned.add(selected.slide_file));
    });
    const deleted = new Set(state.deletedSlides);
    return state.allSlides.filter((slide) => !assigned.has(slide.slide_file) && !deleted.has(slide.slide_file));
}

function copyState(state: AppState): AppState {
    return {
        currentScriptId: state.currentScriptId,
        paragraphs: state.paragraphs.map((paragraph) => Paragraph.fromJson(paragraph)),
        allSlides: state.allSlides.map((slide) => ({ ...slide })),
        deletedSlides: [...state.deletedSlides],
        selectedLibrarySlide: state.selectedLibrarySlide,
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

        const nextState: AppState = {
            currentScriptId: scriptId,
            allSlides: state.allSlides,
            deletedSlides: state.deletedSlides,
            selectedLibrarySlide: null,
            undoHistory: [],
            redoHistory: [],
            scriptEdited: false,
            paragraphs: paragraphs.map((paragraph) => Paragraph.fromJson(paragraph))
        };
        // Auto-select first available slide after script data loads (if slides are present)
        const available = getAvailableSlides(nextState);
        return {
            ...nextState,
            selectedLibrarySlide: available.length > 0 ? available[0].slide_file : null
        };
    }),
    on(slidesLoaded, (state, { slides }) => {
        const intermediate: AppState = {
            ...state,
            allSlides: slides.map((slide) => ({ ...slide }))
        };
        // Auto-select first available slide when slide library loads
        const available = getAvailableSlides(intermediate);
        return {
            ...intermediate,
            selectedLibrarySlide: available.length > 0 ? available[0].slide_file : null
        };
    }),
    on(deletedSlidesLoaded, (state, { deletedSlides }) => ({
        ...state,
        deletedSlides: [...deletedSlides]
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

        const tempState: AppState = {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            deletedSlides: state.deletedSlides,
            selectedLibrarySlide: state.selectedLibrarySlide,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: updatedParagraphs.map((item) => Paragraph.fromJson(item))
        };
        // After inserting a slide into a paragraph, auto-select the next available slide in library
        const available = getAvailableSlides(tempState);
        return {
            ...tempState,
            selectedLibrarySlide: available.length > 0 ? available[0].slide_file : null
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
            deletedSlides: state.deletedSlides,
            selectedLibrarySlide: state.selectedLibrarySlide,
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
            deletedSlides: state.deletedSlides,
            selectedLibrarySlide: state.selectedLibrarySlide,
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
            deletedSlides: state.deletedSlides,
            selectedLibrarySlide: state.selectedLibrarySlide,
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
            deletedSlides: state.deletedSlides,
            selectedLibrarySlide: state.selectedLibrarySlide,
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
                deletedSlides: lastState.deletedSlides,
                selectedLibrarySlide: lastState.selectedLibrarySlide,
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
                deletedSlides: lastState.deletedSlides,
                selectedLibrarySlide: lastState.selectedLibrarySlide,
                undoHistory: [...state.undoHistory, copyState(state)],
                redoHistory: state.redoHistory.slice(0, state.redoHistory.length - 1),
                scriptEdited: true,
                paragraphs: lastState.paragraphs.map((paragraph) => Paragraph.fromJson(paragraph))
            };
        } else {
            return state;
        }
    }),
    on(deleteSlideFromLibrary, (state, { slideFile }) => {
        // Don't delete if the slide is already deleted
        if (state.deletedSlides.includes(slideFile)) {
            return state;
        }

        const newDeletedSlides = [...state.deletedSlides, slideFile];
        const shouldDeselectLibrarySlide = state.selectedLibrarySlide === slideFile;

        return {
            currentScriptId: state.currentScriptId,
            allSlides: state.allSlides,
            deletedSlides: newDeletedSlides,
            selectedLibrarySlide: shouldDeselectLibrarySlide ? null : state.selectedLibrarySlide,
            undoHistory: [...state.undoHistory, copyState(state)],
            redoHistory: [],
            scriptEdited: true,
            paragraphs: state.paragraphs.map((item) => Paragraph.fromJson(item))
        };
    }),
    on(selectSlideFromLibrary, (state, { slideFile }) => ({
        ...state,
        selectedLibrarySlide: slideFile
    })),
    on(deselectSlideFromLibrary, (state) => ({
        ...state,
        selectedLibrarySlide: null
    })),
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