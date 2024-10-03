import { createAction, props } from '@ngrx/store';
import { Paragraph, SlideCandidate } from './app.model';

export const selectSlideForParagraph = createAction('[Paragraph] Select Slide', props<{ paragraph: Paragraph, slideCandidate: SlideCandidate }>());
export const deleteSlideForParagraph = createAction('[Paragraph] Delete Slide', props<{ paragraph: Paragraph, slideCandidate: SlideCandidate }>());
export const moveSlideToParagraph = createAction('[Paragraph] Move Slide', props<{ slideCandidate: SlideCandidate, paragraph: Paragraph }>());
export const scriptLoaded = createAction('[Script] Loaded', props<{ paragraphs: Paragraph[] }>());
export const scriptSaved = createAction('[Script] Saved');
export const undo = createAction('[Commands] Undo');
export const redo = createAction('[Commands] Redo');