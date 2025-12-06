import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { Observable } from 'rxjs';
import { deleteSlideFromLibrary, selectSlideFromLibrary, deselectSlideFromLibrary } from '../../app.actions';
import { Slide } from '../../slide.model';
import { AppState } from '../../app.reducers';
import { selectAvailableSlides, selectSelectedLibrarySlide } from '../../app.selectors';

@Component({
	selector: 'app-slide-library',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule
	],
	templateUrl: './slide-library.component.html',
	styleUrls: ['./slide-library.component.css']
})
export class SlideLibraryComponent implements OnInit {
	availableSlides$: Observable<Slide[]>;
	selectedSlide$: Observable<string | null>;

	constructor(private store: Store<AppState>) {
		this.availableSlides$ = this.store.select(selectAvailableSlides);
		this.selectedSlide$ = this.store.select(selectSelectedLibrarySlide);
	}

	ngOnInit(): void {
	}

	selectSlide(slideFile: string): void {
		this.store.dispatch(selectSlideFromLibrary({ slideFile }));
	}

	deselectSlide(): void {
		this.store.dispatch(deselectSlideFromLibrary());
	}

	deleteSlide(slideFile: string, event: Event): void {
		event.stopPropagation();
		this.store.dispatch(deleteSlideFromLibrary({ slideFile }));
	}

	isSlideSelected(slideFile: string, selectedSlide: string | null): boolean {
		return slideFile === selectedSlide;
	}
}
