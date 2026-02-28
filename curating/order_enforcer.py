"""
Monotonic order enforcer for slide-to-paragraph assignments.

Ensures that slide assignments respect document order: if slide i is assigned
to paragraph p, then slide i+1 must be assigned to a paragraph >= p.

Uses a Longest Non-Decreasing Subsequence algorithm to find the maximal set
of already-valid assignments, then reassigns violating slides to valid
paragraphs using vector similarity scores as a tiebreaker.
"""

import bisect


def enforce_monotonic_order(raw_assignments, paragraphs, slide_matches):
    """Enforce monotonic paragraph ordering on slide assignments.

    Args:
        raw_assignments: dict mapping slide_file -> paragraph_id
        paragraphs: list of paragraph dicts in document order, each with "id"
        slide_matches: list of dicts from slide_matches.json, each with
            "slide_file" and "results" (list of candidate paragraphs with
            "paragraph_id" and "score")

    Returns:
        dict mapping slide_file -> paragraph_id with monotonic ordering
    """
    if not raw_assignments:
        return {}

    # Build paragraph position index: paragraph_id -> position in document
    paragraph_order = {p["id"]: idx for idx, p in enumerate(paragraphs)}
    paragraph_ids = [p["id"] for p in paragraphs]

    # Sort slides by filename (page order)
    sorted_slides = sorted(raw_assignments.keys())

    # Convert assignments to position sequence
    positions = [paragraph_order[raw_assignments[s]] for s in sorted_slides]

    # Find longest non-decreasing subsequence indices
    lnds_indices = _longest_non_decreasing_subsequence_indices(positions)
    lnds_set = set(lnds_indices)

    # Build score lookup from slide_matches: (slide_file, paragraph_id) -> score
    score_lookup = _build_score_lookup(slide_matches)

    # Build final assignments
    final = {}
    prev_pos = 0  # minimum allowed position for the next slide

    for i, slide in enumerate(sorted_slides):
        if i in lnds_set:
            # This slide is part of the valid subsequence
            pos = positions[i]
            final[slide] = raw_assignments[slide]
            prev_pos = pos
        else:
            # Find next valid slide's position to get upper bound
            next_pos = len(paragraphs) - 1
            for j in range(i + 1, len(sorted_slides)):
                if j in lnds_set:
                    next_pos = positions[j]
                    break

            # Reassign: find best candidate in [prev_pos, next_pos]
            best_para = _find_best_candidate(
                slide, prev_pos, next_pos, paragraph_ids, score_lookup
            )
            final[slide] = best_para
            prev_pos = paragraph_order[best_para]

    return final


def _longest_non_decreasing_subsequence_indices(seq):
    """Return indices of a longest non-decreasing subsequence.

    Uses O(n log n) patience sorting approach adapted for non-decreasing
    (allows equal values).
    """
    if not seq:
        return []

    n = len(seq)
    # tails[i] = smallest ending value of all non-decreasing subsequences of length i+1
    tails = []
    # For each element, store which pile it was placed in
    pile_indices = [0] * n
    # For backtracking: predecessor index
    predecessors = [-1] * n
    # Last element index in each pile
    pile_last = []

    for i, val in enumerate(seq):
        # Find the leftmost pile whose tail is strictly greater than val
        # (we allow equal, so we want the first pile with tail > val)
        pos = bisect.bisect_right(tails, val)

        if pos == len(tails):
            tails.append(val)
            pile_last.append(i)
        else:
            tails[pos] = val
            pile_last[pos] = i

        pile_indices[i] = pos
        if pos > 0:
            predecessors[i] = pile_last[pos - 1]

    # Backtrack to find the actual subsequence indices
    length = len(tails)
    result = [0] * length
    idx = pile_last[length - 1]
    for k in range(length - 1, -1, -1):
        result[k] = idx
        idx = predecessors[idx]

    return result


def _build_score_lookup(slide_matches):
    """Build a lookup dict: (slide_file, paragraph_id) -> score."""
    lookup = {}
    for match in slide_matches:
        slide_file = match["slide_file"]
        for result in match["results"]:
            para_id = result["paragraph_id"]
            # paragraph_id may be string or int in the data
            if isinstance(para_id, str):
                para_id = int(para_id)
            lookup[(slide_file, para_id)] = result["score"]
    return lookup


def _find_best_candidate(slide, min_pos, max_pos, paragraph_ids, score_lookup):
    """Find the best paragraph for a slide within position bounds.

    Searches paragraph_ids[min_pos..max_pos] for the one with the highest
    vector similarity score. Falls back to the paragraph at min_pos.
    """
    best_score = -1
    best_para = paragraph_ids[min_pos]

    for pos in range(min_pos, max_pos + 1):
        para_id = paragraph_ids[pos]
        score = score_lookup.get((slide, para_id), 0.0)
        if score > best_score:
            best_score = score
            best_para = para_id

    return best_para
