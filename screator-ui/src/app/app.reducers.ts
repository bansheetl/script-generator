import { Action, createReducer, on } from '@ngrx/store';
import { deleteSlideForParagraph, moveSlideToParagraph, scriptLoaded, scriptSaved, selectSlideForParagraph } from './app.actions';
import { Paragraph, SlideCandidate } from './app.model';

export interface AppState {
    paragraphs: Paragraph[];
    scriptEdited: boolean;
}

export const initialState: AppState = {
    paragraphs: [],
    scriptEdited: false
};

const _appReducer = createReducer(
    initialState,
    on(selectSlideForParagraph, (state, { paragraph, slideCandidate }) => ({
        scriptEdited: true,
        paragraphs: state.paragraphs.map((p) => {
            if (p.id === paragraph.id) {
                return { ...p, slideCandidates: p.slideCandidates.map((sc) => ({ ...sc, selected: sc.slide_file === slideCandidate.slide_file })) };
            } else {
                return { ...p, slideCandidates: p.slideCandidates.filter((sc) => sc.slide_file !== slideCandidate.slide_file) };
            }
        })
    })),
    on(deleteSlideForParagraph, (state, { paragraph, slideCandidate }) => ({
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
        scriptEdited: false,
        paragraphs
    })),
    on(scriptSaved, (state) => ({
        ...state,
        scriptEdited: false
    }))
);

export function appReducer(state: any, action: any): AppState {
    return _appReducer(state, action);
}