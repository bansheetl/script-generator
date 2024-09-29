import sys
import lectoring.script_lector as lector
import interpreting.slide_interpreter as interpreter
import matching.slide_script_matcher as matcher
import matching.script_search as script_search
import script_generator as generator
from repository import Repository


if __name__ == "__main__":

    if len(sys.argv) < 2:
        print("Usage: python main.py <input_dir>")
        sys.exit(1)

    file_path = sys.argv[1]
    
    repository = Repository(file_path)
    
    lector.lector(repository)
    interpreter.interpret_slides(repository)
    script_search.init_script_search(repository)
    matcher.match_slides_with_script(repository)
    generator.generate_script(repository)
    