import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-script-display',
  standalone: true,
  templateUrl: './script-display.component.html',
  styleUrls: ['./script-display.component.css'],
  imports: [CommonModule]
})
export class ScriptDisplayComponent {

  static readonly SLIDE_PREFIX = '../../../../../';

  paragraphs: Paragraph[] = [];

  constructor() { }

  onScriptSelected(event: any): void {
    const file: File = event.target.files[0];
    console.log('Selected script:', file);
    if (file) {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onloadend = () => {
        this.updateParagraphs(reader.result);
      };

    }
  }

  onSlideMatchesSelected(event: any): void {
    const file: File = event.target.files[0];
    console.log('Selected slide matches:', file);
    if (file) {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onloadend = () => {
        this.addSlidesToParagraphs(reader.result);
      };

    }
  }
  addSlidesToParagraphs(result: string | ArrayBuffer | null) {
    const jsonContent = JSON.parse(result as string);
    jsonContent.forEach((slideMatch: any) => {
      slideMatch.results.forEach((match: any) => {
        const paragraph = this.paragraphs[parseInt(match.paragraph_id) - 1];
        if (paragraph) {
          if (!paragraph.slideCandidates) {
            paragraph.slideCandidates = [];
          }
          paragraph.slideCandidates.push(ScriptDisplayComponent.SLIDE_PREFIX + slideMatch.slide_file);
        }
      });
    });
  }


  updateParagraphs(result: string | ArrayBuffer | null) {
    try {
      this.paragraphs = [];
      const jsonContent = JSON.parse(result as string);
      jsonContent.content.forEach((paragraph_entry: any) => {
        this.paragraphs.push(paragraph_entry);
      });
      console.log(this.paragraphs);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }
}

export interface Paragraph {
  id: number;
  text: string;
  slideCandidates: string[];
}