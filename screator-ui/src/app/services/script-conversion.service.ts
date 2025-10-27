import { Injectable } from '@angular/core';
import { Paragraph, ScriptDocument, SlideCandidate } from '../app.model';
import { Slide } from '../slide.model';
import { SLIDE_IMAGE_PREFIX } from '../script.constants';

interface SlideMatchResultEntry {
    paragraphId: number;
    score: number;
}

interface SlideMatchEntry {
    slideFile: string;
    slidePath: string;
    results: SlideMatchResultEntry[];
}

@Injectable({ providedIn: 'root' })
export class ScriptConversionService {
    loadDocument(scriptRaw?: string, slideMatchesRaw?: string, editedRaw?: string): { document: ScriptDocument; slides: Slide[] } {
        const editedDocument = this.tryBuildFromEdited(editedRaw);
        if (editedDocument) {
            editedDocument.content.sort((a, b) => a.id - b.id);
            const slides = this.buildSlideLibraryFromDocument(editedDocument);
            return { document: editedDocument, slides };
        }

        const scriptJson = this.safeParse(scriptRaw);
        const slideMatches = this.parseSlideMatches(slideMatchesRaw);
        const document = ScriptDocument.fromScript(scriptJson);
        this.ensureParagraphsHaveCandidates(document, slideMatches);
        document.content.sort((a, b) => a.id - b.id);

        const slides = slideMatches.length > 0
            ? this.buildSlideLibrary(slideMatches)
            : this.buildSlideLibraryFromDocument(document);

        return { document, slides };
    }

    private ensureParagraphsHaveCandidates(document: ScriptDocument, slideMatches: SlideMatchEntry[]): void {
        const paragraphsById = new Map<number, Paragraph>();

        document.content.forEach((paragraph) => {
            paragraphsById.set(paragraph.id, paragraph);
            paragraph.selectedSlides = paragraph.selectedSlides.map((candidate) => candidate.clone(true));
            paragraph.slideCandidates = paragraph.slideCandidates.map((candidate) => candidate.clone());
        });

        slideMatches.forEach((match) => {
            match.results.forEach((result) => {
                const paragraph = paragraphsById.get(result.paragraphId);
                if (!paragraph) {
                    return;
                }

                const slidePath = match.slidePath;
                const selectedIndex = paragraph.selectedSlides.findIndex((candidate) => candidate.slide_file === slidePath);
                if (selectedIndex >= 0) {
                    paragraph.selectedSlides[selectedIndex] = SlideCandidate.create(slidePath, result.score, true);
                    return;
                }

                const existingCandidate = paragraph.slideCandidates.find((candidate) => candidate.slide_file === slidePath);
                if (existingCandidate) {
                    existingCandidate.score = result.score;
                    return;
                }

                paragraph.slideCandidates.push(SlideCandidate.create(slidePath, result.score));
            });
        });

        paragraphsById.forEach((paragraph) => {
            const uniqueCandidates = new Map<string, SlideCandidate>();
            paragraph.slideCandidates.forEach((candidate) => {
                if (!uniqueCandidates.has(candidate.slide_file)) {
                    uniqueCandidates.set(candidate.slide_file, candidate.clone());
                }
            });
            paragraph.slideCandidates = Array.from(uniqueCandidates.values());
            paragraph.selectedSlides = paragraph.selectedSlides.map((candidate) => candidate.clone(true));
        });
    }

    private parseSlideMatches(slideMatchesRaw: string | undefined): SlideMatchEntry[] {
        if (!slideMatchesRaw) {
            return [];
        }

        const parsed = this.safeParse(slideMatchesRaw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((entry: unknown) => this.toSlideMatchEntry(entry))
            .filter((entry): entry is SlideMatchEntry => entry !== undefined);
    }

    private tryBuildFromEdited(editedRaw?: string): ScriptDocument | null {
        if (!editedRaw) {
            return null;
        }

        const editedJson = this.safeParse(editedRaw);
        const document = ScriptDocument.fromJson(editedJson);
        if (document.content.length === 0) {
            return null;
        }

        return document;
    }

    private toSlideMatchEntry(raw: unknown): SlideMatchEntry | undefined {
        if (typeof raw !== 'object' || raw === null) {
            return undefined;
        }

    const candidate = raw as Record<string, unknown>;
    const slideValue = candidate['slide_file'];
    const slideFile = typeof slideValue === 'string' ? slideValue : '';
        if (!slideFile) {
            return undefined;
        }

    const slidePath = this.toSlidePath(slideFile);
    const resultsSource = candidate['results'];
    const resultsRaw = Array.isArray(resultsSource) ? resultsSource : [];
        const results = resultsRaw
            .map((result: unknown) => this.toSlideMatchResult(result))
            .filter((result): result is SlideMatchResultEntry => result !== undefined);

        return { slideFile, slidePath, results };
    }

    private toSlideMatchResult(raw: unknown): SlideMatchResultEntry | undefined {
        if (typeof raw !== 'object' || raw === null) {
            return undefined;
        }

    const candidate = raw as Record<string, unknown>;
    const paragraphValue = candidate['paragraph_id'];
    const paragraphId = this.parseParagraphId(paragraphValue);
        if (!Number.isFinite(paragraphId) || paragraphId <= 0) {
            return undefined;
        }

    const scoreValue = candidate['score'];
    const score = typeof scoreValue === 'number' && Number.isFinite(scoreValue) ? scoreValue : 0;
        return { paragraphId, score };
    }

    private buildSlideLibrary(slideMatches: SlideMatchEntry[]): Slide[] {
        const seen = new Set<string>();
        const slides: Slide[] = [];

        slideMatches.forEach((match) => {
            if (seen.has(match.slidePath)) {
                return;
            }

            seen.add(match.slidePath);
            slides.push({
                slide_file: match.slidePath,
                slide_name: this.extractSlideName(match.slideFile)
            });
        });

        return slides;
    }

    private buildSlideLibraryFromDocument(document: ScriptDocument): Slide[] {
        const seen = new Set<string>();
        const slides: Slide[] = [];

        document.content.forEach((paragraph) => {
            paragraph.slideCandidates.forEach((candidate) => this.addSlideFromPath(candidate.slide_file, seen, slides));
            paragraph.selectedSlides.forEach((selected) => this.addSlideFromPath(selected.slide_file, seen, slides));
        });

        return slides.sort((a, b) => a.slide_name.localeCompare(b.slide_name));
    }

    private extractSlideName(slideFile: string): string {
        const parts = slideFile.split(/[\\/]/);
        return parts[parts.length - 1] ?? slideFile;
    }

    private toSlidePath(slideFile: string): string {
        return `${SLIDE_IMAGE_PREFIX}${slideFile}`;
    }

    private addSlideFromPath(slidePath: string, seen: Set<string>, slides: Slide[]): void {
        if (!slidePath || seen.has(slidePath)) {
            return;
        }

        seen.add(slidePath);
        slides.push({
            slide_file: slidePath,
            slide_name: this.extractSlideName(slidePath)
        });
    }

    private parseParagraphId(value: unknown): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return NaN;
    }

    private safeParse(raw: string | undefined): unknown {
        if (!raw) {
            return {};
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn('Failed to parse JSON content', error);
            return {};
        }
    }
}
