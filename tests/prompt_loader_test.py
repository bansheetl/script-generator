import unittest

from prompt_loader import load_prompt


class PromptLoaderTest(unittest.TestCase):
    def test_loads_existing_prompt(self):
        content = load_prompt("script_lector_system")
        self.assertIn("Du bist ein Lektor", content)

    def test_missing_prompt_raises(self):
        with self.assertRaises(FileNotFoundError):
            load_prompt("does_not_exist")


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
