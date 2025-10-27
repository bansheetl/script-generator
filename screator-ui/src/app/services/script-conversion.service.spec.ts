import { TestBed } from '@angular/core/testing';
import { ScriptConversionService } from './script-conversion.service';
import { SLIDE_IMAGE_PREFIX } from '../script.constants';

describe('ScriptConversionService', () => {
  let service: ScriptConversionService;

  // Excerpts copied from output/01 artefacts to keep fixture data realistic.
  const INTRO_PARAGRAPH = `Im ersten Kapitel der Vorlesung Softwarearchitektur, welche durch dieses Kapitel abgeschlossen wird, werden grundlegende Themen behandelt, die bereits in einer Präsenzveranstaltung eingeleitet wurden. Der Fokus liegt zunächst auf softwareintensiven Systemen, also denjenigen Systemen, für die eine strukturierte Softwarearchitektur unabdingbar ist. Dieser Bereich wird im Folgenden kurz rekapituliert, da wesentliche Inhalte bereits zuvor vermittelt wurden. Anschließend wird auf die Kernkonzepte der Softwarearchitektur eingegangen, mit besonderem Augenmerk auf deren Definition sowie den zugrunde liegenden Methoden für den Entwurf.`;
  const SUMMARY_PARAGRAPH = `Nach der Einführung sollte nun ein Überblick über die grundlegenden Themen der Vorlesung vorhanden sein. Es wurde thematisiert, welche Arten von Informationssystemen eine Software-Architektur erfordern, was eine Software-Architektur im Kern ausmacht und welchen Zweck sie erfüllt. Darüber hinaus wurden die grundlegenden Methoden und Vorgehensweisen zur Erstellung einer Architektur beleuchtet, einschließlich der Frage, an welcher Stelle des Entwicklungsprozesses diese Methoden sinnvoll eingesetzt werden können und wie sie zu verorten sind. Abschließend wurde auch auf die Rolle des Softwarearchitekten bzw. der Softwarearchitektin eingegangen, einschließlich der Frage, wie diese je nach Prozessmodell in der Softwareentwicklung ausgestaltet sein kann.`;

  const RAW_SLIDE_PAGE_002 = 'output/01/slides/page_002.png';
  const RAW_SLIDE_PAGE_015 = 'output/01/slides/page_015.png';
  const SLIDE_PAGE_002 = `${SLIDE_IMAGE_PREFIX}${RAW_SLIDE_PAGE_002}`;
  const SLIDE_PAGE_015 = `${SLIDE_IMAGE_PREFIX}${RAW_SLIDE_PAGE_015}`;

  const EDITED_SAMPLE = JSON.stringify({
    content: [
      {
        id: 196,
        text: SUMMARY_PARAGRAPH,
        slideCandidates: [
          { slide_file: SLIDE_PAGE_015, score: 0.91266006 },
          { slide_file: SLIDE_PAGE_002, score: 0.93025935 }
        ],
        selectedSlides: [
          { slide_file: SLIDE_PAGE_015, score: 0.91266006, selected: true }
        ]
      },
      {
        id: 1,
        text: INTRO_PARAGRAPH,
        slideCandidates: [
          { slide_file: SLIDE_PAGE_002, score: 0.93808454 }
        ],
        selectedSlides: [
          { slide_file: SLIDE_PAGE_002, score: 0.93808454, selected: true }
        ]
      }
    ]
  });

  const SCRIPT_SAMPLE = JSON.stringify({
    id: '01',
    content: [
      { id: 196, text: SUMMARY_PARAGRAPH },
      { id: 1, text: INTRO_PARAGRAPH }
    ]
  });

  const SLIDE_MATCHES_SAMPLE = JSON.stringify([
    {
      slide_file: RAW_SLIDE_PAGE_015,
      results: [
        { paragraph_id: '196', score: 0.91266006 },
        { paragraph_id: 'invalid', score: 0.75 }
      ]
    },
    {
      slide_file: RAW_SLIDE_PAGE_015,
      results: [
        { paragraph_id: 196, score: 0.95 }
      ]
    },
    {
      slide_file: RAW_SLIDE_PAGE_002,
      results: [
        { paragraph_id: 1, score: 0.93808454 },
        { paragraph_id: 999, score: 0.1 }
      ]
    }
  ]);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScriptConversionService);
  });

  it('returns the edited document when edited data is provided', () => {
    const { document, slides } = service.loadDocument(undefined, undefined, EDITED_SAMPLE);

    expect(document.content.map((paragraph) => paragraph.id)).toEqual([1, 196]);

    const firstParagraph = document.content[0];
    expect(firstParagraph.text).toContain('Im ersten Kapitel');
    expect(firstParagraph.selectedSlides.length).toBe(1);
    expect(firstParagraph.selectedSlides[0].slide_file).toBe(SLIDE_PAGE_002);
    expect(firstParagraph.selectedSlides[0].selected).toBeTrue();

    expect(slides).toEqual([
      { slide_file: SLIDE_PAGE_002, slide_name: 'page_002.png' },
      { slide_file: SLIDE_PAGE_015, slide_name: 'page_015.png' }
    ]);
  });

  it('merges slide match results into the script when only raw data is available', () => {
    const { document, slides } = service.loadDocument(SCRIPT_SAMPLE, SLIDE_MATCHES_SAMPLE);

    expect(document.content.map((paragraph) => paragraph.id)).toEqual([1, 196]);

    const introParagraph = document.content[0];
    expect(introParagraph.slideCandidates.length).toBe(1);
    expect(introParagraph.slideCandidates[0].slide_file).toBe(SLIDE_PAGE_002);
    expect(introParagraph.slideCandidates[0].score).toBeCloseTo(0.93808454, 5);
    expect(introParagraph.selectedSlides.length).toBe(0);

    const summaryParagraph = document.content[1];
    expect(summaryParagraph.slideCandidates.length).toBe(1);
    expect(summaryParagraph.slideCandidates[0].slide_file).toBe(SLIDE_PAGE_015);
    expect(summaryParagraph.slideCandidates[0].score).toBeCloseTo(0.95, 5);

    expect(slides).toEqual([
      { slide_file: SLIDE_PAGE_015, slide_name: 'page_015.png' },
      { slide_file: SLIDE_PAGE_002, slide_name: 'page_002.png' }
    ]);
  });
});
