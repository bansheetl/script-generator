import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Observable, Subscription } from 'rxjs';
import { clearSlideCandidatesForParagraph, rejectSlideForParagraph, redo, selectSlideForParagraph, splitParagraph, undo, updateParagraphText } from '../../app.actions';
import { Paragraph, SlideCandidate } from '../../app.model';
import { Slide } from '../../slide.model';
import { AppState } from '../../app.reducers';
import { selectParagraphs, selectRedoHistoryExists, selectUndoHistoryExists, selectUndoHistoryLength } from '../../app.selectors';

@Component({
	selector: 'app-script-editor',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		SelectButtonModule,
		CardModule,
		CarouselModule
	],
	templateUrl: './script-editor.component.html',
	styleUrls: ['./script-editor.component.css']
})
export class ScriptEditorComponent implements OnInit, OnDestroy {
	@Input()
	set allSlides(value: Slide[] | null) {
		this.slideLibrary = (value ?? []).map((slide) => ({ ...slide }));
		this.updateAvailableSlides();
	}

	get allSlides(): Slide[] {
		return this.slideLibrary;
	}

	paragraphs$: Observable<Paragraph[]>;
	undoHistoryExists$: Observable<boolean>;
	redoHistoryExists$: Observable<boolean>;

	modeOptions: ModeOption[] = [
		{ label: 'Suggestions', value: 'suggestions' },
		{ label: 'Slide library', value: 'library' }
	];

	responsiveOptions = [
		{
			breakpoint: '1200px',
			numVisible: 3,
			numScroll: 1
		},
		{
			breakpoint: '992px',
			numVisible: 2,
			numScroll: 1
		},
		{
			breakpoint: '768px',
			numVisible: 1,
			numScroll: 1
		}
	];

	completionStats: CompletionStats = { total: 0, completed: 0, open: 0, percentage: 0 };
	availableSlides: SlideOption[] = [];
	paragraphDrafts: Record<number, string> = {};

	private slideLibrary: Slide[] = [];
	private paragraphViewModes: Record<number, SlideSelectionMode> = {};
	private paragraphSelectionVisible: Record<number, boolean> = {};
	private paragraphsSnapshot: Paragraph[] = [];
	private paragraphsSubscription?: Subscription;
	private undoHistoryLengthSubscription?: Subscription;
	private undoHistoryLength = 0;
	private editingParagraphId: number | null = null;
	private editUndoBaseline = 0;

	constructor(private store: Store<AppState>) {
		this.paragraphs$ = this.store.select(selectParagraphs);
		this.undoHistoryExists$ = this.store.select(selectUndoHistoryExists);
		this.redoHistoryExists$ = this.store.select(selectRedoHistoryExists);
	}

	ngOnInit(): void {
		this.paragraphsSubscription = this.paragraphs$.subscribe((paragraphs) => {
			const normalized = paragraphs ?? [];

			if (normalized.length === 0) {
				this.resetEditingState();
			}

			const previousSnapshot = this.paragraphsSnapshot;
			this.paragraphsSnapshot = normalized;

			if (this.editingParagraphId !== null) {
				const editingParagraph = normalized.find((p) => p.id === this.editingParagraphId);
				if (!editingParagraph) {
					this.exitParagraphEdit(this.editingParagraphId);
				}
			}

			this.cleanupParagraphState(normalized);

			if (previousSnapshot.length === 0 && normalized.length > 0) {
				this.initializeSelectionState(normalized);
			}

			this.updateAvailableSlides();
			this.updateCompletionStats();
		});

		this.undoHistoryLengthSubscription = this.store.select(selectUndoHistoryLength).subscribe((length) => {
			this.undoHistoryLength = length;
		});
	}

	ngOnDestroy(): void {
		this.paragraphsSubscription?.unsubscribe();
		this.undoHistoryLengthSubscription?.unsubscribe();
	}

	undo(): void {
		this.store.dispatch(undo());
	}

	redo(): void {
		this.store.dispatch(redo());
	}

	enterParagraphEdit(paragraph: Paragraph, event?: Event): void {
		event?.stopPropagation();

		if (this.editingParagraphId !== null && this.editingParagraphId !== paragraph.id) {
			const currentlyEditing = this.paragraphsSnapshot.find((p) => p.id === this.editingParagraphId);
			if (currentlyEditing) {
				this.cancelParagraphEdit(currentlyEditing);
			} else {
				this.exitParagraphEdit(this.editingParagraphId);
			}
		}

		this.editingParagraphId = paragraph.id;
		this.paragraphDrafts[paragraph.id] = paragraph.text;
		this.editUndoBaseline = this.undoHistoryLength;
	}

	saveParagraph(paragraph: Paragraph, event?: Event): void {
		event?.stopPropagation();

		if (this.editingParagraphId !== paragraph.id) {
			return;
		}

		const draft = this.paragraphDrafts[paragraph.id];
		if (draft !== undefined && draft !== paragraph.text) {
			this.store.dispatch(updateParagraphText({ paragraphId: paragraph.id, newText: draft }));
		}

		this.exitParagraphEdit(paragraph.id);
	}

	cancelParagraphEdit(paragraph: Paragraph, event?: Event): void {
		event?.stopPropagation();

		if (this.editingParagraphId !== paragraph.id) {
			return;
		}

		const stepsToUndo = Math.max(0, this.undoHistoryLength - this.editUndoBaseline);
		for (let i = 0; i < stepsToUndo; i++) {
			this.store.dispatch(undo());
		}

		if (stepsToUndo > 0) {
			this.undoHistoryLength = Math.max(0, this.undoHistoryLength - stepsToUndo);
		}

		this.exitParagraphEdit(paragraph.id);
	}

	onParagraphKeydown(event: KeyboardEvent, paragraph: Paragraph): void {
		if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
			return;
		}

		event.preventDefault();

		const target = event.target as HTMLTextAreaElement;
		const currentDraft = this.paragraphDrafts[paragraph.id] ?? '';
		const selectionStart = target.selectionStart ?? 0;
		const selectionEnd = target.selectionEnd ?? selectionStart;
		const before = currentDraft.slice(0, selectionStart);
		const after = currentDraft.slice(selectionEnd);

		this.paragraphDrafts[paragraph.id] = before;
		target.value = before;
		setTimeout(() => {
			target.setSelectionRange(before.length, before.length);
		}, 0);

		this.store.dispatch(splitParagraph({ paragraphId: paragraph.id, updatedText: before, newParagraphText: after }));
	}

	isParagraphEditing(paragraph: Paragraph): boolean {
		return this.editingParagraphId === paragraph.id;
	}

	isParagraphSaveDisabled(paragraph: Paragraph): boolean {
		if (!this.isParagraphEditing(paragraph)) {
			return true;
		}

		const draft = this.paragraphDrafts[paragraph.id];
		const textChanged = draft !== undefined && draft !== paragraph.text;
		const structuralChangesPending = this.undoHistoryLength > this.editUndoBaseline;

		return !textChanged && !structuralChangesPending;
	}

	selectSlideCandidate(paragraph: Paragraph, selectedSlide: SlideCandidate): void {
		this.paragraphViewModes[paragraph.id] = 'suggestions';
		this.paragraphSelectionVisible[paragraph.id] = false;
		this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate: selectedSlide }));
		this.updateAvailableSlides();
		this.updateCompletionStats();
	}

	rejectSlideCandidate(paragraph: Paragraph, slideToReject: SlideCandidate): void {
		const remainingCandidates = (paragraph.slideCandidates ?? []).filter((candidate) => candidate.slide_file !== slideToReject.slide_file);
		if (remainingCandidates.length === 0 && this.getSelectedSlides(paragraph).length === 0) {
			this.paragraphSelectionVisible[paragraph.id] = false;
		}
		this.store.dispatch(rejectSlideForParagraph({ paragraph, slideCandidate: slideToReject }));
		this.updateAvailableSlides();
		this.updateCompletionStats();
	}

	onModeChange(paragraphId: number, mode: SlideSelectionMode): void {
		this.paragraphViewModes[paragraphId] = mode;
	}

	openSelection(paragraph: Paragraph): void {
		const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
		this.paragraphViewModes[paragraph.id] = hasCandidates ? 'suggestions' : 'library';
		this.paragraphSelectionVisible[paragraph.id] = true;
		this.updateCompletionStats();
	}

	cancelSelection(paragraph: Paragraph): void {
		this.paragraphSelectionVisible[paragraph.id] = false;
		if ((paragraph.slideCandidates ?? []).length > 0) {
			this.store.dispatch(clearSlideCandidatesForParagraph({ paragraphId: paragraph.id }));
		}
		this.updateCompletionStats();
	}

	getViewMode(paragraph: Paragraph): SlideSelectionMode {
		if (!this.paragraphViewModes[paragraph.id]) {
			const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
			this.paragraphViewModes[paragraph.id] = hasCandidates ? 'suggestions' : 'library';
		}
		return this.paragraphViewModes[paragraph.id];
	}

	getAvailableSlidesForParagraph(): SlideOption[] {
		return this.availableSlides
			.map((slide) => ({ ...slide }))
			.sort((a, b) => a.slide_name.localeCompare(b.slide_name));
	}

	onLibrarySlideChosen(paragraph: Paragraph, slideFile: string | null): void {
		if (!slideFile) {
			return;
		}

		const slide = this.findSlideByFile(slideFile);
		if (!slide) {
			return;
		}

		const slideCandidate: SlideCandidate = this.createCandidateFromSlide(slide);
		this.paragraphViewModes[paragraph.id] = 'library';
		this.paragraphSelectionVisible[paragraph.id] = false;
		this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate }));
		this.updateAvailableSlides();
		this.updateCompletionStats();
	}

	removeSelectedSlide(paragraph: Paragraph, slideCandidate: SlideCandidate): void {
		const remainingSelected = (paragraph.selectedSlides ?? []).filter((selected) => selected.slide_file !== slideCandidate.slide_file);
		if (remainingSelected.length === 0) {
			const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
			this.paragraphSelectionVisible[paragraph.id] = hasCandidates;
		} else {
			this.paragraphSelectionVisible[paragraph.id] = false;
		}
		this.store.dispatch(rejectSlideForParagraph({ paragraph, slideCandidate }));
		this.updateAvailableSlides();
		this.updateCompletionStats();
	}

	getSelectedSlides(paragraph: Paragraph): SlideCandidate[] {
		return paragraph.selectedSlides ?? [];
	}

	isSelectionVisible(paragraph: Paragraph): boolean {
		return this.paragraphSelectionVisible[paragraph.id] ?? false;
	}

	isParagraphCompleted(paragraph: Paragraph): boolean {
		if (this.isSelectionVisible(paragraph)) {
			return false;
		}

		if (this.getSelectedSlides(paragraph).length > 0) {
			return true;
		}

		if ((paragraph.slideCandidates ?? []).length === 0) {
			return true;
		}

		return false;
	}

	trackParagraph(_index: number, paragraph: Paragraph): number {
		return paragraph.id;
	}

	private resetEditingState(): void {
		this.editingParagraphId = null;
		this.paragraphDrafts = {};
		this.editUndoBaseline = this.undoHistoryLength;
	}

	private exitParagraphEdit(paragraphId: number): void {
		delete this.paragraphDrafts[paragraphId];
		if (this.editingParagraphId === paragraphId) {
			this.editingParagraphId = null;
		}
		this.editUndoBaseline = this.undoHistoryLength;
	}

	private cleanupParagraphState(paragraphs: Paragraph[]): void {
		const validIds = new Set(paragraphs.map((paragraph) => paragraph.id));

		Object.keys(this.paragraphSelectionVisible).forEach((key) => {
			const id = Number(key);
			if (!validIds.has(id)) {
				delete this.paragraphSelectionVisible[id];
			}
		});

		Object.keys(this.paragraphViewModes).forEach((key) => {
			const id = Number(key);
			if (!validIds.has(id)) {
				delete this.paragraphViewModes[id];
			}
		});
	}

	private initializeSelectionState(paragraphs: Paragraph[]): void {
		this.paragraphSelectionVisible = {};
		paragraphs.forEach((paragraph) => {
			const hasSelected = (paragraph.selectedSlides ?? []).length > 0;
			const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
			this.paragraphViewModes[paragraph.id] = hasCandidates ? 'suggestions' : 'library';
			this.paragraphSelectionVisible[paragraph.id] = hasSelected ? false : hasCandidates;
		});
	}

	private updateAvailableSlides(): void {
		if (!this.slideLibrary) {
			this.availableSlides = [];
			return;
		}

		const assigned = new Set<string>();
		this.paragraphsSnapshot.forEach((paragraph) => {
			(paragraph.selectedSlides ?? []).forEach((selected) => assigned.add(selected.slide_file));
		});

		this.availableSlides = this.slideLibrary
			.filter((slide) => !assigned.has(slide.slide_file))
			.map((slide) => ({ ...slide }));
	}

	private updateCompletionStats(): void {
		const total = this.paragraphsSnapshot.length;
		const completed = this.paragraphsSnapshot.reduce((count, paragraph) => (
			this.isParagraphCompleted(paragraph) ? count + 1 : count
		), 0);
		const open = total - completed;
		const percentage = total > 0 ? (completed / total) * 100 : 0;
		this.completionStats = { total, completed, open, percentage };
	}

	private findSlideByFile(slideFile: string): Slide | undefined {
		return this.slideLibrary.find((slide) => slide.slide_file === slideFile);
	}

	private createCandidateFromSlide(slide: Slide): SlideCandidate {
		return new SlideCandidate(slide.slide_file, 0, false);
	}
}

interface SlideOption extends Slide {
	disabled?: boolean;
}

type SlideSelectionMode = 'suggestions' | 'library';

interface ModeOption {
	label: string;
	value: SlideSelectionMode;
}

interface CompletionStats {
	total: number;
	completed: number;
	open: number;
	percentage: number;
}
