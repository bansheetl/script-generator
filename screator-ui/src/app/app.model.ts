
export interface Paragraph {
    id: number;
    text: string;
    slideCandidates: SlideCandidate[];
    selectedSlides: SlideCandidate[];
}

export interface SlideCandidate {
    slide_file: string;
    score: number;
    selected: boolean;
}

export interface Slide {
    slide_name: string;
    slide_file: string;
}

export interface SlideMatch {
    slide_file: string;
    results: SlideMatchResult[];
}

export interface SlideMatchResult {
    paragraph_id: string;
    score: number;
}