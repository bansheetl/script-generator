import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ScriptEditorComponent } from './script-editor.component';
import { AppState } from '../../app.reducers';
import { Paragraph, SlideCandidate } from '../../app.model';
import { redo, undo } from '../../app.actions';
import { 
	selectParagraphs, 
	selectRedoHistoryExists, 
	selectUndoHistoryExists,
	selectUndoHistoryLength 
} from '../../app.selectors';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

describe('ScriptEditorComponent', () => {
	let component: ScriptEditorComponent;
	let fixture: ComponentFixture<ScriptEditorComponent>;
	let store: MockStore<AppState>;
	let dispatchSpy: jasmine.Spy;

	// Test data based on real output/01/script.json structure
	const mockSlideCandidate1 = new SlideCandidate(
		'output/01/slides/page_001.png',
		0.8913914,
		false
	);

	const mockSlideCandidate2 = new SlideCandidate(
		'output/01/slides/page_002.png',
		0.8892294,
		false
	);

	const mockSlideCandidate3 = new SlideCandidate(
		'output/01/slides/page_003.png',
		0.8862361,
		true
	);

	// Mock paragraphs based on real data structure
	const mockParagraph1 = new Paragraph(
		1,
		'Kapitel 01: Einführung in die Softwarearchitektur',
		[mockSlideCandidate1, mockSlideCandidate2],
		[]
	);

	const mockParagraph2 = new Paragraph(
		2,
		'Im ersten Kapitel der Vorlesung Softwarearchitektur werden grundlegende Themen behandelt.',
		[mockSlideCandidate3],
		[mockSlideCandidate3]
	);

	const mockParagraph3 = new Paragraph(
		3,
		'In der Softwarearchitektur ist die Zielsetzung eher auf Effizienz, Wartbarkeit und Funktionalität fokussiert.',
		[],
		[]
	);

	const mockParagraph4 = new Paragraph(
		4,
		'Nach der Einführung sollte nun ein Überblick über die grundlegenden Themen der Vorlesung vorhanden sein.',
		[mockSlideCandidate1, mockSlideCandidate2, mockSlideCandidate3],
		[]
	);

	const initialState = {
		paragraphs: [mockParagraph1, mockParagraph2, mockParagraph3],
		undoHistory: [],
		redoHistory: []
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ScriptEditorComponent],
			providers: [
				provideMockStore({ 
					initialState,
					selectors: [
						{ selector: selectParagraphs, value: [mockParagraph1, mockParagraph2, mockParagraph3] },
						{ selector: selectUndoHistoryExists, value: false },
						{ selector: selectRedoHistoryExists, value: false },
						{ selector: selectUndoHistoryLength, value: 0 }
					]
				})
			]
		}).compileComponents();

		store = TestBed.inject(MockStore);
		dispatchSpy = spyOn(store, 'dispatch');

		fixture = TestBed.createComponent(ScriptEditorComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	afterEach(() => {
		fixture.destroy();
	});

	describe('Component Initialization', () => {
		it('should create the component', () => {
			expect(component).toBeTruthy();
		});

		it('should initialize observables from store', () => {
			expect(component.paragraphs$).toBeDefined();
			expect(component.undoHistoryExists$).toBeDefined();
			expect(component.redoHistoryExists$).toBeDefined();
		});

		it('should initialize completion stats with default values', () => {
			// Note: Before fixture.detectChanges() is called, but after constructor
			// The component will update stats once ngOnInit subscribes to paragraphs
			expect(component.completionStats).toBeDefined();
			expect(component.completionStats.total).toBeGreaterThanOrEqual(0);
		});

		it('should set editingParagraphId to null initially', () => {
			expect(component.editingParagraphId).toBeNull();
		});
	});

	describe('ngOnInit', () => {
		it('should subscribe to paragraphs and update completion stats', (done) => {
			component.ngOnInit();
			
			component.paragraphs$.subscribe((paragraphs) => {
				expect(paragraphs.length).toBe(3);
				expect(component.completionStats.total).toBe(3);
				done();
			});
		});

		it('should subscribe to undo history length', (done) => {
			store.overrideSelector(selectUndoHistoryLength, 5);
			store.refreshState();
			
			component.ngOnInit();
			
			component.paragraphs$.subscribe(() => {
				expect(component.undoHistoryLength).toBe(5);
				done();
			});
		});

		it('should clear editingParagraphId if edited paragraph no longer exists', () => {
			component.editingParagraphId = 999;
			store.overrideSelector(selectParagraphs, [mockParagraph1, mockParagraph2]);
			store.refreshState();
			
			component.ngOnInit();
			fixture.detectChanges();
			
			expect(component.editingParagraphId).toBeNull();
		});

		it('should keep editingParagraphId if edited paragraph still exists', () => {
			component.editingParagraphId = 1;
			store.overrideSelector(selectParagraphs, [mockParagraph1, mockParagraph2]);
			store.refreshState();
			
			component.ngOnInit();
			fixture.detectChanges();
			
			expect(component.editingParagraphId).toBe(1);
		});
	});

	describe('ngOnDestroy', () => {
		it('should unsubscribe from paragraphs subscription', () => {
			component.ngOnInit();
			const unsubscribeSpy = spyOn(component['paragraphsSubscription']!, 'unsubscribe');
			
			component.ngOnDestroy();
			
			expect(unsubscribeSpy).toHaveBeenCalled();
		});

		it('should unsubscribe from undo history length subscription', () => {
			component.ngOnInit();
			const unsubscribeSpy = spyOn(component['undoHistoryLengthSubscription']!, 'unsubscribe');
			
			component.ngOnDestroy();
			
			expect(unsubscribeSpy).toHaveBeenCalled();
		});

		it('should handle missing subscriptions gracefully', () => {
			component['paragraphsSubscription'] = undefined;
			component['undoHistoryLengthSubscription'] = undefined;
			
			expect(() => component.ngOnDestroy()).not.toThrow();
		});
	});

	describe('undo', () => {
		it('should dispatch undo action', () => {
			component.undo();
			
			expect(dispatchSpy).toHaveBeenCalledWith(undo());
		});
	});

	describe('redo', () => {
		it('should dispatch redo action', () => {
			component.redo();
			
			expect(dispatchSpy).toHaveBeenCalledWith(redo());
		});
	});

	describe('onEditingStateChanged', () => {
		it('should set editingParagraphId when isEditing is true', () => {
			component.onEditingStateChanged({ paragraphId: 2, isEditing: true });
			
			expect(component.editingParagraphId).toBe(2);
		});

		it('should clear editingParagraphId when isEditing is false for current paragraph', () => {
			component.editingParagraphId = 2;
			
			component.onEditingStateChanged({ paragraphId: 2, isEditing: false });
			
			expect(component.editingParagraphId).toBeNull();
		});

		it('should not clear editingParagraphId when isEditing is false for different paragraph', () => {
			component.editingParagraphId = 1;
			
			component.onEditingStateChanged({ paragraphId: 2, isEditing: false });
			
			expect(component.editingParagraphId).toBe(1);
		});

		it('should switch editing paragraph when starting to edit another paragraph', () => {
			component.editingParagraphId = 1;
			
			component.onEditingStateChanged({ paragraphId: 3, isEditing: true });
			
			expect(component.editingParagraphId).toBe(3);
		});

		it('should handle editing the same paragraph that is already being edited', () => {
			component.editingParagraphId = 2;
			
			component.onEditingStateChanged({ paragraphId: 2, isEditing: true });
			
			expect(component.editingParagraphId).toBe(2);
		});
	});

	describe('trackParagraph', () => {
		it('should return paragraph id', () => {
			const result = component.trackParagraph(0, mockParagraph1);
			
			expect(result).toBe(1);
		});

		it('should return correct id for different paragraphs', () => {
			expect(component.trackParagraph(0, mockParagraph1)).toBe(1);
			expect(component.trackParagraph(1, mockParagraph2)).toBe(2);
			expect(component.trackParagraph(2, mockParagraph3)).toBe(3);
		});
	});

	describe('isParagraphEditing', () => {
		it('should return true if paragraph is being edited', () => {
			component.editingParagraphId = 1;
			
			expect(component.isParagraphEditing(mockParagraph1)).toBe(true);
		});

		it('should return false if paragraph is not being edited', () => {
			component.editingParagraphId = 2;
			
			expect(component.isParagraphEditing(mockParagraph1)).toBe(false);
		});

		it('should return false if no paragraph is being edited', () => {
			component.editingParagraphId = null;
			
			expect(component.isParagraphEditing(mockParagraph1)).toBe(false);
		});
	});

	describe('isParagraphCompleted', () => {
		it('should return true if paragraph has selected slides', () => {
			expect(component.isParagraphCompleted(mockParagraph2)).toBe(true);
		});

		it('should return true if paragraph has no candidates (no matches found)', () => {
			expect(component.isParagraphCompleted(mockParagraph3)).toBe(true);
		});

		it('should return false if paragraph has candidates but none selected', () => {
			expect(component.isParagraphCompleted(mockParagraph1)).toBe(false);
		});

		it('should handle paragraph with undefined selectedSlides', () => {
			const paragraphWithUndefined = new Paragraph(5, 'Test text', [mockSlideCandidate1], undefined as any);
			
			expect(component.isParagraphCompleted(paragraphWithUndefined)).toBe(false);
		});

		it('should handle paragraph with undefined slideCandidates', () => {
			const paragraphWithUndefined = new Paragraph(6, 'Test text', undefined as any, []);
			
			expect(component.isParagraphCompleted(paragraphWithUndefined)).toBe(true);
		});

		it('should return true for paragraph with multiple selected slides', () => {
			const paragraphWithMultiple = new Paragraph(
				7, 
				'Test', 
				[mockSlideCandidate1, mockSlideCandidate2], 
				[mockSlideCandidate1, mockSlideCandidate2]
			);
			
			expect(component.isParagraphCompleted(paragraphWithMultiple)).toBe(true);
		});
	});

	describe('updateCompletionStats', () => {
		it('should calculate correct stats for mixed completion states', () => {
			const paragraphs = [mockParagraph1, mockParagraph2, mockParagraph3, mockParagraph4];
			component['updateCompletionStats'](paragraphs);
			
			expect(component.completionStats.total).toBe(4);
			expect(component.completionStats.completed).toBe(2); // mockParagraph2 and mockParagraph3
			expect(component.completionStats.open).toBe(2);
			expect(component.completionStats.percentage).toBe(50);
		});

		it('should handle all paragraphs completed', () => {
			const allCompleted = [mockParagraph2, mockParagraph3];
			component['updateCompletionStats'](allCompleted);
			
			expect(component.completionStats.completed).toBe(2);
			expect(component.completionStats.open).toBe(0);
			expect(component.completionStats.percentage).toBe(100);
		});

		it('should handle no paragraphs completed', () => {
			const noneCompleted = [mockParagraph1, mockParagraph4];
			component['updateCompletionStats'](noneCompleted);
			
			expect(component.completionStats.completed).toBe(0);
			expect(component.completionStats.open).toBe(2);
			expect(component.completionStats.percentage).toBe(0);
		});

		it('should handle empty paragraph list', () => {
			component['updateCompletionStats']([]);
			
			expect(component.completionStats.total).toBe(0);
			expect(component.completionStats.completed).toBe(0);
			expect(component.completionStats.open).toBe(0);
			expect(component.completionStats.percentage).toBe(0);
		});

		it('should update stats when paragraphs change', (done) => {
			store.overrideSelector(selectParagraphs, [mockParagraph1, mockParagraph2]);
			store.refreshState();
			
			component.ngOnInit();
			
			setTimeout(() => {
				expect(component.completionStats.total).toBe(2);
				expect(component.completionStats.completed).toBe(1);
				expect(component.completionStats.percentage).toBe(50);
				done();
			}, 100);
		});
	});

	describe('Template Integration', () => {
		it('should render undo button disabled when no undo history', () => {
			store.overrideSelector(selectUndoHistoryExists, false);
			store.refreshState();
			fixture.detectChanges();
			
			const undoButton = fixture.debugElement.query(By.css('.pi-undo')).parent;
			expect(undoButton?.nativeElement.disabled).toBe(true);
		});

		it('should render undo button enabled when undo history exists', () => {
			store.overrideSelector(selectUndoHistoryExists, true);
			store.refreshState();
			fixture.detectChanges();
			
			const undoButton = fixture.debugElement.query(By.css('.pi-undo')).parent;
			expect(undoButton?.nativeElement.disabled).toBe(false);
		});

		it('should render redo button disabled when no redo history', () => {
			store.overrideSelector(selectRedoHistoryExists, false);
			store.refreshState();
			fixture.detectChanges();
			
			const redoButton = fixture.debugElement.query(By.css('.pi-redo')).parent;
			expect(redoButton?.nativeElement.disabled).toBe(true);
		});

		it('should render redo button enabled when redo history exists', () => {
			store.overrideSelector(selectRedoHistoryExists, true);
			store.refreshState();
			fixture.detectChanges();
			
			const redoButton = fixture.debugElement.query(By.css('.pi-redo')).parent;
			expect(redoButton?.nativeElement.disabled).toBe(false);
		});

		it('should call undo when undo button is clicked', () => {
			store.overrideSelector(selectUndoHistoryExists, true);
			store.refreshState();
			fixture.detectChanges();
			
			const undoButton = fixture.debugElement.query(By.css('.pi-undo')).parent;
			undoButton?.nativeElement.click();
			
			expect(dispatchSpy).toHaveBeenCalledWith(undo());
		});

		it('should call redo when redo button is clicked', () => {
			store.overrideSelector(selectRedoHistoryExists, true);
			store.refreshState();
			fixture.detectChanges();
			
			const redoButton = fixture.debugElement.query(By.css('.pi-redo')).parent;
			redoButton?.nativeElement.click();
			
			expect(dispatchSpy).toHaveBeenCalledWith(redo());
		});

		it('should render paragraph editors for each paragraph', () => {
			fixture.detectChanges();
			
			const paragraphEditors = fixture.debugElement.queryAll(By.css('app-paragraph-editor'));
			expect(paragraphEditors.length).toBe(3);
		});

		it('should show empty state when no paragraphs', () => {
			store.overrideSelector(selectParagraphs, []);
			store.refreshState();
			fixture.detectChanges();
			
			const emptyState = fixture.debugElement.query(By.css('.empty-state'));
			expect(emptyState).toBeTruthy();
			expect(emptyState.nativeElement.textContent).toContain('Select a script to start editing');
		});

		it('should not show empty state when paragraphs exist', () => {
			fixture.detectChanges();
			
			const emptyState = fixture.debugElement.query(By.css('.empty-state'));
			expect(emptyState).toBeFalsy();
		});

		it('should show progress overlay when paragraphs exist', () => {
			component.completionStats = { total: 3, completed: 1, open: 2, percentage: 33.33 };
			fixture.detectChanges();
			
			const progressOverlay = fixture.debugElement.query(By.css('.paragraph-progress-overlay'));
			expect(progressOverlay).toBeTruthy();
		});

		it('should not show progress overlay when no paragraphs', () => {
			component.completionStats = { total: 0, completed: 0, open: 0, percentage: 0 };
			fixture.detectChanges();
			
			const progressOverlay = fixture.debugElement.query(By.css('.paragraph-progress-overlay'));
			expect(progressOverlay).toBeFalsy();
		});

		it('should display correct completion stats in progress overlay', () => {
			component.completionStats = { total: 10, completed: 7, open: 3, percentage: 70 };
			fixture.detectChanges();
			
			const progressLabel = fixture.debugElement.query(By.css('.progress-label'));
			expect(progressLabel.nativeElement.textContent).toContain('7 / 10 completed');
			expect(progressLabel.nativeElement.textContent).toContain('3 open');
		});

		it('should set correct progress bar width based on percentage', () => {
			component.completionStats = { total: 4, completed: 3, open: 1, percentage: 75 };
			fixture.detectChanges();
			
			const progressFill = fixture.debugElement.query(By.css('.progress-fill'));
			expect(progressFill.nativeElement.style.width).toBe('75%');
		});
	});

	describe('Edge Cases', () => {
		it('should handle null paragraphs array gracefully', () => {
			store.overrideSelector(selectParagraphs, null as any);
			store.refreshState();
			
			component.ngOnInit();
			fixture.detectChanges();
			
			expect(component.completionStats.total).toBe(0);
		});

		it('should handle undefined paragraphs array gracefully', () => {
			store.overrideSelector(selectParagraphs, undefined as any);
			store.refreshState();
			
			component.ngOnInit();
			fixture.detectChanges();
			
			expect(component.completionStats.total).toBe(0);
		});

		it('should handle paragraph with id 0', () => {
			const paragraphZero = new Paragraph(0, 'Test', [], []);
			
			expect(component.trackParagraph(0, paragraphZero)).toBe(0);
			expect(component.isParagraphCompleted(paragraphZero)).toBe(true);
		});

		it('should correctly handle percentage calculation with one paragraph', () => {
			component['updateCompletionStats']([mockParagraph2]);
			
			expect(component.completionStats.percentage).toBe(100);
		});

		it('should handle multiple rapid editing state changes', () => {
			component.onEditingStateChanged({ paragraphId: 1, isEditing: true });
			component.onEditingStateChanged({ paragraphId: 2, isEditing: true });
			component.onEditingStateChanged({ paragraphId: 3, isEditing: true });
			
			expect(component.editingParagraphId).toBe(3);
		});
	});
});
