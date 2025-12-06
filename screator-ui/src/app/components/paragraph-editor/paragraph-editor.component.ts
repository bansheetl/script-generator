import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { clearSlideCandidatesForParagraph, rejectSlideForParagraph, selectSlideForParagraph, splitParagraph, undo, updateParagraphText } from '../../app.actions';
import { Paragraph, SlideCandidate } from '../../app.model';
import { Slide } from '../../slide.model';
import { AppState } from '../../app.reducers';
import { selectAvailableSlides, selectSelectedLibrarySlide } from '../../app.selectors';

@Component({
	selector: 'app-paragraph-editor',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
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
	selectedLibrarySlide$: Observable<string | null>;

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

	textDraft: string = '';
	editUndoBaseline: number = 0;

	private availableSlidesSubscription?: Subscription;

	constructor(private store: Store<AppState>) {
		this.availableSlides$ = this.store.select(selectAvailableSlides);
		this.selectedLibrarySlide$ = this.store.select(selectSelectedLibrarySlide);
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
		this.store.dispatch(selectSlideForParagraph({ paragraph: this.paragraph, slideCandidate: selectedSlide }));
		this.completionChanged.emit();
	}

	rejectSlideCandidate(slideToReject: SlideCandidate): void {
		this.store.dispatch(rejectSlideForParagraph({ paragraph: this.paragraph, slideCandidate: slideToReject }));
		this.completionChanged.emit();
	}

	cancelSuggestions(): void {
		this.store.dispatch(clearSlideCandidatesForParagraph({ paragraphId: this.paragraph.id }));
		this.completionChanged.emit();
	}

	async addSlideFromLibrary(): Promise<void> {
		const slideFile = await firstValueFrom(this.selectedLibrarySlide$);
		if (!slideFile) {
			return;
		}

		const slide = await this.findSlideByFile(slideFile);
		if (!slide) {
			return;
		}

		const slideCandidate: SlideCandidate = this.createCandidateFromSlide(slide);
		this.store.dispatch(selectSlideForParagraph({ paragraph: this.paragraph, slideCandidate }));
		this.completionChanged.emit();
	}

	removeSelectedSlide(slideCandidate: SlideCandidate): void {
		this.store.dispatch(rejectSlideForParagraph({ paragraph: this.paragraph, slideCandidate }));
		this.completionChanged.emit();
	}

	// Helper methods
	getSelectedSlides(): SlideCandidate[] {
		return this.paragraph.selectedSlides ?? [];
	}

	isParagraphCompleted(): boolean {
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
