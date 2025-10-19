import { createAction, props } from '@ngrx/store';
import { Paragraph, SlideCandidate } from './app.model';

export const selectSlideForParagraph = createAction('[Paragraph] Select Slide', props<{ paragraph: Paragraph, slideCandidate: SlideCandidate }>());
export const rejectSlideForParagraph = createAction('[Paragraph] Reject Slide', props<{ paragraph: Paragraph, slideCandidate: SlideCandidate }>());
export const moveSlideToParagraph = createAction('[Paragraph] Move Slide', props<{ slideCandidate: SlideCandidate, paragraph: Paragraph }>());
export const clearSlideCandidatesForParagraph = createAction('[Paragraph] Clear Slide Candidates', props<{ paragraphId: number }>());
export const scriptLoaded = createAction('[Script] Loaded', props<{ paragraphs: Paragraph[] }>());
export const scriptSaved = createAction('[Script] Saved');
export const undo = createAction('[Commands] Undo');
export const redo = createAction('[Commands] Redo');
export const updateParagraphText = createAction('[Paragraph] Update Text', props<{ paragraphId: number, newText: string }>());
export const splitParagraph = createAction('[Paragraph] Split', props<{ paragraphId: number, updatedText: string, newParagraphText: string }>());