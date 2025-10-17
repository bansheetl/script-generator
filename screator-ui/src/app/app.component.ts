import { Component, OnDestroy, OnInit } from '@angular/core';
import { Paragraph, SlideCandidate, SlideMatch, SlideMatchResult } from './app.model';
import { AppState } from './app.reducers';
import { Store } from '@ngrx/store';
import { rejectSlideForParagraph, redo, scriptLoaded, scriptSaved, selectSlideForParagraph, undo } from './app.actions';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { selectParagraphs, selectRedoHistoryExists, selectScriptEdited, selectUndoHistoryExists } from './app.selectors';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';

declare var fs: any;
declare var path: any;

@Component({
    selector: 'app-script-editor',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ToolbarModule,
    SelectModule,
    SelectButtonModule,
    ButtonModule,
    CardModule,
    CarouselModule,
  ]
})
export class AppComponent implements OnInit, OnDestroy {

  static readonly SLIDE_PREFIX = '../../../../../';
  static readonly SCRIPT_ROOT_DIR = '../output';

  paragraphs$: Observable<Paragraph[]>;
  scriptEdited$: Observable<boolean>;
  undoHistoryExists$: Observable<boolean>;
  redoHistoryExists$: Observable<boolean>;
  scripts: ScriptOption[] = [];
  selectedScript: string | null = null;
  allSlides: SlideOption[] = [];
  availableSlides: SlideOption[] = [];

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

  private paragraphViewModes: Record<number, SlideSelectionMode> = {};
  private paragraphsSnapshot: Paragraph[] = [];
  private paragraphsSubscription?: Subscription;

  constructor(private store: Store<AppState>) {
    this.paragraphs$ = this.store.select(selectParagraphs);
    this.scriptEdited$ = this.store.select(selectScriptEdited);
    this.undoHistoryExists$ = this.store.select(selectUndoHistoryExists);
    this.redoHistoryExists$ = this.store.select(selectRedoHistoryExists);
  }

  ngOnInit(): void {
    const script_dirs = fs.readdirSync(AppComponent.SCRIPT_ROOT_DIR);
    script_dirs.forEach((script_dir: string) => {
      if (script_dir !== '.DS_Store' && this.hasRequiredFiles(AppComponent.SCRIPT_ROOT_DIR + '/' + script_dir)) {
        this.scripts.push({ label: script_dir, value: script_dir });
      }
    });
    console.log("Scripts loaded: ", this.scripts.map(script => script.value));
    if (this.scripts.length > 0) {
      this.selectedScript = this.scripts[0].value;
      this.onScriptSelected();
    }

    this.paragraphsSubscription = this.paragraphs$.subscribe((paragraphs) => {
      this.paragraphsSnapshot = paragraphs ?? [];
      this.updateAvailableSlides();
    });
  }

  ngOnDestroy(): void {
    this.paragraphsSubscription?.unsubscribe();
  }

  private hasRequiredFiles(dir: string): boolean {
    return fs.existsSync(dir + '/script.json') && fs.existsSync(dir + '/slide_matches.json');
  }

  hasSelectedSlide(paragraph: Paragraph): boolean {
    return this.getSelectedSlideCandidate(paragraph) !== null;
  }

  undo() {
    this.store.dispatch(undo());
  }

  redo() {
    this.store.dispatch(redo());
  }

  saveScript() {
    if (!this.selectedScript) {
      return;
    }

  this.paragraphs$.pipe(take(1)).subscribe((paragraphs) => {
      const script = {
        content: paragraphs
      };
      fs.writeFile(AppComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript + '/script_edited.json', JSON.stringify(script), (err: any) => {
        if (err) {
          console.error('Error saving script:', err);
        }
      });
    });
    this.store.dispatch(scriptSaved());
  }

  selectSlideCandidate(paragraph: Paragraph, selectedSlide: SlideCandidate) {
    this.paragraphViewModes[paragraph.id] = 'suggestions';
    this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate: selectedSlide }));
  }

  rejectSlideCandidate(paragraph: Paragraph, slideToReject: SlideCandidate) {
    this.store.dispatch(rejectSlideForParagraph({ paragraph, slideCandidate: slideToReject }));
  }

  onScriptSelected(): void {
    if (!this.selectedScript) {
      return;
    }

    this.paragraphViewModes = {};
    this.allSlides = [];
    this.availableSlides = [];
  this.paragraphsSnapshot = [];

    fs.readFile(AppComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript + '/script.json', 'utf8', (err: any, data: any) => {
      if (err) {
        console.error('Error reading script:', err);
        return;
      }
      const paragraphs = this.retrieveParagraphs(data);
      fs.readFile(AppComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript + '/slide_matches.json', 'utf8', (err: any, data: any) => {
        if (err) {
          console.error('Error reading slide matches:', err);
          return;
        }
        this.addSlidesToParagraphs(data, paragraphs);
        this.store.dispatch(scriptLoaded({ paragraphs }));
      });
    });
  }

  private retrieveParagraphs(result: string): Paragraph[] {
    try {
      const paragraphs: Paragraph[] = [];
      const jsonContent = JSON.parse(result as string);
      jsonContent.content.forEach((paragraph_entry: Paragraph) => {
        paragraph_entry.slideCandidates = [];
        paragraphs.push(paragraph_entry);
      });
      console.log("Paragraphs loaded", paragraphs);
      return paragraphs;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return [];
    }
  }

  private addSlidesToParagraphs(result: string | ArrayBuffer | null, paragraphs: Paragraph[]) {
    const jsonContent = JSON.parse(result as string);
    console.log("Slides loaded", jsonContent)
    this.allSlides = [];
    jsonContent.forEach((slideMatch: SlideMatch) => {
      const slidePath = AppComponent.SLIDE_PREFIX + slideMatch.slide_file;
      const slide: Slide = {
        slide_name: path.basename(slideMatch.slide_file),
        slide_file: slidePath
      };
      this.allSlides.push(slide);
      slideMatch.results.forEach((match: SlideMatchResult) => {
        const paragraph = paragraphs[parseInt(match.paragraph_id) - 1];
        if (paragraph) {
          const slideCandidate = {
            slide_file: slidePath,
            score: match.score,
            selected: false
          };
          paragraph.slideCandidates.push(slideCandidate);
        }
      });
    });
    this.updateAvailableSlides();
  }

  getViewMode(paragraphId: number): SlideSelectionMode {
    if (!this.paragraphViewModes[paragraphId]) {
      this.paragraphViewModes[paragraphId] = 'suggestions';
    }
    return this.paragraphViewModes[paragraphId];
  }

  onModeChange(paragraphId: number, mode: SlideSelectionMode) {
    this.paragraphViewModes[paragraphId] = mode;
  }

  getAvailableSlidesForParagraph(_paragraph: Paragraph): SlideOption[] {
    return this.availableSlides
      .map((slide) => ({ ...slide }))
      .sort((a, b) => a.slide_name.localeCompare(b.slide_name));
  }

  onLibrarySlideChosen(paragraph: Paragraph, slideFile: string | null) {
    if (!slideFile) {
      return;
    }

    const slide = this.findSlideByFile(slideFile);
    if (!slide) {
      return;
    }

    const slideCandidate: SlideCandidate = this.createCandidateFromSlide(slide);
    this.paragraphViewModes[paragraph.id] = 'library';
    this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate }));
  }

  private updateAvailableSlides(): void {
    const assigned = new Set<string>();
    this.paragraphsSnapshot.forEach((paragraph) => {
      const selected = this.getSelectedSlideCandidate(paragraph);
      if (selected) {
        assigned.add(selected.slide_file);
      }
    });

    this.availableSlides = this.allSlides
      .filter((slide) => !assigned.has(slide.slide_file))
      .map((slide) => ({ ...slide }));
  }

  getSelectedSlideCandidate(paragraph: Paragraph): SlideCandidate | null {
    return paragraph.slideCandidates?.find((sc) => sc.selected) ?? null;
  }

  findSlideByFile(slideFile: string): SlideOption | undefined {
    return this.allSlides.find((slide) => slide.slide_file === slideFile);
  }

  private createCandidateFromSlide(slide: Slide): SlideCandidate {
    return {
      slide_file: slide.slide_file,
      score: 0,
      selected: false
    };
  }

}

interface Slide {
  slide_name: string;
  slide_file: string;
}

interface ScriptOption {
  label: string;
  value: string;
}

interface SlideOption extends Slide {
  disabled?: boolean;
}

type SlideSelectionMode = 'suggestions' | 'library';

interface ModeOption {
  label: string;
  value: SlideSelectionMode;
}