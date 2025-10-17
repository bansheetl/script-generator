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
  completionStats: CompletionStats = { total: 0, completed: 0, open: 0, percentage: 0 };

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
  private paragraphSelectionVisible: Record<number, boolean> = {};
  private paragraphCompletionOverrides: Record<number, boolean> = {};
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
      this.cleanupParagraphState(this.paragraphsSnapshot);
      this.updateAvailableSlides();
      this.updateCompletionStats();
    });
  }

  ngOnDestroy(): void {
    this.paragraphsSubscription?.unsubscribe();
  }

  private hasRequiredFiles(dir: string): boolean {
    return fs.existsSync(dir + '/script.json') && fs.existsSync(dir + '/slide_matches.json');
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
    this.paragraphSelectionVisible[paragraph.id] = false;
    delete this.paragraphCompletionOverrides[paragraph.id];
    this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate: selectedSlide }));
    this.updateCompletionStats();
  }

  rejectSlideCandidate(paragraph: Paragraph, slideToReject: SlideCandidate) {
    const remainingCandidates = paragraph.slideCandidates.filter((candidate) => candidate.slide_file !== slideToReject.slide_file);
    if (remainingCandidates.length === 0 && this.getSelectedSlides(paragraph).length === 0) {
      this.paragraphSelectionVisible[paragraph.id] = false;
      delete this.paragraphCompletionOverrides[paragraph.id];
    }
    this.store.dispatch(rejectSlideForParagraph({ paragraph, slideCandidate: slideToReject }));
    this.updateCompletionStats();
  }

  onScriptSelected(): void {
    if (!this.selectedScript) {
      return;
    }

    this.paragraphViewModes = {};
    this.paragraphSelectionVisible = {};
    this.paragraphCompletionOverrides = {};
    this.allSlides = [];
    this.availableSlides = [];
    this.paragraphsSnapshot = [];
    this.updateCompletionStats();

    const baseDir = AppComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript;

    fs.readFile(baseDir + '/script.json', 'utf8', (err: any, data: any) => {
      if (err) {
        console.error('Error reading script:', err);
        return;
      }
      const paragraphs = this.retrieveParagraphs(data);
      fs.readFile(baseDir + '/slide_matches.json', 'utf8', (err: any, data: any) => {
        if (err) {
          console.error('Error reading slide matches:', err);
          return;
        }
        this.addSlidesToParagraphs(data, paragraphs);
        this.loadEditedSelections(baseDir, paragraphs);
      });
    });
  }

  private retrieveParagraphs(result: string): Paragraph[] {
    try {
      const paragraphs: Paragraph[] = [];
      const jsonContent = JSON.parse(result as string);
      jsonContent.content.forEach((paragraph_entry: any) => {
        const paragraphData: Paragraph = {
          ...paragraph_entry,
          slideCandidates: [],
          selectedSlides: paragraph_entry.selectedSlides ?? []
        };
        paragraphs.push(paragraphData);
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
          const alreadySelected = paragraph.selectedSlides.some((selectedSlide) => selectedSlide.slide_file === slideCandidate.slide_file);
          if (!alreadySelected) {
            paragraph.slideCandidates.push(slideCandidate);
          }
        }
      });
    });
    this.updateAvailableSlides();
  }

  private loadEditedSelections(baseDir: string, paragraphs: Paragraph[]) {
    const editedPath = baseDir + '/script_edited.json';
    if (fs.existsSync(editedPath)) {
      fs.readFile(editedPath, 'utf8', (err: any, data: any) => {
        if (err) {
          console.error('Error reading edited script:', err);
          this.initializeSelectionState(paragraphs);
          this.store.dispatch(scriptLoaded({ paragraphs }));
          return;
        }
        try {
          const editedContent = JSON.parse(data)?.content ?? [];
          editedContent.forEach((editedParagraph: Partial<Paragraph>) => {
            const original = paragraphs.find((p) => p.id === editedParagraph.id);
            if (!original) {
              return;
            }
            const selectedSlides = (editedParagraph.selectedSlides && editedParagraph.selectedSlides.length > 0)
              ? editedParagraph.selectedSlides
              : (editedParagraph.slideCandidates?.filter((candidate) => candidate.selected) ?? []);
            if (selectedSlides.length > 0) {
              original.selectedSlides = selectedSlides.map((slide) => ({ ...slide, selected: true }));
              original.slideCandidates = original.slideCandidates.filter((candidate) => !selectedSlides.some((slide) => slide.slide_file === candidate.slide_file));
            }
          });
        } catch (parseError) {
          console.error('Error parsing edited script:', parseError);
        }
        this.initializeSelectionState(paragraphs);
        this.store.dispatch(scriptLoaded({ paragraphs }));
      });
    } else {
      this.initializeSelectionState(paragraphs);
      this.store.dispatch(scriptLoaded({ paragraphs }));
    }
  }

  getViewMode(paragraph: Paragraph): SlideSelectionMode {
    if (!this.paragraphViewModes[paragraph.id]) {
      const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
      this.paragraphViewModes[paragraph.id] = hasCandidates ? 'suggestions' : 'library';
    }
    return this.paragraphViewModes[paragraph.id];
  }

  onModeChange(paragraphId: number, mode: SlideSelectionMode) {
    this.paragraphViewModes[paragraphId] = mode;
  }

  openSelection(paragraph: Paragraph) {
    const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
    this.paragraphViewModes[paragraph.id] = hasCandidates ? 'suggestions' : 'library';
    this.paragraphSelectionVisible[paragraph.id] = true;
    delete this.paragraphCompletionOverrides[paragraph.id];
    this.updateCompletionStats();
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
    this.paragraphSelectionVisible[paragraph.id] = false;
    delete this.paragraphCompletionOverrides[paragraph.id];
    this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate }));
    this.updateCompletionStats();
  }

  private updateAvailableSlides(): void {
    const assigned = new Set<string>();
    this.paragraphsSnapshot.forEach((paragraph) => {
      paragraph.selectedSlides?.forEach((selected) => {
        assigned.add(selected.slide_file);
      });
    });

    this.availableSlides = this.allSlides
      .filter((slide) => !assigned.has(slide.slide_file))
      .map((slide) => ({ ...slide }));
  }

  getSelectedSlides(paragraph: Paragraph): SlideCandidate[] {
    return paragraph.selectedSlides ?? [];
  }

  isSelectionVisible(paragraph: Paragraph): boolean {
    return this.paragraphSelectionVisible[paragraph.id] ?? false;
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

  removeSelectedSlide(paragraph: Paragraph, slideCandidate: SlideCandidate) {
    const remainingSelected = (paragraph.selectedSlides ?? []).filter((selected) => selected.slide_file !== slideCandidate.slide_file);
    if (remainingSelected.length === 0) {
      const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
      this.paragraphSelectionVisible[paragraph.id] = hasCandidates;
      delete this.paragraphCompletionOverrides[paragraph.id];
    } else {
      this.paragraphSelectionVisible[paragraph.id] = false;
      delete this.paragraphCompletionOverrides[paragraph.id];
    }
    this.store.dispatch(rejectSlideForParagraph({ paragraph, slideCandidate }));
    this.updateCompletionStats();
  }

  private initializeSelectionState(paragraphs: Paragraph[]): void {
    this.paragraphSelectionVisible = {};
    paragraphs.forEach((paragraph) => {
      const hasSelected = (paragraph.selectedSlides ?? []).length > 0;
      const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
      delete this.paragraphCompletionOverrides[paragraph.id];
      this.paragraphViewModes[paragraph.id] = hasCandidates ? 'suggestions' : 'library';
      this.paragraphSelectionVisible[paragraph.id] = hasSelected ? false : hasCandidates;
    });
    this.updateCompletionStats();
  }

  cancelSelection(paragraph: Paragraph) {
    this.paragraphSelectionVisible[paragraph.id] = false;
    const hasCandidates = (paragraph.slideCandidates ?? []).length > 0;
    if (hasCandidates) {
      this.paragraphCompletionOverrides[paragraph.id] = true;
    } else {
      delete this.paragraphCompletionOverrides[paragraph.id];
    }
    this.updateCompletionStats();
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

    return this.paragraphCompletionOverrides[paragraph.id] ?? false;
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

  private cleanupParagraphState(paragraphs: Paragraph[]): void {
    const validIds = new Set(paragraphs.map((paragraph) => paragraph.id));

    Object.keys(this.paragraphCompletionOverrides).forEach((key) => {
      const id = Number(key);
      if (!validIds.has(id)) {
        delete this.paragraphCompletionOverrides[id];
      }
    });

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

interface CompletionStats {
  total: number;
  completed: number;
  open: number;
  percentage: number;
}