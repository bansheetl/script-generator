import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'app-script-display',
  standalone: true,
  templateUrl: './script-display.component.html',
  styleUrls: ['./script-display.component.css'],
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
    MatFormFieldModule
  ]
})
export class ScriptDisplayComponent implements OnInit {

  static readonly SLIDE_PREFIX = '../../../../../';
  static readonly SCRIPT_ROOT_DIR = '../output';

  scriptEdited: boolean = false;
  scripts: string[] = [];
  paragraphs: Paragraph[] = [];
  slideToMove: SlideCandidate | null = null;
  selectedScript: string | null = null;

  constructor(private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    const script_dirs = fs.readdirSync(ScriptDisplayComponent.SCRIPT_ROOT_DIR);
    script_dirs.forEach((script_dir: string) => {
      if (script_dir !== '.DS_Store' && this.hasRequiredFiles(ScriptDisplayComponent.SCRIPT_ROOT_DIR + '/' + script_dir)) {
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

  saveScript() {
    const script = {
      content: this.paragraphs
    };
    fs.writeFile(ScriptDisplayComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript + '/script_edited.json', JSON.stringify(script), (err: any) => {
      if (err) {
        console.error('Error saving script:', err);
      }
    });
    this.scriptEdited = false;
  }

  private validateAllParagraphsHaveSelectedCandidates() {
    const allSelected = this.paragraphs.every((paragraph) => {
      return paragraph.slideCandidates && paragraph.slideCandidates.length === 1 && paragraph.slideCandidates[0].selected;
    });
  }

  selectSlideCandidate(paragraph: Paragraph, selectedSlide: SlideCandidate) {
    paragraph.slideCandidates = [selectedSlide];
    selectedSlide.selected = true;
    this.removeFromOtherParagraphs(paragraph, selectedSlide);
    this.scriptEdited = true;
    this.changeDetectorRef.detectChanges();
  }

  deleteSlideCandidate(paragraph: Paragraph, slideToDelete: SlideCandidate) {
    paragraph.slideCandidates = paragraph.slideCandidates.filter(candidate => candidate.slide_file !== slideToDelete.slide_file);
    this.scriptEdited = true;
    this.changeDetectorRef.detectChanges();
  }

  moveSlideToParagraph(paragraph: Paragraph) {
    if (this.slideToMove) {
      paragraph.slideCandidates = [];
      paragraph.slideCandidates.push(this.slideToMove);
      this.slideToMove.selected = true;

      this.removeFromOtherParagraphs(paragraph, this.slideToMove);
      this.slideToMove = null;
      this.scriptEdited = true;
      this.changeDetectorRef.detectChanges();
    }
  }

  private removeFromOtherParagraphs(paragraph: Paragraph, slideMatch: SlideCandidate) {
    this.paragraphs.forEach((p) => {
      if (p.id !== paragraph.id) {
        if (p.slideCandidates) {
          p.slideCandidates = p.slideCandidates.filter(candidate => candidate.slide_file !== slideMatch!.slide_file);
        }
      }
    });
  }

  onScriptSelected(): void {
    this.scriptEdited = false;
    fs.readFile(ScriptDisplayComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript + '/script.json', 'utf8', (err: any, data: any) => {
      if (err) {
        console.error('Error reading script:', err);
        return;
      }
      this.updateParagraphs(data);
      fs.readFile(ScriptDisplayComponent.SCRIPT_ROOT_DIR + '/' + this.selectedScript + '/slide_matches.json', 'utf8', (err: any, data: any) => {
        if (err) {
          console.error('Error reading slide matches:', err);
          return;
        }
        this.addSlidesToParagraphs(data);
      });
    });
  }

  private updateParagraphs(result: string) {
    try {
      this.paragraphs = [];
      const jsonContent = JSON.parse(result as string);
      jsonContent.content.forEach((paragraph_entry: any) => {
        this.paragraphs.push(paragraph_entry);
      });
      console.log("Paragraphs loaded", this.paragraphs);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }

  private addSlidesToParagraphs(result: string | ArrayBuffer | null) {
    const jsonContent = JSON.parse(result as string);
    console.log("Slides loaded", jsonContent)
    jsonContent.forEach((slideMatch: any) => {
      slideMatch.results.forEach((match: SlideMatchResult) => {
        const paragraph = this.paragraphs[parseInt(match.paragraph_id) - 1];
        if (paragraph) {
          if (!paragraph.slideCandidates) {
            paragraph.slideCandidates = [];
          }
          paragraph.slideCandidates.push({
            slide_file: ScriptDisplayComponent.SLIDE_PREFIX + slideMatch.slide_file,
            score: match.score,
            selected: false
          });
        }
      });
    });
    this.changeDetectorRef.detectChanges();
  }
}

export interface Paragraph {
  id: number;
  text: string;
  slideCandidates: SlideCandidate[];
}

export interface SlideCandidate {
  slide_file: string;
  score: number;
  selected: boolean;
}

export interface SlideMatch {
  slide_file: string;
  results: SlideMatchResult[];
}

export interface SlideMatchResult {
  paragraph_id: string;
  score: number;
}