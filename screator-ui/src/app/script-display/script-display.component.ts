import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var fs: any;

@Component({
  selector: 'app-script-display',
  standalone: true,
  templateUrl: './script-display.component.html',
  styleUrls: ['./script-display.component.css'],
  imports: [CommonModule]
})
export class ScriptDisplayComponent implements OnInit {

  static readonly SLIDE_PREFIX = '../../../../../';

  static readonly SCRIPT_ROOT_DIR = '../output';

  scripts: string[] = [];
  paragraphs: Paragraph[] = [];

  constructor(private changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    const script_dirs = fs.readdirSync(ScriptDisplayComponent.SCRIPT_ROOT_DIR);
    script_dirs.forEach((script_dir: string) => {
      if (script_dir !== '.DS_Store') {
        this.scripts.push(script_dir);
      }
    });
    console.log("Scripts loaded: ", this.scripts);
    this.onScriptSelected(this.scripts[1]);
  }

  onScriptSelected(script_id: string): void {
    fs.readFile(ScriptDisplayComponent.SCRIPT_ROOT_DIR + '/' + script_id + '/script.json', 'utf8', (err: any, data: any) => {
      if (err) {
        console.error('Error reading script:', err);
        return;
      }
      this.updateParagraphs(data);
      fs.readFile(ScriptDisplayComponent.SCRIPT_ROOT_DIR + '/' + script_id + '/slide_matches.json', 'utf8', (err: any, data: any) => {
        if (err) {
          console.error('Error reading slide matches:', err);
          return;
        }
        this.addSlidesToParagraphs(data);
      });
    });
  }

  updateParagraphs(result: string) {
    try {
      const jsonContent = JSON.parse(result as string);
      jsonContent.content.forEach((paragraph_entry: any) => {
        this.paragraphs.push(paragraph_entry);
      });
      console.log("Paragraphs loaded", this.paragraphs);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }

  addSlidesToParagraphs(result: string | ArrayBuffer | null) {
    const jsonContent = JSON.parse(result as string);
    console.log("Slides loaded", jsonContent)
    jsonContent.forEach((slideMatch: any) => {
      slideMatch.results.forEach((match: any) => {
        const paragraph = this.paragraphs[parseInt(match.paragraph_id) - 1];
        if (paragraph) {
          if (!paragraph.slideCandidates) {
            paragraph.slideCandidates = [];
          }
          paragraph.slideCandidates.push({
            slide_file: ScriptDisplayComponent.SLIDE_PREFIX + slideMatch.slide_file,
            score: match.score
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
  slideCandidates: SlideMatch[];
}

export interface SlideMatch {
  slide_file: string;
  score: number;
}