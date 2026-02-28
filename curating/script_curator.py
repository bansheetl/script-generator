"""
Stage 5: Automatic script curation.

Replaces the manual UI curation step by using LLM agents to:
1. Review paragraph cohesion (split/merge)
2. Assign slides to paragraphs
3. Enforce monotonic slide ordering

Entry point: curate_script(repository)
"""

from collections import defaultdict

from curating.cohesion_agent import analyze_cohesion, apply_cohesion_operations
from curating.assignment_agent import assign_slides
from curating.order_enforcer import enforce_monotonic_order


def curate_script(repository):
    """Run automatic curation pipeline. Produces curated-script.json."""
    if repository.read_curated_script():
        print("Script already curated")
        return

    script = repository.read_json_script()
    slide_descriptions = repository.read_slide_descriptions()
    slide_matches = repository.read_slide_matches()

    paragraphs = sorted(script["content"], key=lambda x: x["id"])

    # Stage 1: Cohesion analysis
    print("Stage 1: Analyzing paragraph cohesion...")
    operations = analyze_cohesion(paragraphs)
    restructured_paragraphs = apply_cohesion_operations(paragraphs, operations)
    print(f"Paragraphs: {len(paragraphs)} -> {len(restructured_paragraphs)} after cohesion analysis")

    # Stage 2: Slide assignment (LLM-assisted)
    print("Stage 2: Assigning slides to paragraphs...")
    raw_assignments = assign_slides(restructured_paragraphs, slide_descriptions, slide_matches)
    print(f"Assigned {len(raw_assignments)} slides to paragraphs")

    # Stage 3: Monotonic order enforcement (algorithmic)
    print("Stage 3: Enforcing monotonic slide ordering...")
    final_assignments = enforce_monotonic_order(raw_assignments, restructured_paragraphs, slide_matches)

    # Count how many assignments changed
    changed = sum(1 for s in raw_assignments if raw_assignments[s] != final_assignments.get(s))
    print(f"Order enforcement: {changed} slide(s) reassigned for monotonicity")

    # Build output
    curated = build_output(restructured_paragraphs, final_assignments, slide_matches)
    repository.save_curated_script(curated)
    print("Curation complete")


def build_output(paragraphs, final_assignments, slide_matches):
    """Build the curated script JSON in the format expected by script_generator_edited.py.

    Args:
        paragraphs: list of paragraph dicts in document order
        final_assignments: dict mapping slide_file -> paragraph_id
        slide_matches: list of dicts from slide_matches.json

    Returns:
        dict with "content" and "deletedSlides" keys
    """
    # Invert assignments: paragraph_id -> [slide_file, ...]
    para_to_slides = defaultdict(list)
    for slide_file, para_id in final_assignments.items():
        para_to_slides[para_id].append(slide_file)

    # Sort slides within each paragraph by filename (preserves page order)
    for para_id in para_to_slides:
        para_to_slides[para_id].sort()

    # Build slide score lookup from slide_matches
    score_lookup = _build_score_lookup(slide_matches)

    content = []
    for paragraph in paragraphs:
        pid = paragraph["id"]
        assigned = para_to_slides.get(pid, [])

        # Build selectedSlides for assigned slides
        selected_slides = []
        for sf in assigned:
            score = score_lookup.get((sf, pid), 0.0)
            selected_slides.append({
                "slide_file": sf,
                "score": score,
                "selected": True,
            })

        # Build slideCandidates: vector-matched but not selected
        candidate_slides = []
        for match in slide_matches:
            for result in match["results"]:
                result_pid = result["paragraph_id"]
                if isinstance(result_pid, str):
                    result_pid = int(result_pid)
                if result_pid == pid:
                    sf = match["slide_file"]
                    if sf not in assigned:
                        candidate_slides.append({
                            "slide_file": sf,
                            "score": result["score"],
                            "selected": False,
                        })

        content.append({
            "id": pid,
            "text": paragraph["text"],
            "slideCandidates": candidate_slides,
            "selectedSlides": selected_slides,
        })

    return {
        "content": content,
        "deletedSlides": [],
    }


def _build_score_lookup(slide_matches):
    """Build a lookup dict: (slide_file, paragraph_id) -> score."""
    lookup = {}
    for match in slide_matches:
        slide_file = match["slide_file"]
        for result in match["results"]:
            para_id = result["paragraph_id"]
            if isinstance(para_id, str):
                para_id = int(para_id)
            lookup[(slide_file, para_id)] = result["score"]
    return lookup
