import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { Paragraph, ScriptDocument } from './app.model';
import { Slide } from './slide.model';
import { AppState } from './app.reducers';
import { scriptDataLoaded, scriptSaved, scriptSelected, slidesLoaded, deletedSlidesLoaded } from './app.actions';
import { selectParagraphs, selectScriptEdited, selectDeletedSlides, selectUndoHistoryExists, selectRedoHistoryExists } from './app.selectors';
import { redo, undo } from './app.actions';
import { ScriptEditorComponent } from './components/script-editor/script-editor.component';
import { SCRIPT_ROOT_DIR } from './script.constants';
import { ScriptConversionService } from './services/script-conversion.service';

declare var fs: any;

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
  scripts: ScriptOption[] = [];
  selectedScript: string | null = null;
  isLoading = false;

  readonly paragraphs$: Observable<Paragraph[]>;
  readonly scriptEdited$: Observable<boolean>;
  readonly deletedSlides$: Observable<string[]>;
  readonly undoHistoryExists$: Observable<boolean>;
  readonly redoHistoryExists$: Observable<boolean>;

  constructor(
    private store: Store<AppState>,
    private scriptConversionService: ScriptConversionService
  ) {
    this.paragraphs$ = this.store.select(selectParagraphs);
    this.scriptEdited$ = this.store.select(selectScriptEdited);
    this.deletedSlides$ = this.store.select(selectDeletedSlides);
    this.undoHistoryExists$ = this.store.select(selectUndoHistoryExists);
    this.redoHistoryExists$ = this.store.select(selectRedoHistoryExists);
  }

  ngOnInit(): void {
    this.loadScripts();
  }

  async onScriptSelected(): Promise<void> {
    if (!this.selectedScript) {
      return;
    }

    const scriptId = this.selectedScript;
    const baseDir = `${SCRIPT_ROOT_DIR}/${scriptId}`;

    this.store.dispatch(scriptSelected({ scriptId }));
    this.isLoading = true;

    try {
      const editedPath = `${baseDir}/script_edited.json`;
      const editedRaw = fs.existsSync(editedPath) ? await this.readFileAsync(editedPath) : undefined;

      let scriptRaw: string | undefined;
      let slideMatchesRaw: string | undefined;

      if (!editedRaw) {
        scriptRaw = await this.readFileAsync(`${baseDir}/script.json`);
        slideMatchesRaw = await this.readFileAsync(`${baseDir}/slide_matches.json`);
      }

      const { document, slides } = this.scriptConversionService.loadDocument(scriptRaw, slideMatchesRaw, editedRaw);

      if (this.selectedScript !== scriptId) {
        return;
      }

      this.store.dispatch(slidesLoaded({ slides }));
      this.store.dispatch(deletedSlidesLoaded({ deletedSlides: document.deletedSlides }));
      this.store.dispatch(scriptDataLoaded({ scriptId, paragraphs: document.cloneContent() }));
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

    combineLatest([this.paragraphs$, this.deletedSlides$])
      .pipe(take(1))
      .subscribe(([paragraphs, deletedSlides]) => {
        const document = new ScriptDocument(
          paragraphs.map((paragraph) => Paragraph.fromJson(paragraph)),
          deletedSlides
        );
        const outputPath = `${SCRIPT_ROOT_DIR}/${this.selectedScript}/script_edited.json`;
        const payload = JSON.stringify(document.toJSON(), null, 2);

        fs.writeFile(outputPath, payload, 'utf8', (err: any) => {
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

  undo(): void {
    this.store.dispatch(undo());
  }

  redo(): void {
    this.store.dispatch(redo());
  }

  private loadScripts(): void {
    const scriptDirs: string[] = fs.readdirSync(SCRIPT_ROOT_DIR);
    this.scripts = scriptDirs
      .filter((dir) => dir !== '.DS_Store' && this.hasRequiredFiles(`${SCRIPT_ROOT_DIR}/${dir}`))
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

}

interface ScriptOption {
  label: string;
  value: string;
}