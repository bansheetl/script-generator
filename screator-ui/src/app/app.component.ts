import { Component, OnInit } from '@angular/core';
import { Paragraph, SlideCandidate, SlideMatch, SlideMatchResult } from './app.model';
import { AppState } from './app.reducers';
import { Store } from '@ngrx/store';
import { deleteSlideForParagraph, moveSlideToParagraph, redo, scriptLoaded, scriptSaved, selectSlideForParagraph, undo } from './app.actions';
import { Observable } from 'rxjs';
import { selectParagraphs, selectRedoHistoryExists, selectScriptEdited, selectUndoHistoryExists } from './app.selectors';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';

declare var fs: any;
declare var path: any;

@Component({
    selector: 'app-script-editor',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatToolbarModule,
        MatSelectModule,
        MatGridListModule,
        MatIconModule,
        MatRadioModule,
        MatFormFieldModule,
    ]
})
export class AppComponent implements OnInit {

  static readonly SLIDE_PREFIX = '../../../../../';
  static readonly SCRIPT_ROOT_DIR = '../output';

  paragraphs$: Observable<Paragraph[]>;
  scriptEdited$: Observable<boolean>;
  undoHistoryExists$: Observable<boolean>;
  redoHistoryExists$: Observable<boolean>;
  scripts: string[] = [];
  slideToMove: SlideCandidate | null = null;
  selectedScript: string | null = null;
  selectedSlide: Slide | null = null;
  allSlides: Slide[] = [];

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
        this.scripts.push(script_dir);
      }
    });
    console.log("Scripts loaded: ", this.scripts);
    this.selectedScript = this.scripts[0];
    this.onScriptSelected();
  }

  private hasRequiredFiles(dir: string): boolean {
    return fs.existsSync(dir + '/script.json') && fs.existsSync(dir + '/slide_matches.json');
  }

  getParagraphClass(paragraph: Paragraph): string {
    return paragraph.slideCandidates.length == 0 || paragraph.slideCandidates.some(sc => sc.selected) ? 'script-paragraph selected-paragraph' : 'script-paragraph open-paragraph';
  }

  undo() {
    this.store.dispatch(undo());
  }

  redo() {
    this.store.dispatch(redo());
  }

  saveScript() {
    this.paragraphs$.subscribe((paragraphs) => {
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

  insertSelectedSlide(paragraph: Paragraph) {
    if (this.selectedSlide && this.selectedSlide.slideCandidate) {
      const slideCandidate = this.selectedSlide.slideCandidate
      this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate }));
    }
  }

  selectSlideCandidate(paragraph: Paragraph, selectedSlide: SlideCandidate) {
    this.store.dispatch(selectSlideForParagraph({ paragraph, slideCandidate: selectedSlide }));
  }

  deleteSlideCandidate(paragraph: Paragraph, slideToDelete: SlideCandidate) {
    this.store.dispatch(deleteSlideForParagraph({ paragraph, slideCandidate: slideToDelete }));
  }

  moveSlideToParagraph(paragraph: Paragraph) {
    if (this.slideToMove) {
      this.store.dispatch(moveSlideToParagraph({ slideCandidate: this.slideToMove, paragraph }));
      this.slideToMove = null;
    }
  }

  onScriptSelected(): void {
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
      const slide: Slide = {
        slide_name: path.basename(slideMatch.slide_file),
        slide_file: AppComponent.SLIDE_PREFIX + slideMatch.slide_file,
        slideCandidate: {
          slide_file: AppComponent.SLIDE_PREFIX + slideMatch.slide_file,
          score: 0,
          selected: false
        }
      }
      this.allSlides.push(slide);
      slideMatch.results.forEach((match: SlideMatchResult) => {
        const paragraph = paragraphs[parseInt(match.paragraph_id) - 1];
        if (paragraph) {
          const slideCandidate = {
            slide_file: AppComponent.SLIDE_PREFIX + slideMatch.slide_file,
            score: match.score,
            selected: false
          };
          slide.slideCandidate = slideCandidate;
          paragraph.slideCandidates.push(slideCandidate);
        }
      });
    });
  }

}

interface Slide {
  slide_name: string;
  slide_file: string;
  slideCandidate?: SlideCandidate;
}