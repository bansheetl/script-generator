import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Paragraph, Slide, SlideCandidate, SlideMatch, SlideMatchResult } from './app.model';
import { AppState } from './app.reducers';
import { scriptDataLoaded, scriptSaved, scriptSelected } from './app.actions';
import { selectParagraphs, selectScriptEdited } from './app.selectors';
import { ScriptEditorComponent } from './components/script-editor/script-editor.component';

declare var fs: any;
declare var path: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolbarModule,
    SelectModule,
    ButtonModule,
    ScriptEditorComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private static readonly SLIDE_PREFIX = '../../../../../';
  private static readonly SCRIPT_ROOT_DIR = '../output';

  scripts: ScriptOption[] = [];
  selectedScript: string | null = null;
  allSlides: Slide[] = [];
  isLoading = false;

  readonly paragraphs$: Observable<Paragraph[]>;
  readonly scriptEdited$: Observable<boolean>;

  constructor(private store: Store<AppState>) {
    this.paragraphs$ = this.store.select(selectParagraphs);
    this.scriptEdited$ = this.store.select(selectScriptEdited);
  }

  ngOnInit(): void {
    this.loadScripts();
  }

  async onScriptSelected(): Promise<void> {
    if (!this.selectedScript) {
      return;
    }

    const scriptId = this.selectedScript;
    const baseDir = `${AppComponent.SCRIPT_ROOT_DIR}/${scriptId}`;

    this.store.dispatch(scriptSelected({ scriptId }));
    this.allSlides = [];
    this.isLoading = true;

    try {
      const scriptData = await this.readFileAsync(`${baseDir}/script.json`);
      const paragraphs = this.retrieveParagraphs(scriptData);

      const slideMatchesData = await this.readFileAsync(`${baseDir}/slide_matches.json`);
      const slideLibrary = this.attachSlidesToParagraphs(slideMatchesData, paragraphs);

      await this.loadEditedSelections(baseDir, paragraphs);

      if (this.selectedScript !== scriptId) {
        return;
      }

      this.allSlides = slideLibrary;
      this.store.dispatch(scriptDataLoaded({ scriptId, paragraphs }));
    } catch (error) {
      console.error(`Error loading script \"${scriptId}\":`, error);
    } finally {
      if (this.selectedScript === scriptId) {
        this.isLoading = false;
      }
    }
  }

  saveScript(): void {
    if (!this.selectedScript) {
      return;
    }

    this.paragraphs$.pipe(take(1)).subscribe((paragraphs) => {
      const script = { content: paragraphs };
      const outputPath = `${AppComponent.SCRIPT_ROOT_DIR}/${this.selectedScript}/script_edited.json`;

      fs.writeFile(outputPath, JSON.stringify(script), (err: any) => {
        if (err) {
          console.error('Error saving script:', err);
        }
      });
    });

    this.store.dispatch(scriptSaved());
  }

  reloadScript(): void {
    void this.onScriptSelected();
  }

  private loadScripts(): void {
    const scriptDirs: string[] = fs.readdirSync(AppComponent.SCRIPT_ROOT_DIR);
    this.scripts = scriptDirs
      .filter((dir) => dir !== '.DS_Store' && this.hasRequiredFiles(`${AppComponent.SCRIPT_ROOT_DIR}/${dir}`))
      .map((dir) => ({ label: dir, value: dir }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (this.scripts.length > 0) {
      this.selectedScript = this.scripts[0].value;
      void this.onScriptSelected();
    }
  }

  private hasRequiredFiles(dir: string): boolean {
    return fs.existsSync(`${dir}/script.json`) && fs.existsSync(`${dir}/slide_matches.json`);
  }

  private async readFileAsync(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  private retrieveParagraphs(result: string): Paragraph[] {
    try {
      const jsonContent = JSON.parse(result as string);
      const paragraphs: Paragraph[] = [];

      jsonContent.content.forEach((entry: any) => {
        const paragraphData: Paragraph = {
          ...entry,
          slideCandidates: [],
          selectedSlides: entry.selectedSlides ?? []
        };
        paragraphs.push(paragraphData);
      });

      return paragraphs;
    } catch (error) {
      console.error('Error parsing script.json:', error);
      return [];
    }
  }

  private attachSlidesToParagraphs(result: string, paragraphs: Paragraph[]): Slide[] {
    try {
      const jsonContent = JSON.parse(result as string);
      const slides: Slide[] = [];

      jsonContent.forEach((slideMatch: SlideMatch) => {
        const slidePath = AppComponent.SLIDE_PREFIX + slideMatch.slide_file;
        const slide: Slide = {
          slide_name: path.basename(slideMatch.slide_file),
          slide_file: slidePath
        };

        slides.push(slide);

        slideMatch.results.forEach((match: SlideMatchResult) => {
          const paragraphIndex = parseInt(match.paragraph_id, 10) - 1;
          const paragraph = paragraphs[paragraphIndex];

          if (!paragraph) {
            return;
          }

          const slideCandidate: SlideCandidate = {
            slide_file: slidePath,
            score: match.score,
            selected: false
          };

          const alreadySelected = (paragraph.selectedSlides ?? []).some(
            (selectedSlide) => selectedSlide.slide_file === slideCandidate.slide_file
          );

          if (!alreadySelected) {
            paragraph.slideCandidates.push(slideCandidate);
          }
        });
      });

      return slides;
    } catch (error) {
      console.error('Error parsing slide_matches.json:', error);
      return [];
    }
  }

  private async loadEditedSelections(baseDir: string, paragraphs: Paragraph[]): Promise<void> {
    const editedPath = `${baseDir}/script_edited.json`;
    if (!fs.existsSync(editedPath)) {
      return;
    }

    try {
      const data = await this.readFileAsync(editedPath);
      const parsed = JSON.parse(data);
      const editedContent: Partial<Paragraph>[] = Array.isArray(parsed?.content) ? parsed.content : [];

      if (editedContent.length === 0) {
        return;
      }

      const cloneCandidates = (candidates?: SlideCandidate[]) =>
        (candidates ?? []).map((candidate) => ({ ...candidate }));
      const ensureSelectedFlag = (slides: SlideCandidate[]) =>
        slides.map((slide) => ({ ...slide, selected: slide.selected ?? true }));

      const paragraphsById = new Map(
        paragraphs.map((paragraph) => [
          paragraph.id,
          {
            ...paragraph,
            slideCandidates: cloneCandidates(paragraph.slideCandidates),
            selectedSlides: cloneCandidates(paragraph.selectedSlides)
          }
        ])
      );

      const updatedParagraphs: Paragraph[] = editedContent.map((editedParagraph) => {
        const base = editedParagraph.id !== undefined ? paragraphsById.get(editedParagraph.id) : undefined;
        const fallbackId = base?.id ?? 0;
        const id = typeof editedParagraph.id === 'number' ? editedParagraph.id : fallbackId;
        const text = typeof editedParagraph.text === 'string' ? editedParagraph.text : (base?.text ?? '');
        const slideCandidates = Array.isArray(editedParagraph.slideCandidates)
          ? cloneCandidates(editedParagraph.slideCandidates as SlideCandidate[])
          : cloneCandidates(base?.slideCandidates);
        const selectedSlides = Array.isArray(editedParagraph.selectedSlides)
          ? ensureSelectedFlag(cloneCandidates(editedParagraph.selectedSlides as SlideCandidate[]))
          : ensureSelectedFlag(cloneCandidates(base?.selectedSlides));

        return {
          id,
          text,
          slideCandidates,
          selectedSlides
        };
      });

      const editedIds = new Set(updatedParagraphs.map((paragraph) => paragraph.id));

      paragraphs.forEach((paragraph) => {
        if (!editedIds.has(paragraph.id)) {
          updatedParagraphs.push({
            ...paragraph,
            slideCandidates: cloneCandidates(paragraph.slideCandidates),
            selectedSlides: cloneCandidates(paragraph.selectedSlides)
          });
        }
      });

      paragraphs.length = 0;
      updatedParagraphs.forEach((paragraph) => paragraphs.push(paragraph));
    } catch (error) {
      console.error('Error parsing script_edited.json:', error);
    }
  }
}

interface ScriptOption {
  label: string;
  value: string;
}