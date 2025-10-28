import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { clearSlideCandidatesForParagraph, rejectSlideForParagraph, selectSlideForParagraph, splitParagraph, undo, updateParagraphText } from '../../app.actions';
import { Paragraph, SlideCandidate } from '../../app.model';
import { Slide } from '../../slide.model';
import { AppState } from '../../app.reducers';
import { selectAvailableSlides } from '../../app.selectors';

type SlideSelectionMode = 'suggestions' | 'library';

interface ModeOption {
	label: string;
	value: SlideSelectionMode;
}

interface SlideOption extends Slide {
	disabled?: boolean;
}

@Component({
	selector: 'app-paragraph-editor',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		SelectButtonModule,
		CardModule,
		CarouselModule
	],
	templateUrl: './paragraph-editor.component.html',
	styleUrls: ['./paragraph-editor.component.css']
})
export class ParagraphEditorComponent implements OnInit, OnChanges, OnDestroy {
	@Input({ required: true }) paragraph!: Paragraph;
	@Input({ required: true }) isEditing: boolean = false;
	@Input({ required: true }) undoHistoryLength: number = 0;
	
	@Output() editingStateChanged = new EventEmitter<{ paragraphId: number; isEditing: boolean }>();
	@Output() completionChanged = new EventEmitter<void>();

	availableSlides$: Observable<Slide[]>;

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

	viewMode: SlideSelectionMode = 'suggestions';
	selectionVisible: boolean = false;
	textDraft: string = '';
	editUndoBaseline: number = 0;

	private availableSlidesSubscription?: Subscription;

	constructor(private store: Store<AppState>) {
		this.availableSlides$ = this.store.select(selectAvailableSlides);
	}

	ngOnInit(): void {
		this.initializeState();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['paragraph'] && !changes['paragraph'].firstChange) {
			this.initializeState();
		}
	}

	ngOnDestroy(): void {
		this.availableSlidesSubscription?.unsubscribe();
	}

	private initializeState(): void {
		const hasSelected = (this.paragraph.selectedSlides ?? []).length > 0;
		const hasCandidates = (this.paragraph.slideCandidates ?? []).length > 0;
		this.viewMode = hasCandidates ? 'suggestions' : 'library';
		this.selectionVisible = hasSelected ? false : hasCandidates;
		this.textDraft = this.paragraph.text;
	}

	// Text editing methods
	enterEdit(event?: Event): void {
		event?.stopPropagation();
		this.textDraft = this.paragraph.text;
		this.editUndoBaseline = this.undoHistoryLength;
		this.editingStateChanged.emit({ paragraphId: this.paragraph.id, isEditing: true });
	}

	saveParagraph(event?: Event): void {
		event?.stopPropagation();

		if (!this.isEditing) {
			return;
		}

		if (this.textDraft !== this.paragraph.text) {
			this.store.dispatch(updateParagraphText({ paragraphId: this.paragraph.id, newText: this.textDraft }));
		}

		this.exitEdit();
	}

	cancelEdit(event?: Event): void {
		event?.stopPropagation();

		if (!this.isEditing) {
			return;
		}

		const stepsToUndo = Math.max(0, this.undoHistoryLength - this.editUndoBaseline);
		for (let i = 0; i < stepsToUndo; i++) {
			this.store.dispatch(undo());
		}

		this.exitEdit();
	}

	onKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
			return;
		}

		event.preventDefault();

		const target = event.target as HTMLTextAreaElement;
		const selectionStart = target.selectionStart ?? 0;
		const selectionEnd = target.selectionEnd ?? selectionStart;
		const before = this.textDraft.slice(0, selectionStart);
		const after = this.textDraft.slice(selectionEnd);

		// Update the draft and textarea immediately
		this.textDraft = before;
		target.value = before;
		setTimeout(() => {
			target.setSelectionRange(before.length, before.length);
		}, 0);

		// Dispatch the split action - this will create a new paragraph
		this.store.dispatch(splitParagraph({ 
			paragraphId: this.paragraph.id, 
			updatedText: before, 
			newParagraphText: after 
		}));
	}

	isSaveDisabled(): boolean {
		if (!this.isEditing) {
			return true;
		}

		const textChanged = this.textDraft !== this.paragraph.text;
		const structuralChangesPending = this.undoHistoryLength > this.editUndoBaseline;

		return !textChanged && !structuralChangesPending;
	}

	private exitEdit(): void {
		this.textDraft = this.paragraph.text;
		this.editUndoBaseline = this.undoHistoryLength;
		this.editingStateChanged.emit({ paragraphId: this.paragraph.id, isEditing: false });
	}

	// Slide selection methods
	selectSlideCandidate(selectedSlide: SlideCandidate): void {
		this.viewMode = 'suggestions';
		this.selectionVisible = false;
		this.store.dispatch(selectSlideForParagraph({ paragraph: this.paragraph, slideCandidate: selectedSlide }));
		this.completionChanged.emit();
	}

	rejectSlideCandidate(slideToReject: SlideCandidate): void {
		const remainingCandidates = (this.paragraph.slideCandidates ?? []).filter(
			(candidate) => candidate.slide_file !== slideToReject.slide_file
		);
		if (remainingCandidates.length === 0 && this.getSelectedSlides().length === 0) {
			this.selectionVisible = false;
		}
		this.store.dispatch(rejectSlideForParagraph({ paragraph: this.paragraph, slideCandidate: slideToReject }));
		this.completionChanged.emit();
	}

	onModeChange(mode: SlideSelectionMode): void {
		this.viewMode = mode;
	}

	openSelection(): void {
		const hasCandidates = (this.paragraph.slideCandidates ?? []).length > 0;
		this.viewMode = hasCandidates ? 'suggestions' : 'library';
		this.selectionVisible = true;
		this.completionChanged.emit();
	}

	cancelSelection(): void {
		this.selectionVisible = false;
		if ((this.paragraph.slideCandidates ?? []).length > 0) {
			this.store.dispatch(clearSlideCandidatesForParagraph({ paragraphId: this.paragraph.id }));
		}
		this.completionChanged.emit();
	}

	async onLibrarySlideChosen(slideFile: string | null): Promise<void> {
		if (!slideFile) {
			return;
		}

		const slide = await this.findSlideByFile(slideFile);
		if (!slide) {
			return;
		}

		const slideCandidate: SlideCandidate = this.createCandidateFromSlide(slide);
		this.viewMode = 'library';
		this.selectionVisible = false;
		this.store.dispatch(selectSlideForParagraph({ paragraph: this.paragraph, slideCandidate }));
		this.completionChanged.emit();
	}

	removeSelectedSlide(slideCandidate: SlideCandidate): void {
		const remainingSelected = (this.paragraph.selectedSlides ?? []).filter(
			(selected) => selected.slide_file !== slideCandidate.slide_file
		);
		if (remainingSelected.length === 0) {
			const hasCandidates = (this.paragraph.slideCandidates ?? []).length > 0;
			this.selectionVisible = hasCandidates;
		} else {
			this.selectionVisible = false;
		}
		this.store.dispatch(rejectSlideForParagraph({ paragraph: this.paragraph, slideCandidate }));
		this.completionChanged.emit();
	}

	// Helper methods
	getSelectedSlides(): SlideCandidate[] {
		return this.paragraph.selectedSlides ?? [];
	}

	getAvailableSlidesForParagraph(): Observable<SlideOption[]> {
		return this.availableSlides$.pipe(
			map((slides) => slides
				.map((slide) => ({ ...slide }))
				.sort((a, b) => a.slide_name.localeCompare(b.slide_name))
			)
		);
	}

	isParagraphCompleted(): boolean {
		if (this.selectionVisible) {
			return false;
		}

		if (this.getSelectedSlides().length > 0) {
			return true;
		}

		if ((this.paragraph.slideCandidates ?? []).length === 0) {
			return true;
		}

		return false;
	}

	private async findSlideByFile(slideFile: string): Promise<Slide | undefined> {
		const slides = await firstValueFrom(this.availableSlides$);
		return slides.find((slide) => slide.slide_file === slideFile);
	}

	private createCandidateFromSlide(slide: Slide): SlideCandidate {
		return new SlideCandidate(slide.slide_file, 0, false);
	}
}
