"""
Paragraph cohesion agent.

Analyzes paragraphs for content cohesion and produces split/merge
recommendations using an LLM. Paragraphs that cover multiple distinct
topics are split; adjacent paragraphs on the same topic are merged.
"""

import json
from tqdm import tqdm

BATCH_SIZE = 8
OVERLAP = 2


def analyze_cohesion(paragraphs):
    """Send paragraph batches to LLM for cohesion analysis.

    Args:
        paragraphs: list of paragraph dicts with "id" and "text"

    Returns:
        list of operation dicts: keep/split/merge
    """
    from langchain_core.messages import SystemMessage
    from llm import get_chat_model
    from prompt_loader import load_prompt

    client = get_chat_model()
    system_message = SystemMessage(content=load_prompt("cohesion_agent_system"))

    all_operations = []
    seen_ids = set()
    batches = _create_batches(paragraphs, BATCH_SIZE, OVERLAP)

    for batch in tqdm(batches, desc="Analyzing paragraph cohesion"):
        try:
            ops = _analyze_batch(client, system_message, batch)
            # Only add operations for IDs we haven't processed yet
            # (overlap paragraphs may appear in multiple batches)
            for op in ops:
                op_ids = _get_operation_ids(op)
                if not op_ids.intersection(seen_ids):
                    all_operations.append(op)
                    seen_ids.update(op_ids)
        except (ValueError, json.JSONDecodeError) as e:
            tqdm.write(f"Warning: cohesion analysis failed for batch, keeping paragraphs unchanged: {e}")
            for p in batch:
                if p["id"] not in seen_ids:
                    all_operations.append({"aktion": "behalten", "id": p["id"]})
                    seen_ids.add(p["id"])

    # Ensure all paragraph IDs are covered (add "keep" for any missed)
    for p in paragraphs:
        if p["id"] not in seen_ids:
            all_operations.append({"aktion": "behalten", "id": p["id"]})

    return all_operations


def apply_cohesion_operations(paragraphs, operations):
    """Apply split/merge operations to produce a restructured paragraph list.

    Args:
        paragraphs: list of paragraph dicts in document order
        operations: list of operation dicts from analyze_cohesion

    Returns:
        new list of paragraph dicts in document order with updated IDs
    """
    para_by_id = {p["id"]: dict(p) for p in paragraphs}
    para_order = [p["id"] for p in paragraphs]
    next_id = max(p["id"] for p in paragraphs) + 1

    # Index operations by their primary ID for lookup
    merge_targets = set()  # IDs consumed by merges (the later paragraph)
    splits = {}  # id -> operation
    merges = {}  # earlier_id -> operation

    for op in operations:
        action = op.get("aktion", op.get("action", "behalten"))
        if action in ("aufteilen", "split"):
            op_id = op.get("id")
            if op_id in para_by_id:
                splits[op_id] = op
        elif action in ("zusammenfuehren", "merge"):
            ids = op.get("ids", [])
            if len(ids) == 2 and all(i in para_by_id for i in ids):
                earlier = min(ids, key=lambda i: para_order.index(i))
                later = max(ids, key=lambda i: para_order.index(i))
                merges[earlier] = {"later": later, "op": op}
                merge_targets.add(later)

    result = []
    for pid in para_order:
        if pid in merge_targets:
            # This paragraph was merged into an earlier one; skip
            continue

        para = para_by_id[pid]

        if pid in merges:
            # Merge: append later paragraph's text
            later_id = merges[pid]["later"]
            later_para = para_by_id[later_id]
            merged_text = para["text"] + "\n\n" + later_para["text"]
            result.append({"id": pid, "text": merged_text})

        elif pid in splits:
            op = splits[pid]
            text1 = op.get("text_teil_1", "")
            text2 = op.get("text_teil_2", "")
            if text1 and text2:
                result.append({"id": pid, "text": text1})
                result.append({"id": next_id, "text": text2})
                next_id += 1
            else:
                # Fallback: keep original if split texts are missing
                result.append({"id": pid, "text": para["text"]})
        else:
            result.append({"id": pid, "text": para["text"]})

    return result


def _create_batches(paragraphs, batch_size, overlap):
    """Create overlapping batches of paragraphs."""
    batches = []
    step = batch_size - overlap
    for start in range(0, len(paragraphs), step):
        batch = paragraphs[start:start + batch_size]
        if batch:
            batches.append(batch)
        if start + batch_size >= len(paragraphs):
            break
    return batches


def _analyze_batch(client, system_message, batch):
    """Send a single batch to the LLM and parse the response."""
    from langchain_core.messages import HumanMessage

    user_text = "PARAGRAPHEN:\n"
    for p in batch:
        user_text += f"[ID={p['id']}] {p['text']}\n\n"

    response = client.invoke([
        system_message,
        HumanMessage(content=user_text),
    ])
    response_text = _extract_text(response)
    parsed = _parse_json_response(response_text)
    return parsed.get("operationen", [])


def _get_operation_ids(op):
    """Return the set of paragraph IDs involved in an operation."""
    action = op.get("aktion", op.get("action", ""))
    if action in ("zusammenfuehren", "merge"):
        return set(op.get("ids", []))
    op_id = op.get("id")
    return {op_id} if op_id is not None else set()


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
