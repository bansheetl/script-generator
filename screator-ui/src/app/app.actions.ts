import { createAction, props } from '@ngrx/store';
import { Paragraph, SlideCandidate } from './app.model';
import { Slide } from './slide.model';

export const scriptSelected = createAction('[Script] Selected', props<{ scriptId: string }>());
export const scriptDataLoaded = createAction('[Script] Data Loaded', props<{ scriptId: string; paragraphs: Paragraph[] }>());
export const slidesLoaded = createAction('[Slides] Loaded', props<{ slides: Slide[] }>());
export const scriptSaved = createAction('[Script] Saved');
export const selectSlideForParagraph = createAction('[Paragraph] Select Slide', props<{ paragraph: Paragraph, slideCandidate: SlideCandidate }>());
export const rejectSlideForParagraph = createAction('[Paragraph] Reject Slide', props<{ paragraph: Paragraph, slideCandidate: SlideCandidate }>());
export const clearSlideCandidatesForParagraph = createAction('[Paragraph] Clear Slide Candidates', props<{ paragraphId: number }>());
export const undo = createAction('[Commands] Undo');
export const redo = createAction('[Commands] Redo');
export const updateParagraphText = createAction('[Paragraph] Update Text', props<{ paragraphId: number, newText: string }>());
export const splitParagraph = createAction('[Paragraph] Split', props<{ paragraphId: number, updatedText: string, newParagraphText: string }>());
export const deleteSlideFromLibrary = createAction('[Slides] Delete From Library', props<{ slideFile: string }>());
export const deletedSlidesLoaded = createAction('[Slides] Deleted Slides Loaded', props<{ deletedSlides: string[] }>());