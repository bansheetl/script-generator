import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { AppComponent } from './app.component';
import { AppState } from './app.reducers';
import { ScriptConversionService } from './services/script-conversion.service';
import { Paragraph, ScriptDocument, SlideCandidate } from './app.model';
import { Slide } from './slide.model';
import { scriptDataLoaded, scriptSaved, scriptSelected, slidesLoaded } from './app.actions';
import { selectParagraphs, selectScriptEdited } from './app.selectors';
import { SCRIPT_ROOT_DIR, SLIDE_IMAGE_PREFIX } from './script.constants';

// Mock fs module (exposed via Electron)
const mockFs = {
  readdirSync: jasmine.createSpy('readdirSync'),
  existsSync: jasmine.createSpy('existsSync'),
  readFile: jasmine.createSpy('readFile'),
  writeFile: jasmine.createSpy('writeFile')
};

// Declare fs globally for component access
(globalThis as any).fs = mockFs;

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let store: MockStore<AppState>;
  let scriptConversionService: jasmine.SpyObj<ScriptConversionService>;

  // Test data based on output/01 folder
  const INTRO_PARAGRAPH = `Im ersten Kapitel der Vorlesung Softwarearchitektur, welche durch dieses Kapitel abgeschlossen wird, werden grundlegende Themen behandelt, die bereits in einer Präsenzveranstaltung eingeleitet wurden. Der Fokus liegt zunächst auf softwareintensiven Systemen, also denjenigen Systemen, für die eine strukturierte Softwarearchitektur unabdingbar ist.`;
  const SUMMARY_PARAGRAPH = `Nach der Einführung sollte nun ein Überblick über die grundlegenden Themen der Vorlesung vorhanden sein. Es wurde thematisiert, welche Arten von Informationssystemen eine Software-Architektur erfordern, was eine Software-Architektur im Kern ausmacht und welchen Zweck sie erfüllt.`;

  const RAW_SLIDE_PAGE_001 = 'output/01/slides/page_001.png';
  const RAW_SLIDE_PAGE_002 = 'output/01/slides/page_002.png';
  const SLIDE_PAGE_001 = `${SLIDE_IMAGE_PREFIX}${RAW_SLIDE_PAGE_001}`;
  const SLIDE_PAGE_002 = `${SLIDE_IMAGE_PREFIX}${RAW_SLIDE_PAGE_002}`;

  const SCRIPT_JSON = JSON.stringify({
    id: '01',
    content: [
      { id: 1, text: INTRO_PARAGRAPH },
      { id: 196, text: SUMMARY_PARAGRAPH }
    ]
  });

  const SLIDE_MATCHES_JSON = JSON.stringify([
    {
      slide_file: RAW_SLIDE_PAGE_001,
      results: [
        { paragraph_id: '196', score: 0.8913914 }
      ]
    },
    {
      slide_file: RAW_SLIDE_PAGE_002,
      results: [
        { paragraph_id: '1', score: 0.93808454 }
      ]
    }
  ]);

  const SCRIPT_EDITED_JSON = JSON.stringify({
    content: [
      {
        id: 1,
        text: INTRO_PARAGRAPH,
        slideCandidates: [],
        selectedSlides: [
          { slide_file: SLIDE_PAGE_002, score: 0.93808454, selected: true }
        ]
      },
      {
        id: 196,
        text: SUMMARY_PARAGRAPH,
        slideCandidates: [],
        selectedSlides: [
          { slide_file: SLIDE_PAGE_001, score: 0.8913914, selected: true }
        ]
      }
    ]
  });

  const mockParagraphs: Paragraph[] = [
    new Paragraph(1, INTRO_PARAGRAPH, [], [new SlideCandidate(SLIDE_PAGE_002, 0.93808454, true)]),
    new Paragraph(196, SUMMARY_PARAGRAPH, [], [new SlideCandidate(SLIDE_PAGE_001, 0.8913914, true)])
  ];

  const mockSlides: Slide[] = [
    { slide_file: SLIDE_PAGE_001, slide_name: 'page_001.png' },
    { slide_file: SLIDE_PAGE_002, slide_name: 'page_002.png' }
  ];

  const initialState: AppState = {
    currentScriptId: null,
    paragraphs: [],
    allSlides: [],
    scriptEdited: false,
    undoHistory: [],
    redoHistory: []
  };

  beforeEach(async () => {
    const scriptConversionServiceSpy = jasmine.createSpyObj('ScriptConversionService', ['loadDocument']);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideMockStore({ 
          initialState: { app: initialState }
        }),
        { provide: ScriptConversionService, useValue: scriptConversionServiceSpy }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    scriptConversionService = TestBed.inject(ScriptConversionService) as jasmine.SpyObj<ScriptConversionService>;

    // Set up default mock selectors
    store.overrideSelector(selectParagraphs, []);
    store.overrideSelector(selectScriptEdited, false);

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    // Reset all fs mocks
    mockFs.readdirSync.calls.reset();
    mockFs.existsSync.calls.reset();
    mockFs.readFile.calls.reset();
    mockFs.writeFile.calls.reset();

    spyOn(store, 'dispatch');
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty scripts and null selectedScript', () => {
      expect(component.scripts).toEqual([]);
      expect(component.selectedScript).toBeNull();
      expect(component.isLoading).toBeFalse();
    });

    it('should have paragraphs$ and scriptEdited$ observables', () => {
      expect(component.paragraphs$).toBeDefined();
      expect(component.scriptEdited$).toBeDefined();
    });

    it('should load scripts on init', () => {
      mockFs.readdirSync.and.returnValue(['01', '02', '.DS_Store']);
      mockFs.existsSync.and.callFake((path: string) => {
        return path.includes('script.json') || path.includes('slide_matches.json');
      });
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        if (path.includes('script.json')) {
          callback(null, SCRIPT_JSON);
        } else if (path.includes('slide_matches.json')) {
          callback(null, SLIDE_MATCHES_JSON);
        }
      });

      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      fixture.detectChanges(); // Triggers ngOnInit

      expect(component.scripts.length).toBe(2);
      expect(component.scripts.map(s => s.value)).toContain('01');
      expect(component.scripts.map(s => s.value)).toContain('02');
      expect(component.scripts.map(s => s.value)).not.toContain('.DS_Store');
    });

    it('should filter out directories without required files', () => {
      mockFs.readdirSync.and.returnValue(['01', '02', '03']);
      mockFs.existsSync.and.callFake((path: string) => {
        // Only 01 and 02 have both required files
        return path.includes('/01/') || path.includes('/02/');
      });

      component['loadScripts']();

      expect(component.scripts.length).toBe(2);
      expect(component.scripts.map(s => s.value)).not.toContain('03');
    });

    it('should sort scripts alphabetically', () => {
      mockFs.readdirSync.and.returnValue(['03', '01', '02']);
      mockFs.existsSync.and.returnValue(true);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(null, path.includes('script.json') ? SCRIPT_JSON : SLIDE_MATCHES_JSON);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      fixture.detectChanges();

      expect(component.scripts.map(s => s.value)).toEqual(['01', '02', '03']);
    });

    it('should auto-select and load first script if available', fakeAsync(() => {
      mockFs.readdirSync.and.returnValue(['01']);
      mockFs.existsSync.and.returnValue(true);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(null, path.includes('script.json') ? SCRIPT_JSON : SLIDE_MATCHES_JSON);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      fixture.detectChanges();
      tick();

      expect(component.selectedScript).toBe('01');
      expect(scriptConversionService.loadDocument).toHaveBeenCalled();
    }));
  });

  describe('Script Selection', () => {
    beforeEach(() => {
      component.selectedScript = '01';
    });

    it('should return early if no script is selected', async () => {
      component.selectedScript = null;

      await component.onScriptSelected();

      expect(store.dispatch).not.toHaveBeenCalled();
      expect(scriptConversionService.loadDocument).not.toHaveBeenCalled();
    });

    it('should dispatch scriptSelected action when script is selected', async () => {
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(null, path.includes('script.json') ? SCRIPT_JSON : SLIDE_MATCHES_JSON);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      await component.onScriptSelected();

      expect(store.dispatch).toHaveBeenCalledWith(scriptSelected({ scriptId: '01' }));
    });

    it('should set isLoading to true during loading and false after', fakeAsync(() => {
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        setTimeout(() => callback(null, SCRIPT_JSON), 10);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      expect(component.isLoading).toBeFalse();

      const promise = component.onScriptSelected();
      expect(component.isLoading).toBeTrue();

      tick(20);
      promise.then(() => {
        expect(component.isLoading).toBeFalse();
      });
      tick();
    }));

    it('should load script_edited.json if it exists', fakeAsync(() => {
      mockFs.existsSync.and.returnValue(true);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(null, SCRIPT_EDITED_JSON);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      component.onScriptSelected();
      tick();

      expect(mockFs.readFile).toHaveBeenCalledWith(
        `${SCRIPT_ROOT_DIR}/01/script_edited.json`,
        'utf8',
        jasmine.any(Function)
      );
      expect(scriptConversionService.loadDocument).toHaveBeenCalledWith(
        undefined,
        undefined,
        SCRIPT_EDITED_JSON
      );
    }));

    it('should load script.json and slide_matches.json if script_edited.json does not exist', fakeAsync(() => {
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        if (path.includes('script.json')) {
          callback(null, SCRIPT_JSON);
        } else if (path.includes('slide_matches.json')) {
          callback(null, SLIDE_MATCHES_JSON);
        }
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      component.onScriptSelected();
      tick();

      expect(scriptConversionService.loadDocument).toHaveBeenCalledWith(
        SCRIPT_JSON,
        SLIDE_MATCHES_JSON,
        undefined
      );
    }));

    it('should dispatch slidesLoaded and scriptDataLoaded actions', fakeAsync(() => {
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(null, path.includes('script.json') ? SCRIPT_JSON : SLIDE_MATCHES_JSON);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      component.onScriptSelected();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(slidesLoaded({ slides: mockSlides }));
      
      // Verify scriptDataLoaded was called with correct scriptId and array of paragraphs
      const scriptDataLoadedCall = (store.dispatch as jasmine.Spy).calls.all()
        .find(call => call.args[0].type === scriptDataLoaded.type);
      expect(scriptDataLoadedCall).toBeDefined();
      expect(scriptDataLoadedCall?.args[0].scriptId).toBe('01');
      expect(Array.isArray(scriptDataLoadedCall?.args[0].paragraphs)).toBeTrue();
      expect(scriptDataLoadedCall?.args[0].paragraphs.length).toBe(2);
    }));

    it('should handle errors during script loading', fakeAsync(() => {
      const consoleErrorSpy = spyOn(console, 'error');
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(new Error('File read error'), null);
      });

      component.onScriptSelected();
      tick();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading script "01":',
        jasmine.objectContaining({ message: jasmine.any(String) })
      );
      expect(component.isLoading).toBeFalse();
    }));

    it('should not dispatch actions if script selection changed during loading', fakeAsync(() => {
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        setTimeout(() => callback(null, SCRIPT_JSON), 10);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      component.onScriptSelected();
      tick(5);
      component.selectedScript = '02'; // Change script during loading
      tick(10);

      // Should not dispatch scriptDataLoaded for '01'
      const dispatchCalls = (store.dispatch as jasmine.Spy).calls.all();
      const scriptDataLoadedCalls = dispatchCalls.filter(call =>
        call.args[0].type === scriptDataLoaded.type
      );
      expect(scriptDataLoadedCalls.length).toBe(0);
    }));
  });

  describe('Save Script', () => {
    beforeEach(() => {
      component.selectedScript = '01';
      store.overrideSelector(selectParagraphs, mockParagraphs);
    });

    it('should return early if no script is selected', () => {
      component.selectedScript = null;

      component.saveScript();

      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should write script_edited.json to correct path', fakeAsync(() => {
      mockFs.writeFile.and.callFake((path: string, data: string, encoding: string, callback: Function) => {
        callback(null);
      });

      component.saveScript();
      tick();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        `${SCRIPT_ROOT_DIR}/01/script_edited.json`,
        jasmine.any(String),
        'utf8',
        jasmine.any(Function)
      );
    }));

    it('should save paragraphs as JSON with proper formatting', fakeAsync(() => {
      let savedData: string = '';
      mockFs.writeFile.and.callFake((path: string, data: string, encoding: string, callback: Function) => {
        savedData = data;
        callback(null);
      });

      component.saveScript();
      tick();

      const parsed = JSON.parse(savedData);
      expect(parsed.content).toBeDefined();
      expect(parsed.content.length).toBe(2);
      expect(parsed.content[0].id).toBe(1);
      expect(parsed.content[0].text).toBe(INTRO_PARAGRAPH);

      // Check that data is formatted with indentation
      expect(savedData).toContain('\n  ');
    }));

    it('should dispatch scriptSaved action after saving', fakeAsync(() => {
      mockFs.writeFile.and.callFake((path: string, data: string, encoding: string, callback: Function) => {
        callback(null);
      });

      component.saveScript();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(scriptSaved());
    }));

    it('should handle write errors', fakeAsync(() => {
      const consoleErrorSpy = spyOn(console, 'error');
      mockFs.writeFile.and.callFake((path: string, data: string, encoding: string, callback: Function) => {
        callback(new Error('Write failed'));
      });

      component.saveScript();
      tick();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving script:', jasmine.any(Error));
    }));

    it('should serialize paragraph data correctly including slide candidates', fakeAsync(() => {
      const paragraphWithCandidates = [
        new Paragraph(
          1,
          'Test text',
          [new SlideCandidate(SLIDE_PAGE_001, 0.8, false)],
          [new SlideCandidate(SLIDE_PAGE_002, 0.9, true)]
        )
      ];
      store.overrideSelector(selectParagraphs, paragraphWithCandidates);

      let savedData: string = '';
      mockFs.writeFile.and.callFake((path: string, data: string, encoding: string, callback: Function) => {
        savedData = data;
        callback(null);
      });

      component.saveScript();
      tick();

      const parsed = JSON.parse(savedData);
      expect(parsed.content[0].slideCandidates.length).toBe(1);
      expect(parsed.content[0].selectedSlides.length).toBe(1);
      expect(parsed.content[0].selectedSlides[0].selected).toBeTrue();
    }));
  });

  describe('Reload Script', () => {
    it('should call onScriptSelected when reloadScript is invoked', () => {
      spyOn(component, 'onScriptSelected').and.returnValue(Promise.resolve());
      component.selectedScript = '01';

      component.reloadScript();

      expect(component.onScriptSelected).toHaveBeenCalled();
    });
  });

  describe('Private Helper Methods', () => {
    describe('hasRequiredFiles', () => {
      it('should return true when both required files exist', () => {
        mockFs.existsSync.and.returnValue(true);

        const result = component['hasRequiredFiles'](`${SCRIPT_ROOT_DIR}/01`);

        expect(result).toBeTrue();
        expect(mockFs.existsSync).toHaveBeenCalledWith(`${SCRIPT_ROOT_DIR}/01/script.json`);
        expect(mockFs.existsSync).toHaveBeenCalledWith(`${SCRIPT_ROOT_DIR}/01/slide_matches.json`);
      });

      it('should return false when script.json is missing', () => {
        mockFs.existsSync.and.callFake((path: string) => {
          return !path.includes('script.json');
        });

        const result = component['hasRequiredFiles'](`${SCRIPT_ROOT_DIR}/01`);

        expect(result).toBeFalse();
      });

      it('should return false when slide_matches.json is missing', () => {
        mockFs.existsSync.and.callFake((path: string) => {
          return !path.includes('slide_matches.json');
        });

        const result = component['hasRequiredFiles'](`${SCRIPT_ROOT_DIR}/01`);

        expect(result).toBeFalse();
      });
    });

    describe('readFileAsync', () => {
      it('should resolve with file content on successful read', async () => {
        const testContent = 'test file content';
        mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
          callback(null, testContent);
        });

        const result = await component['readFileAsync']('test.json');

        expect(result).toBe(testContent);
      });

      it('should reject with error on failed read', async () => {
        const testError = new Error('Read failed');
        mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
          callback(testError, null);
        });

        try {
          await component['readFileAsync']('test.json');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(testError);
        }
      });
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle empty scripts directory', () => {
      mockFs.readdirSync.and.returnValue([]);

      fixture.detectChanges();

      expect(component.scripts).toEqual([]);
      expect(component.selectedScript).toBeNull();
    });

    it('should handle scripts directory with only .DS_Store', () => {
      mockFs.readdirSync.and.returnValue(['.DS_Store']);
      mockFs.existsSync.and.returnValue(false);

      fixture.detectChanges();

      expect(component.scripts).toEqual([]);
    });

    it('should correctly build script options with label and value', () => {
      mockFs.readdirSync.and.returnValue(['01', '02']);
      mockFs.existsSync.and.returnValue(true);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        callback(null, path.includes('script.json') ? SCRIPT_JSON : SLIDE_MATCHES_JSON);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument([]),
        slides: []
      });

      fixture.detectChanges();

      expect(component.scripts).toEqual([
        { label: '01', value: '01' },
        { label: '02', value: '02' }
      ]);
    });

    it('should handle concurrent script selections gracefully', fakeAsync(() => {
      component.selectedScript = '01';
      mockFs.existsSync.and.returnValue(false);
      mockFs.readFile.and.callFake((path: string, encoding: string, callback: Function) => {
        setTimeout(() => callback(null, SCRIPT_JSON), 20);
      });
      scriptConversionService.loadDocument.and.returnValue({
        document: new ScriptDocument(mockParagraphs),
        slides: mockSlides
      });

      // Start loading script 01
      const promise1 = component.onScriptSelected();
      tick(10);

      // Switch to script 02 before 01 finishes
      component.selectedScript = '02';
      const promise2 = component.onScriptSelected();
      tick(20);

      // Both should complete without errors
      Promise.all([promise1, promise2]).then(() => {
        expect(component.isLoading).toBeFalse();
      });
      tick();
    }));

    it('should maintain isLoading false state when script selection is null', fakeAsync(() => {
      component.selectedScript = null;
      component.isLoading = false;

      component.onScriptSelected();
      tick();

      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('Observable Streams', () => {
    it('should emit paragraphs from store', (done) => {
      store.overrideSelector(selectParagraphs, mockParagraphs);
      store.refreshState();

      component.paragraphs$.subscribe(paragraphs => {
        expect(paragraphs).toEqual(mockParagraphs);
        done();
      });
    });

    it('should emit scriptEdited state from store', (done) => {
      store.overrideSelector(selectScriptEdited, true);
      store.refreshState();

      component.scriptEdited$.subscribe(edited => {
        expect(edited).toBeTrue();
        done();
      });
    });
  });
});
