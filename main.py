import sys
import os
import shutil
import lectoring.script_lector as lector
import interpreting.slide_interpreter as interpreter
import matching.slide_script_matcher as matcher
import matching.script_search as script_search
import curating.script_curator as curator
import script_generator_auto as generator
import script_generator_edited as edited_generator
from repository import Repository


def resolve_input_path(arg: str) -> str:
    """Resolve CLI argument to an input folder path.

    Accepts either a script number like '08' or a full/relative path like 'input/08'.
    Returns the normalized path string 'input/<id>'.
    """
    if not arg:
        return arg

    s = arg.strip()
    # Treat pure digits as an id
    if s.isdigit():
        return os.path.join("input", s)

    # Normalize common forms
    s = s[:-1] if s.endswith("/") else s

    # If already points to input/<id>, keep it
    if s.startswith("input/"):
        return s

    # If basename is a number, assume it's the id
    base = os.path.basename(s)
    if base.isdigit():
        return os.path.join("input", base)

    # Fallback to provided value
    return s


if __name__ == "__main__":

    if len(sys.argv) < 2:
        print("Usage: python main.py <script_number | input_dir>")
        print("Examples:")
        print("  python main.py 08")
        print("  python main.py input/08")
        sys.exit(1)

    arg = sys.argv[1]
    file_path = resolve_input_path(arg)

    repository = Repository(file_path)

    lector.lector(repository)
    interpreter.interpret_slides(repository)
    script_search.init_script_search(repository)
    matcher.match_slides_with_script(repository)
    curator.curate_script(repository)

    # If no human-edited version exists, use the curated output
    curated_path = os.path.join(repository.folder_name, "curated-script.json")
    edited_path = os.path.join(repository.folder_name, "script_edited.json")
    if os.path.exists(curated_path) and not os.path.exists(edited_path):
        shutil.copy2(curated_path, edited_path)
        print(f"Copied curated script to {edited_path}")

    if os.path.exists(edited_path):
        edited_generator.create_asciidoc_script(edited_path)
    else:
        generator.generate_script(repository)
    