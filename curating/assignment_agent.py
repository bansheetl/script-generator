"""
Slide assignment agent.

Uses an LLM to assign each slide to its best-matching paragraph, given
vector similarity candidates from slide_matches.json and slide descriptions.
"""

import json
from tqdm import tqdm

BATCH_SIZE = 5


def assign_slides(paragraphs, slide_descriptions, slide_matches):
    """Use LLM to assign each slide to its best-matching paragraph.

    Args:
        paragraphs: list of paragraph dicts with "id" and "text"
        slide_descriptions: list of dicts with "slide_file" and "description"
        slide_matches: list of dicts with "slide_file" and "results"
            (each result has "paragraph_id", "text", "score")

    Returns:
        dict mapping slide_file -> paragraph_id
    """
    from langchain_core.messages import SystemMessage
    from llm import get_chat_model
    from prompt_loader import load_prompt

    client = get_chat_model()
    system_message = SystemMessage(content=load_prompt("assignment_agent_system"))

    para_by_id = {p["id"]: p for p in paragraphs}
    valid_ids = set(para_by_id.keys())

    # Build description lookup
    desc_lookup = {}
    for sd in slide_descriptions:
        desc_lookup[sd["slide_file"]] = sd.get("description", "")

    # Build candidate lookup from slide_matches
    candidate_lookup = {}
    for match in slide_matches:
        candidate_lookup[match["slide_file"]] = match["results"]

    # Get ordered list of slides
    all_slides = sorted(candidate_lookup.keys())

    assignments = {}
    batches = [all_slides[i:i + BATCH_SIZE] for i in range(0, len(all_slides), BATCH_SIZE)]

    for batch in tqdm(batches, desc="Assigning slides to paragraphs"):
        try:
            batch_assignments = _assign_batch(
                client, system_message, batch, desc_lookup, candidate_lookup, para_by_id
            )
            for slide_file, para_id in batch_assignments.items():
                if para_id in valid_ids:
                    assignments[slide_file] = para_id
                else:
                    # LLM returned invalid ID, fall back to top vector match
                    assignments[slide_file] = _fallback_assignment(
                        slide_file, candidate_lookup, valid_ids
                    )
        except (ValueError, json.JSONDecodeError) as e:
            tqdm.write(f"Warning: assignment failed for batch, using vector fallback: {e}")
            for slide_file in batch:
                assignments[slide_file] = _fallback_assignment(
                    slide_file, candidate_lookup, valid_ids
                )

    return assignments


def _assign_batch(client, system_message, slides, desc_lookup, candidate_lookup, para_by_id):
    """Send a batch of slides to the LLM for assignment."""
    from langchain_core.messages import HumanMessage

    user_text = _build_batch_prompt(slides, desc_lookup, candidate_lookup, para_by_id)

    response = client.invoke([
        system_message,
        HumanMessage(content=user_text),
    ])
    response_text = _extract_text(response)
    parsed = _parse_json_response(response_text)

    result = {}
    for assignment in parsed.get("zuordnungen", []):
        slide = assignment.get("folie", "")
        para_id = assignment.get("absatz_id")
        if slide and para_id is not None:
            result[slide] = int(para_id)

    return result


def _build_batch_prompt(slides, desc_lookup, candidate_lookup, para_by_id):
    """Build the user message for a batch of slides."""
    parts = ["Ordne jede Folie dem am besten passenden Absatz zu.\n"]

    for slide_file in slides:
        desc = desc_lookup.get(slide_file, "Keine Beschreibung verfügbar.")
        parts.append(f"FOLIE: {_slide_filename(slide_file)}")
        parts.append(f"Beschreibung: \"{desc}\"")
        parts.append("Kandidaten:")

        candidates = candidate_lookup.get(slide_file, [])
        for cand in candidates:
            para_id = cand["paragraph_id"]
            if isinstance(para_id, str):
                para_id = int(para_id)
            score = cand.get("score", 0)
            para = para_by_id.get(para_id)
            text_preview = para["text"][:200] if para else "?"
            parts.append(f"  - Absatz [{para_id}] (Score: {score:.2f}): \"{text_preview}\"")

        parts.append("")

    return "\n".join(parts)


def _slide_filename(slide_file):
    """Extract just the filename from a slide file path."""
    import os
    return os.path.basename(slide_file)


def _fallback_assignment(slide_file, candidate_lookup, valid_ids):
    """Return the highest-scoring valid candidate paragraph for a slide."""
    candidates = candidate_lookup.get(slide_file, [])
    best_score = -1
    best_id = None
    for cand in candidates:
        para_id = cand["paragraph_id"]
        if isinstance(para_id, str):
            para_id = int(para_id)
        if para_id in valid_ids and cand.get("score", 0) > best_score:
            best_score = cand["score"]
            best_id = para_id
    if best_id is not None:
        return best_id
    # Absolute fallback: first valid ID
    return min(valid_ids)


def _extract_text(message):
    """Extract text content from a LangChain AI message."""
    content = message.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
        return "".join(parts)
    return str(content)


def _parse_json_response(response_text):
    """Extract JSON from LLM response, handling markdown code blocks."""
    text = response_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")
