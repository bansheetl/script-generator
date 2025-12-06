import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { Observable, Subscription } from 'rxjs';
import { redo, undo } from '../../app.actions';
import { Paragraph } from '../../app.model';
import { AppState } from '../../app.reducers';
import { selectParagraphs, selectRedoHistoryExists, selectUndoHistoryExists, selectUndoHistoryLength } from '../../app.selectors';
import { ParagraphEditorComponent } from '../paragraph-editor/paragraph-editor.component';
import { SlideLibraryComponent } from '../slide-library/slide-library.component';

@Component({
	selector: 'app-script-editor',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		ParagraphEditorComponent,
		SlideLibraryComponent
	],
	templateUrl: './script-editor.component.html',
	styleUrls: ['./script-editor.component.css']
})
export class ScriptEditorComponent implements OnInit, OnDestroy {
	paragraphs$: Observable<Paragraph[]>;
	undoHistoryExists$: Observable<boolean>;
	redoHistoryExists$: Observable<boolean>;

	completionStats: CompletionStats = { total: 0, completed: 0, open: 0, percentage: 0 };

	private paragraphsSubscription?: Subscription;
	private undoHistoryLengthSubscription?: Subscription;
	undoHistoryLength = 0;
	editingParagraphId: number | null = null;

	constructor(private store: Store<AppState>) {
		this.paragraphs$ = this.store.select(selectParagraphs);
		this.undoHistoryExists$ = this.store.select(selectUndoHistoryExists);
		this.redoHistoryExists$ = this.store.select(selectRedoHistoryExists);
	}

	ngOnInit(): void {
		this.paragraphsSubscription = this.paragraphs$.subscribe((paragraphs) => {
			const normalized = paragraphs ?? [];

			// If a paragraph being edited no longer exists, clear the editing state
			if (this.editingParagraphId !== null) {
				const editingParagraph = normalized.find((p) => p.id === this.editingParagraphId);
				if (!editingParagraph) {
					this.editingParagraphId = null;
				}
			}

			this.updateCompletionStats(normalized);
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

	onEditingStateChanged(event: { paragraphId: number; isEditing: boolean }): void {
		if (event.isEditing) {
			// If another paragraph is being edited, close it first
			if (this.editingParagraphId !== null && this.editingParagraphId !== event.paragraphId) {
				// The child component will handle its own cleanup
			}
			this.editingParagraphId = event.paragraphId;
		} else {
			if (this.editingParagraphId === event.paragraphId) {
				this.editingParagraphId = null;
			}
		}
	}

	trackParagraph(_index: number, paragraph: Paragraph): number {
		return paragraph.id;
	}

	isParagraphEditing(paragraph: Paragraph): boolean {
		return this.editingParagraphId === paragraph.id;
	}

	isParagraphCompleted(paragraph: Paragraph): boolean {
		const selectedSlides = paragraph.selectedSlides ?? [];
		const slideCandidates = paragraph.slideCandidates ?? [];
		
		// If there are selected slides, it's completed
		if (selectedSlides.length > 0) {
			return true;
		}

		// If there are no candidates, it's completed (no matches found)
		if (slideCandidates.length === 0) {
			return true;
		}

		// Otherwise, it's not completed (has candidates but none selected)
		return false;
	}

	private updateCompletionStats(paragraphs: Paragraph[]): void {
		const total = paragraphs.length;
		const completed = paragraphs.reduce((count, paragraph) => (
			this.isParagraphCompleted(paragraph) ? count + 1 : count
		), 0);
		const open = total - completed;
		const percentage = total > 0 ? (completed / total) * 100 : 0;
		this.completionStats = { total, completed, open, percentage };
	}
}

interface CompletionStats {
	total: number;
	completed: number;
	open: number;
	percentage: number;
}
