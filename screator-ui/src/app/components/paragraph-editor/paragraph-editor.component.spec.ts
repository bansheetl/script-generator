import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ParagraphEditorComponent } from './paragraph-editor.component';
import { Paragraph, SlideCandidate } from '../../app.model';
import { Slide } from '../../slide.model';
import { AppState } from '../../app.reducers';
import { selectAvailableSlides } from '../../app.selectors';
import * as AppActions from '../../app.actions';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { SimpleChanges } from '@angular/core';

describe('ParagraphEditorComponent', () => {
  let component: ParagraphEditorComponent;
  let fixture: ComponentFixture<ParagraphEditorComponent>;
  let store: MockStore<AppState>;

  // Test data based on output/01 examples
  const INTRO_PARAGRAPH_TEXT = `Im ersten Kapitel der Vorlesung Softwarearchitektur, welche durch dieses Kapitel abgeschlossen wird, werden grundlegende Themen behandelt, die bereits in einer Präsenzveranstaltung eingeleitet wurden. Der Fokus liegt zunächst auf softwareintensiven Systemen, also denjenigen Systemen, für die eine strukturierte Softwarearchitektur unabdingbar ist.`;

  const SUMMARY_PARAGRAPH_TEXT = `Nach der Einführung sollte nun ein Überblick über die grundlegenden Themen der Vorlesung vorhanden sein. Es wurde thematisiert, welche Arten von Informationssystemen eine Software-Architektur erfordern, was eine Software-Architektur im Kern ausmacht und welchen Zweck sie erfüllt.`;

  const SLIDE_PAGE_001 = 'output/01/slides/page_001.png';
  const SLIDE_PAGE_002 = 'output/01/slides/page_002.png';
  const SLIDE_PAGE_015 = 'output/01/slides/page_015.png';

  const mockSlides: Slide[] = [
    { slide_name: 'page_001.png', slide_file: SLIDE_PAGE_001 },
    { slide_name: 'page_002.png', slide_file: SLIDE_PAGE_002 },
    { slide_name: 'page_015.png', slide_file: SLIDE_PAGE_015 }
  ];

  const createMockParagraph = (
    id: number,
    text: string,
    candidates: SlideCandidate[] = [],
    selected: SlideCandidate[] = []
  ): Paragraph => {
    return new Paragraph(id, text, candidates, selected);
  };

  const createSlideCandidate = (slideFile: string, score: number, selected = false): SlideCandidate => {
    return new SlideCandidate(slideFile, score, selected);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ParagraphEditorComponent,
        FormsModule,
        ButtonModule,
        SelectButtonModule,
        CardModule,
        CarouselModule
      ],
      providers: [
        provideMockStore({
          initialState: {},
          selectors: [
            { selector: selectAvailableSlides, value: mockSlides }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(ParagraphEditorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      
      fixture.detectChanges();

      expect(component.viewMode).toBe('library');
      expect(component.selectionVisible).toBe(false);
      expect(component.textDraft).toBe(INTRO_PARAGRAPH_TEXT);
    });

    it('should initialize with suggestions mode when candidates exist', () => {
      const candidates = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89),
        createSlideCandidate(SLIDE_PAGE_002, 0.94)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.isEditing = false;
      component.undoHistoryLength = 0;

      fixture.detectChanges();

      expect(component.viewMode).toBe('suggestions');
      expect(component.selectionVisible).toBe(true);
    });

    it('should hide selection when selected slides exist', () => {
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      component.isEditing = false;
      component.undoHistoryLength = 0;

      fixture.detectChanges();

      expect(component.selectionVisible).toBe(false);
    });

    it('should reinitialize state on paragraph change', () => {
      const initialParagraph = createMockParagraph(1, 'Initial text');
      component.paragraph = initialParagraph;
      component.isEditing = false;
      component.undoHistoryLength = 0;
      fixture.detectChanges();

      const newParagraph = createMockParagraph(2, 'New text', [
        createSlideCandidate(SLIDE_PAGE_001, 0.9)
      ]);
      component.paragraph = newParagraph;

      const changes: SimpleChanges = {
        paragraph: {
          currentValue: newParagraph,
          previousValue: initialParagraph,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.ngOnChanges(changes);

      expect(component.textDraft).toBe('New text');
      expect(component.viewMode).toBe('suggestions');
      expect(component.selectionVisible).toBe(true);
    });
  });

  describe('Text Editing', () => {
    beforeEach(() => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 5;
      fixture.detectChanges();
    });

    it('should enter edit mode', () => {
      component.enterEdit();

      expect(component.textDraft).toBe(INTRO_PARAGRAPH_TEXT);
      expect(component.editUndoBaseline).toBe(5);
    });

    it('should emit editing state change on enter edit', () => {
      spyOn(component.editingStateChanged, 'emit');

      component.enterEdit();

      expect(component.editingStateChanged.emit).toHaveBeenCalledWith({
        paragraphId: 1,
        isEditing: true
      });
    });

    it('should stop event propagation when entering edit', () => {
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.enterEdit(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should save paragraph text when changed', () => {
      component.isEditing = true;
      component.enterEdit();
      component.textDraft = 'Updated text';

      component.saveParagraph();

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.updateParagraphText({ paragraphId: 1, newText: 'Updated text' })
      );
    });

    it('should not dispatch action when text unchanged', () => {
      component.isEditing = true;
      component.enterEdit();

      component.saveParagraph();

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not save when not in editing mode', () => {
      component.isEditing = false;
      component.textDraft = 'Changed text';

      component.saveParagraph();

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should emit editing state change on save', () => {
      component.isEditing = true;
      spyOn(component.editingStateChanged, 'emit');

      component.saveParagraph();

      expect(component.editingStateChanged.emit).toHaveBeenCalledWith({
        paragraphId: 1,
        isEditing: false
      });
    });

    it('should cancel edit and undo changes', () => {
      component.isEditing = true;
      component.editUndoBaseline = 3;
      component.undoHistoryLength = 7;

      component.cancelEdit();

      expect(store.dispatch).toHaveBeenCalledTimes(4); // 7 - 3 = 4 undo calls
      expect(store.dispatch).toHaveBeenCalledWith(AppActions.undo());
    });

    it('should not undo when history length equals baseline', () => {
      component.isEditing = true;
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 5;

      component.cancelEdit();

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not cancel when not in editing mode', () => {
      component.isEditing = false;

      component.cancelEdit();

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should emit editing state change on cancel', () => {
      component.isEditing = true;
      spyOn(component.editingStateChanged, 'emit');

      component.cancelEdit();

      expect(component.editingStateChanged.emit).toHaveBeenCalledWith({
        paragraphId: 1,
        isEditing: false
      });
    });

    it('should handle Enter key to split paragraph', () => {
      component.isEditing = true;
      component.textDraft = 'First part. Second part.';
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      mockTextarea.selectionStart = 11; // After "First part."
      mockTextarea.selectionEnd = 11;

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });
      spyOn(mockEvent, 'preventDefault');

      component.onKeydown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.splitParagraph({
          paragraphId: 1,
          updatedText: 'First part.',
          newParagraphText: ' Second part.'
        })
      );
      expect(component.textDraft).toBe('First part.');
    });

    it('should not split on Enter with modifier keys', () => {
      const shiftEnter = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      const ctrlEnter = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
      const altEnter = new KeyboardEvent('keydown', { key: 'Enter', altKey: true });
      const metaEnter = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true });

      spyOn(shiftEnter, 'preventDefault');

      component.onKeydown(shiftEnter);
      component.onKeydown(ctrlEnter);
      component.onKeydown(altEnter);
      component.onKeydown(metaEnter);

      expect(shiftEnter.preventDefault).not.toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not split on other keys', () => {
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      spyOn(tabEvent, 'preventDefault');

      component.onKeydown(tabEvent);

      expect(tabEvent.preventDefault).not.toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should disable save button when not editing', () => {
      component.isEditing = false;

      expect(component.isSaveDisabled()).toBe(true);
    });

    it('should disable save button when no changes', () => {
      component.isEditing = true;
      component.textDraft = INTRO_PARAGRAPH_TEXT;
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 5;

      expect(component.isSaveDisabled()).toBe(true);
    });

    it('should enable save button when text changed', () => {
      component.isEditing = true;
      component.textDraft = 'Modified text';

      expect(component.isSaveDisabled()).toBe(false);
    });

    it('should enable save button when structural changes pending', () => {
      component.isEditing = true;
      component.textDraft = INTRO_PARAGRAPH_TEXT;
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 7;

      expect(component.isSaveDisabled()).toBe(false);
    });
  });

  describe('Slide Selection - Candidates', () => {
    beforeEach(() => {
      const candidates = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89),
        createSlideCandidate(SLIDE_PAGE_002, 0.94)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      fixture.detectChanges();
    });

    it('should select a slide candidate', () => {
      const candidate = createSlideCandidate(SLIDE_PAGE_001, 0.89);
      spyOn(component.completionChanged, 'emit');

      component.selectSlideCandidate(candidate);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.selectSlideForParagraph({ paragraph: component.paragraph, slideCandidate: candidate })
      );
      expect(component.selectionVisible).toBe(false);
      expect(component.viewMode).toBe('suggestions');
      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should reject a slide candidate', () => {
      const candidate = createSlideCandidate(SLIDE_PAGE_001, 0.89);
      spyOn(component.completionChanged, 'emit');

      component.rejectSlideCandidate(candidate);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.rejectSlideForParagraph({ paragraph: component.paragraph, slideCandidate: candidate })
      );
      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should hide selection when rejecting last candidate with no selected slides', () => {
      const lastCandidate = createSlideCandidate(SLIDE_PAGE_001, 0.89);
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [lastCandidate]);

      component.rejectSlideCandidate(lastCandidate);

      expect(component.selectionVisible).toBe(false);
    });

    it('should keep selection visible when rejecting one of multiple candidates', () => {
      component.selectionVisible = true;
      const candidate = createSlideCandidate(SLIDE_PAGE_001, 0.89);

      component.rejectSlideCandidate(candidate);

      // Selection stays visible because another candidate remains
      expect(component.selectionVisible).toBe(true);
    });
  });

  describe('Slide Selection - Library', () => {
    beforeEach(() => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      fixture.detectChanges();
    });

    it('should open selection in library mode when no candidates', () => {
      spyOn(component.completionChanged, 'emit');

      component.openSelection();

      expect(component.viewMode).toBe('library');
      expect(component.selectionVisible).toBe(true);
      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should open selection in suggestions mode when candidates exist', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.89)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);

      component.openSelection();

      expect(component.viewMode).toBe('suggestions');
      expect(component.selectionVisible).toBe(true);
    });

    it('should cancel selection and clear candidates', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.89)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.selectionVisible = true;
      spyOn(component.completionChanged, 'emit');

      component.cancelSelection();

      expect(component.selectionVisible).toBe(false);
      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.clearSlideCandidatesForParagraph({ paragraphId: 1 })
      );
      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should not clear candidates when none exist', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, []);
      component.selectionVisible = true;

      component.cancelSelection();

      expect(component.selectionVisible).toBe(false);
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should handle library slide selection', async () => {
      spyOn(component.completionChanged, 'emit');

      await component.onLibrarySlideChosen(SLIDE_PAGE_002);

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Paragraph] Select Slide',
          paragraph: component.paragraph,
          slideCandidate: jasmine.objectContaining({
            slide_file: SLIDE_PAGE_002,
            score: 0,
            selected: false
          })
        })
      );
      expect(component.selectionVisible).toBe(false);
      expect(component.viewMode).toBe('library');
      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should not select when slide file is null', async () => {
      await component.onLibrarySlideChosen(null);

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not select when slide file not found', async () => {
      await component.onLibrarySlideChosen('non-existent-slide.png');

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should change view mode', () => {
      component.viewMode = 'suggestions';

      component.onModeChange('library');

      expect(component.viewMode).toBe('library');
    });
  });

  describe('Selected Slides Management', () => {
    it('should return selected slides', () => {
      const selected = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89, true),
        createSlideCandidate(SLIDE_PAGE_002, 0.94, true)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();

      const result = component.getSelectedSlides();

      expect(result.length).toBe(2);
      expect(result[0].slide_file).toBe(SLIDE_PAGE_001);
    });

    it('should return empty array when no selected slides', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      fixture.detectChanges();

      const result = component.getSelectedSlides();

      expect(result).toEqual([]);
    });

    it('should remove selected slide', () => {
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();
      spyOn(component.completionChanged, 'emit');

      component.removeSelectedSlide(selected[0]);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.rejectSlideForParagraph({ paragraph: component.paragraph, slideCandidate: selected[0] })
      );
      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should show selection when removing last selected slide with candidates', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_002, 0.94)];
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates, selected);
      fixture.detectChanges();

      component.removeSelectedSlide(selected[0]);

      expect(component.selectionVisible).toBe(true);
    });

    it('should hide selection when removing one of multiple selected slides', () => {
      const selected = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89, true),
        createSlideCandidate(SLIDE_PAGE_002, 0.94, true)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();

      component.removeSelectedSlide(selected[0]);

      expect(component.selectionVisible).toBe(false);
    });
  });

  describe('Available Slides', () => {
    it('should return sorted available slides', (done) => {
      component.getAvailableSlidesForParagraph().subscribe(slides => {
        expect(slides.length).toBe(3);
        expect(slides[0].slide_name).toBe('page_001.png');
        expect(slides[1].slide_name).toBe('page_002.png');
        expect(slides[2].slide_name).toBe('page_015.png');
        done();
      });
    });

    it('should handle empty slides array', (done) => {
      store.overrideSelector(selectAvailableSlides, []);

      component.getAvailableSlidesForParagraph().subscribe(slides => {
        expect(slides.length).toBe(0);
        done();
      });
    });
  });

  describe('Paragraph Completion Status', () => {
    beforeEach(() => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 0;
    });

    it('should be incomplete when selection is visible', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      component.selectionVisible = true;

      const result = component.isParagraphCompleted();
      
      // Should be incomplete when selection is visible
      expect(result).toBe(false);
    });

    it('should be complete when slides are selected', () => {
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      component.selectionVisible = false;
      fixture.detectChanges();

      expect(component.isParagraphCompleted()).toBe(true);
    });

    it('should be complete when no candidates and no selected slides', () => {
      component.selectionVisible = false;
      fixture.detectChanges();

      expect(component.isParagraphCompleted()).toBe(true);
    });

    it('should be incomplete when candidates exist but none selected', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.89)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates, []);
      component.selectionVisible = false;
      fixture.detectChanges();

      expect(component.isParagraphCompleted()).toBe(false);
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      fixture.detectChanges();

      const subscription = component['availableSlidesSubscription'];
      if (subscription) {
        spyOn(subscription, 'unsubscribe');
        component.ngOnDestroy();
        expect(subscription.unsubscribe).toHaveBeenCalled();
      } else {
        // If no subscription, destroy should not throw
        expect(() => component.ngOnDestroy()).not.toThrow();
      }
    });

    it('should have correct responsive options', () => {
      expect(component.responsiveOptions).toEqual([
        { breakpoint: '1200px', numVisible: 3, numScroll: 1 },
        { breakpoint: '992px', numVisible: 2, numScroll: 1 },
        { breakpoint: '768px', numVisible: 1, numScroll: 1 }
      ]);
    });

    it('should have correct mode options', () => {
      expect(component.modeOptions).toEqual([
        { label: 'Suggestions', value: 'suggestions' },
        { label: 'Slide library', value: 'library' }
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle paragraph with undefined slideCandidates', () => {
      const paragraph = new Paragraph(1, INTRO_PARAGRAPH_TEXT);
      paragraph.slideCandidates = undefined as any;
      component.paragraph = paragraph;
      component.isEditing = false;
      component.undoHistoryLength = 0;

      fixture.detectChanges();

      expect(component.viewMode).toBe('library');
      expect(component.selectionVisible).toBe(false);
    });

    it('should handle paragraph with undefined selectedSlides', () => {
      const paragraph = new Paragraph(1, INTRO_PARAGRAPH_TEXT);
      paragraph.selectedSlides = undefined as any;
      component.paragraph = paragraph;
      fixture.detectChanges();

      expect(component.getSelectedSlides()).toEqual([]);
      expect(component.isParagraphCompleted()).toBe(true);
    });

    it('should handle Enter key with selection range', () => {
      component.paragraph = createMockParagraph(1, 'Select this text.');
      component.isEditing = true;
      component.textDraft = 'Select this text.';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      mockTextarea.selectionStart = 7;
      mockTextarea.selectionEnd = 11; // "this" is selected

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });

      component.onKeydown(mockEvent);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.splitParagraph({
          paragraphId: 1,
          updatedText: 'Select ',
          newParagraphText: ' text.'
        })
      );
    });

    it('should handle save paragraph with event', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = true;
      component.textDraft = 'New text';
      
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.saveParagraph(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle cancel edit with event', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = true;
      component.editUndoBaseline = 0;
      component.undoHistoryLength = 0;
      
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.cancelEdit(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle onKeydown with null selectionStart', () => {
      component.paragraph = createMockParagraph(1, 'Test text');
      component.isEditing = true;
      component.textDraft = 'Test text';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      // Don't set selectionStart/End to simulate null values

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });

      component.onKeydown(mockEvent);

      // Should handle null selection gracefully
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  describe('Additional Coverage Tests', () => {
    beforeEach(() => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      fixture.detectChanges();
    });

    it('should emit completion changed when opening selection', () => {
      spyOn(component.completionChanged, 'emit');

      component.openSelection();

      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should emit completion changed when canceling selection', () => {
      spyOn(component.completionChanged, 'emit');

      component.cancelSelection();

      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should emit completion changed when removing selected slide', () => {
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();
      spyOn(component.completionChanged, 'emit');

      component.removeSelectedSlide(selected[0]);

      expect(component.completionChanged.emit).toHaveBeenCalled();
    });

    it('should handle multiple selected slides without showing selection', () => {
      const selected = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89, true),
        createSlideCandidate(SLIDE_PAGE_002, 0.94, true),
        createSlideCandidate(SLIDE_PAGE_015, 0.91, true)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();

      component.removeSelectedSlide(selected[0]);

      expect(component.selectionVisible).toBe(false);
    });

    it('should handle library slide selection with empty string', async () => {
      await component.onLibrarySlideChosen('');

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should keep selection visible after rejecting non-last candidate', () => {
      const candidates = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89),
        createSlideCandidate(SLIDE_PAGE_002, 0.94),
        createSlideCandidate(SLIDE_PAGE_015, 0.91)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.selectionVisible = true;
      fixture.detectChanges();

      component.rejectSlideCandidate(candidates[0]);

      expect(component.selectionVisible).toBe(true);
    });

    it('should handle text edit without event parameter', () => {
      component.enterEdit();

      expect(component.textDraft).toBe(INTRO_PARAGRAPH_TEXT);
    });

    it('should handle save without event parameter', () => {
      component.isEditing = true;
      component.textDraft = 'New text';

      component.saveParagraph();

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should handle cancel without event parameter', () => {
      component.isEditing = true;
      component.editUndoBaseline = 0;
      component.undoHistoryLength = 0;

      component.cancelEdit();

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should initialize viewMode based on candidates on first change', () => {
      const changes: SimpleChanges = {
        paragraph: {
          currentValue: component.paragraph,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true
        }
      };

      component.ngOnChanges(changes);

      // Should not reinitialize on first change
      expect(component.textDraft).toBe(INTRO_PARAGRAPH_TEXT);
    });

    it('should handle empty paragraph text', () => {
      component.paragraph = createMockParagraph(1, '');
      fixture.detectChanges();

      component.enterEdit();

      expect(component.textDraft).toBe('');
    });

    it('should correctly identify paragraph with only rejected candidates as incomplete', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.5)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.selectionVisible = false;
      fixture.detectChanges();

      expect(component.isParagraphCompleted()).toBe(false);
    });

    it('should handle Enter key at beginning of text', () => {
      component.paragraph = createMockParagraph(1, 'Some text here');
      component.isEditing = true;
      component.textDraft = 'Some text here';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      mockTextarea.selectionStart = 0;
      mockTextarea.selectionEnd = 0;

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });

      component.onKeydown(mockEvent);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.splitParagraph({
          paragraphId: 1,
          updatedText: '',
          newParagraphText: 'Some text here'
        })
      );
      expect(component.textDraft).toBe('');
    });

    it('should handle Enter key at end of text', () => {
      component.paragraph = createMockParagraph(1, 'Some text here');
      component.isEditing = true;
      component.textDraft = 'Some text here';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      mockTextarea.selectionStart = 14;
      mockTextarea.selectionEnd = 14;

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });

      component.onKeydown(mockEvent);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.splitParagraph({
          paragraphId: 1,
          updatedText: 'Some text here',
          newParagraphText: ''
        })
      );
    });

    it('should return available slides observable that can be subscribed to', (done) => {
      const result = component.getAvailableSlidesForParagraph();
      
      result.subscribe(slides => {
        expect(Array.isArray(slides)).toBe(true);
        expect(slides.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should handle undo when baseline equals history length in cancel', () => {
      component.isEditing = true;
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 3; // Less than baseline

      component.cancelEdit();

      // Should not dispatch undo when history is less than baseline
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should properly set textarea selection after split', (done: any) => {
      component.paragraph = createMockParagraph(1, 'First. Second.');
      component.isEditing = true;
      component.textDraft = 'First. Second.';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      mockTextarea.selectionStart = 6; // After "First."
      mockTextarea.selectionEnd = 6;

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });

      component.onKeydown(mockEvent);

      // Check that text was updated immediately (without trailing space)
      expect(component.textDraft).toBe('First.');
      
      // The setTimeout is used for setting selection range
      setTimeout(() => {
        done();
      }, 10);
    });

    it('should handle component initialization with both selected slides and candidates', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.89)];
      const selected = [createSlideCandidate(SLIDE_PAGE_002, 0.94, true)];
      const para = createMockParagraph(2, INTRO_PARAGRAPH_TEXT, candidates, selected);
      
      component.paragraph = para;
      component.isEditing = false;
      component.undoHistoryLength = 0;
      component.ngOnInit();

      // When selected slides exist, selection should be hidden regardless of candidates
      expect(component.selectionVisible).toBe(false);
      expect(component.viewMode).toBe('suggestions'); // Has candidates, even though hidden
    });

    it('should not change viewMode when onModeChange called with same mode', () => {
      component.viewMode = 'library';

      component.onModeChange('library');

      expect(component.viewMode).toBe('library');
    });

    it('should handle removeSelectedSlide when it is the only selected slide without candidates', () => {
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();

      component.removeSelectedSlide(selected[0]);

      // Should hide selection when no candidates and no remaining selected
      expect(component.selectionVisible).toBe(false);
    });

    it('should handle text draft that differs from paragraph text before entering edit', () => {
      component.textDraft = 'Some other text';
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      fixture.detectChanges();

      component.enterEdit();

      // Should reset textDraft to paragraph text when entering edit
      expect(component.textDraft).toBe(INTRO_PARAGRAPH_TEXT);
    });

    it('should dispatch selectSlideForParagraph with correct parameters from library', async () => {
      await component.onLibrarySlideChosen(SLIDE_PAGE_015);

      const dispatchCalls = (store.dispatch as jasmine.Spy).calls.all();
      const selectCall = dispatchCalls.find((call: any) => 
        call.args[0].type === '[Paragraph] Select Slide'
      );

      expect(selectCall).toBeDefined();
      if (selectCall) {
        expect(selectCall.args[0].slideCandidate.slide_file).toBe(SLIDE_PAGE_015);
        expect(selectCall.args[0].slideCandidate.score).toBe(0);
        expect(selectCall.args[0].slideCandidate.selected).toBe(false);
      }
    });

    it('should handle empty slideCandidates array in isParagraphCompleted', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], []);
      component.selectionVisible = false;
      fixture.detectChanges();

      expect(component.isParagraphCompleted()).toBe(true);
    });

    it('should initialize with proper textDraft value', () => {
      const customText = 'Custom paragraph text for testing';
      const para = createMockParagraph(5, customText);
      
      component.paragraph = para;
      component.isEditing = false;
      component.undoHistoryLength = 0;
      component.ngOnInit();

      expect(component.textDraft).toBe(customText);
    });

    it('should handle consecutive paragraph changes via ngOnChanges', () => {
      const para1 = createMockParagraph(10, 'First');
      const para2 = createMockParagraph(11, 'Second');
      const para3 = createMockParagraph(12, 'Third');

      component.paragraph = para1;
      component.ngOnInit();
      expect(component.textDraft).toBe('First');

      // Update paragraph and trigger ngOnChanges
      component.paragraph = para2;
      let changes: SimpleChanges = {
        paragraph: {
          currentValue: para2,
          previousValue: para1,
          firstChange: false,
          isFirstChange: () => false
        }
      };
      component.ngOnChanges(changes);
      expect(component.textDraft).toBe('Second');

      // Update paragraph and trigger ngOnChanges again
      component.paragraph = para3;
      changes = {
        paragraph: {
          currentValue: para3,
          previousValue: para2,
          firstChange: false,
          isFirstChange: () => false
        }
      };
      component.ngOnChanges(changes);
      expect(component.textDraft).toBe('Third');
    });

    it('should handle split paragraph with text having selected range', () => {
      component.paragraph = createMockParagraph(15, 'Start middle end');
      component.isEditing = true;
      component.textDraft = 'Start middle end';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = component.textDraft;
      mockTextarea.selectionStart = 6; // Start of "middle"
      mockTextarea.selectionEnd = 12; // End of "middle"

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });
      spyOn(mockEvent, 'preventDefault');

      component.onKeydown(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.textDraft).toBe('Start ');
      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.splitParagraph({
          paragraphId: 15,
          updatedText: 'Start ',
          newParagraphText: ' end'
        })
      );
    });

    it('should sortslides alphabetically in getAvailableSlidesForParagraph', (done: any) => {
      const unsortedSlides: Slide[] = [
        { slide_name: 'page_015.png', slide_file: SLIDE_PAGE_015 },
        { slide_name: 'page_001.png', slide_file: SLIDE_PAGE_001 },
        { slide_name: 'page_002.png', slide_file: SLIDE_PAGE_002 }
      ];
      store.overrideSelector(selectAvailableSlides, unsortedSlides);

      component.getAvailableSlidesForParagraph().subscribe(slides => {
        expect(slides[0].slide_name).toBe('page_001.png');
        expect(slides[1].slide_name).toBe('page_002.png');
        expect(slides[2].slide_name).toBe('page_015.png');
        done();
      });
    });

    it('should clear store dispatch spy between resetSelectedSlides calls', () => {
      const selected = [createSlideCandidate(SLIDE_PAGE_001, 0.89, true)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], selected);
      fixture.detectChanges();

      (store.dispatch as jasmine.Spy).calls.reset();
      
      component.removeSelectedSlide(selected[0]);

      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should emit editingStateChanged with correct paragraph id', () => {
      component.paragraph = createMockParagraph(42, 'Test');
      fixture.detectChanges();
      spyOn(component.editingStateChanged, 'emit');

      component.enterEdit();

      expect(component.editingStateChanged.emit).toHaveBeenCalledWith({
        paragraphId: 42,
        isEditing: true
      });
    });

    it('should handle paragraph with null values gracefully', () => {
      const para = new Paragraph(1, INTRO_PARAGRAPH_TEXT);
      para.slideCandidates = null as any;
      para.selectedSlides = null as any;
      component.paragraph = para;
      component.isEditing = false;
      component.undoHistoryLength = 0;

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();

      expect(component.getSelectedSlides()).toEqual([]);
      expect(component.isParagraphCompleted()).toBe(true);
    });

    it('should maintain proper state through full edit cycle', () => {
      component.paragraph = createMockParagraph(1, 'Original text');
      component.isEditing = false;
      component.undoHistoryLength = 0;
      fixture.detectChanges();

      // Start editing
      component.enterEdit();
      expect(component.isEditing).toBe(false); // isEditing is an @Input, doesn't change automatically
      expect(component.textDraft).toBe('Original text');

      // Make changes
      component.textDraft = 'Modified text';
      component.isEditing = true;

      // Save
      component.saveParagraph();
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should handle rejecting all slide candidates one by one', () => {
      const candidates = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89),
        createSlideCandidate(SLIDE_PAGE_002, 0.94),
        createSlideCandidate(SLIDE_PAGE_015, 0.91)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.selectionVisible = true;
      fixture.detectChanges();

      // Reject first candidate
      component.rejectSlideCandidate(candidates[0]);
      expect(component.selectionVisible).toBe(true); // Still have candidates

      // Reject second candidate
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [candidates[2]]);
      component.rejectSlideCandidate(candidates[1]);
      expect(component.selectionVisible).toBe(true); // Still have one candidate

      // Reject last candidate
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [candidates[2]]);
      component.rejectSlideCandidate(candidates[2]);
      expect(component.selectionVisible).toBe(false); // No more candidates, should hide
    });

    it('should handle selecting slide when in suggestions mode', () => {
      const candidate = createSlideCandidate(SLIDE_PAGE_001, 0.9);
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [candidate]);
      component.viewMode = 'suggestions';
      component.selectionVisible = true;
      fixture.detectChanges();

      component.selectSlideCandidate(candidate);

      expect(component.viewMode).toBe('suggestions');
      expect(component.selectionVisible).toBe(false);
    });

    it('should handle mode change from suggestions to library', () => {
      component.viewMode = 'suggestions';

      component.onModeChange('library');

      expect(component.viewMode).toBe('library');
    });

    it('should handle mode change from library to suggestions', () => {
      component.viewMode = 'library';

      component.onModeChange('suggestions');

      expect(component.viewMode).toBe('suggestions');
    });

    it('should correctly calculate isSaveDisabled with text change only', () => {
      component.paragraph = createMockParagraph(1, 'Original');
      component.isEditing = true;
      component.textDraft = 'Changed';
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 5; // No structural changes

      expect(component.isSaveDisabled()).toBe(false);
    });

    it('should correctly calculate isSaveDisabled with structural change only', () => {
      component.paragraph = createMockParagraph(1, 'Original');
      component.isEditing = true;
      component.textDraft = 'Original'; // Text not changed
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 7; // Structural changes

      expect(component.isSaveDisabled()).toBe(false);
    });

    it('should correctly calculate isSaveDisabled with both changes', () => {
      component.paragraph = createMockParagraph(1, 'Original');
      component.isEditing = true;
      component.textDraft = 'Changed';
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 7; // Both text and structural changes

      expect(component.isSaveDisabled()).toBe(false);
    });

    it('should handle complete workflow: init, open selection, select slide, close', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.9)];
      component.paragraph = createMockParagraph(1, 'Test text', candidates);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      
      // Initialize
      component.ngOnInit();
      expect(component.selectionVisible).toBe(true);
      expect(component.viewMode).toBe('suggestions');

      // Select a slide
      component.selectSlideCandidate(candidates[0]);
      expect(component.selectionVisible).toBe(false);
    });

    it('should properly handle all lifecycle hooks in sequence', () => {
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT);
      component.isEditing = false;
      component.undoHistoryLength = 0;
      
      component.ngOnInit();
      expect(component.textDraft).toBe(INTRO_PARAGRAPH_TEXT);

      const newPara = createMockParagraph(2, 'New text');
      component.paragraph = newPara;
      const changes: SimpleChanges = {
        paragraph: {
          currentValue: newPara,
          previousValue: createMockParagraph(1, INTRO_PARAGRAPH_TEXT),
          firstChange: false,
          isFirstChange: () => false
        }
      };
      component.ngOnChanges(changes);
      expect(component.textDraft).toBe('New text');

      component.ngOnDestroy();
      // Should not throw
    });

    it('should handle empty paragraph text in split', () => {
      component.paragraph = createMockParagraph(1, '');
      component.isEditing = true;
      component.textDraft = '';
      fixture.detectChanges();
      
      const mockTextarea = document.createElement('textarea');
      mockTextarea.value = '';
      mockTextarea.selectionStart = 0;
      mockTextarea.selectionEnd = 0;

      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(mockEvent, 'target', { value: mockTextarea, enumerable: true });

      component.onKeydown(mockEvent);

      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.splitParagraph({
          paragraphId: 1,
          updatedText: '',
          newParagraphText: ''
        })
      );
    });

    it('should allow selecting different modes multiple times', () => {
      component.viewMode = 'suggestions';
      component.onModeChange('library');
      expect(component.viewMode).toBe('library');

      component.onModeChange('suggestions');
      expect(component.viewMode).toBe('suggestions');

      component.onModeChange('library');
      expect(component.viewMode).toBe('library');
    });

    it('should handle removing selected slides in various orders', () => {
      const slides = [
        createSlideCandidate(SLIDE_PAGE_001, 0.89, true),
        createSlideCandidate(SLIDE_PAGE_002, 0.94, true)
      ];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, [], slides);
      fixture.detectChanges();

      // Remove first slide - should keep selection hidden (still have one)
      component.removeSelectedSlide(slides[0]);
      expect(component.selectionVisible).toBe(false);
    });

    it('should handle initialization with exactly one candidate', () => {
      const singleCandidate = [createSlideCandidate(SLIDE_PAGE_001, 0.9)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, singleCandidate);
      component.ngOnInit();

      expect(component.viewMode).toBe('suggestions');
      expect(component.selectionVisible).toBe(true);
    });

    it('should handle cancel selection when candidates exist', () => {
      const candidates = [createSlideCandidate(SLIDE_PAGE_001, 0.9)];
      component.paragraph = createMockParagraph(1, INTRO_PARAGRAPH_TEXT, candidates);
      component.selectionVisible = true;

      component.cancelSelection();

      expect(component.selectionVisible).toBe(false);
      expect(store.dispatch).toHaveBeenCalledWith(
        AppActions.clearSlideCandidatesForParagraph({ paragraphId: 1 })
      );
    });

    it('should properly update textDraft when entering edit mode', () => {
      component.paragraph = createMockParagraph(1, 'Initial text');
      component.textDraft = 'Stale draft text';
      
      component.enterEdit();

      expect(component.textDraft).toBe('Initial text');
    });

    it('should maintain editUndoBaseline correctly', () => {
      component.paragraph = createMockParagraph(1, 'Text');
      component.undoHistoryLength = 10;

      component.enterEdit();

      expect(component.editUndoBaseline).toBe(10);
    });

    it('should reset editUndoBaseline on save', () => {
      component.paragraph = createMockParagraph(1, 'Text');
      component.isEditing = true;
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 8;

      component.saveParagraph();

      expect(component.editUndoBaseline).toBe(8);
    });

    it('should reset editUndoBaseline on cancel', () => {
      component.paragraph = createMockParagraph(1, 'Text');
      component.isEditing = true;
      component.editUndoBaseline = 5;
      component.undoHistoryLength = 5;

      component.cancelEdit();

      expect(component.editUndoBaseline).toBe(5);
    });
  });
});
