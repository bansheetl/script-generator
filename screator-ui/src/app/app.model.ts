export class ScriptDocument {
    constructor(public content: Paragraph[] = []) {}

    static fromJson(raw: unknown): ScriptDocument {
        const parsed = ScriptDocument.safeParse(raw);
        const items = Array.isArray(parsed?.content) ? parsed.content : [];
        const paragraphs = items.map((entry: unknown) => Paragraph.fromJson(entry));
        return new ScriptDocument(paragraphs);
    }

    static fromScript(raw: unknown): ScriptDocument {
        const parsed = ScriptDocument.safeParse(raw);
        const items = Array.isArray(parsed?.content) ? parsed.content : [];
        const paragraphs = items.map((entry: unknown) => Paragraph.fromScriptEntry(entry));
        return new ScriptDocument(paragraphs);
    }

    cloneContent(): Paragraph[] {
        return this.content.map((paragraph) => paragraph.clone());
    }

    toJSON(): unknown {
        return {
            content: this.content.map((paragraph) => paragraph.toJSON())
        };
    }

    private static safeParse(raw: unknown): any {
        return typeof raw === 'object' && raw !== null ? raw : {};
    }
}

export class Paragraph {
    constructor(
        public id: number,
        public text: string,
        public slideCandidates: SlideCandidate[] = [],
        public selectedSlides: SlideCandidate[] = []
    ) {}

    static fromJson(raw: unknown): Paragraph {
        const candidateSource = Paragraph.normalize(raw);
        const id = Paragraph.parseId(candidateSource.id);
        const text = typeof candidateSource.text === 'string' ? candidateSource.text : '';
        const slideCandidates = Paragraph.parseCandidates(candidateSource.slideCandidates, false);
        const selectedSlides = Paragraph.parseCandidates(candidateSource.selectedSlides, true);
        return new Paragraph(id, text, slideCandidates, selectedSlides);
    }

    static fromScriptEntry(raw: unknown): Paragraph {
        const candidateSource = Paragraph.normalize(raw);
        const id = Paragraph.parseId(candidateSource.id);
        const text = typeof candidateSource.text === 'string' ? candidateSource.text : '';
        return new Paragraph(id, text, [], []);
    }

    static deserialize(paragraph: Paragraph): Paragraph {
        return Paragraph.fromJson(paragraph);
    }

    clone(): Paragraph {
        return new Paragraph(
            this.id,
            this.text,
            this.slideCandidates.map((candidate) => candidate.clone()),
            this.selectedSlides.map((candidate) => candidate.clone(true))
        );
    }

    toJSON(): unknown {
        return {
            id: this.id,
            text: this.text,
            slideCandidates: this.slideCandidates.map((candidate) => candidate.toJSON()),
            selectedSlides: this.selectedSlides.map((candidate) => candidate.toJSON(true))
        };
    }

    private static normalize(raw: unknown): any {
        if (typeof raw === 'object' && raw !== null) {
            return raw;
        }
        return {};
    }

    private static parseId(value: unknown): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const numeric = parseInt(value, 10);
            if (Number.isFinite(numeric)) {
                return numeric;
            }
        }

        return 0;
    }

    private static parseCandidates(raw: unknown, defaultSelected: boolean): SlideCandidate[] {
        if (!Array.isArray(raw)) {
            return [];
        }

        return raw
            .map((entry: unknown) => SlideCandidate.fromJson(entry, defaultSelected))
            .filter((candidate) => candidate.slide_file.length > 0);
    }
}

export class SlideCandidate {
    constructor(
        public slide_file: string,
        public score: number,
        public selected: boolean = false
    ) {}

    static fromJson(raw: unknown, defaultSelected: boolean): SlideCandidate {
        if (raw instanceof SlideCandidate) {
            return raw.clone();
        }

        const normalized = SlideCandidate.normalize(raw);
        const slideFile = typeof normalized.slide_file === 'string' ? normalized.slide_file : '';
        const score = typeof normalized.score === 'number' && Number.isFinite(normalized.score)
            ? normalized.score
            : 0;
        const selected = typeof normalized.selected === 'boolean' ? normalized.selected : defaultSelected;

        return new SlideCandidate(slideFile, score, selected);
    }

    static create(slideFile: string, score: number, selected = false): SlideCandidate {
        return new SlideCandidate(slideFile, score, selected);
    }

    clone(selectedOverride?: boolean): SlideCandidate {
        const selected = selectedOverride !== undefined ? selectedOverride : this.selected;
        return new SlideCandidate(this.slide_file, this.score, selected);
    }

    toJSON(selectedOverride?: boolean): unknown {
        const selected = selectedOverride !== undefined ? selectedOverride : this.selected;
        return {
            slide_file: this.slide_file,
            score: this.score,
            selected
        };
    }

    private static normalize(raw: unknown): any {
        if (typeof raw === 'object' && raw !== null) {
            return raw;
        }
        return {};
    }
}