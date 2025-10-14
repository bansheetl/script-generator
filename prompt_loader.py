import os


def load_prompt(prompt_name: str) -> str:
    """Return the prompt text stored in the prompts directory."""
    base_dir = os.path.dirname(__file__)
    prompt_path = os.path.join(base_dir, "prompts", f"{prompt_name}.md")
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"Prompt '{prompt_name}' not found at {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as prompt_file:
        return prompt_file.read()
