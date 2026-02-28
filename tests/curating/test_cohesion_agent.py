import unittest
from curating.cohesion_agent import apply_cohesion_operations, _create_batches, _parse_json_response


class TestApplyCohesionOperations(unittest.TestCase):

    def _make_paragraphs(self, texts):
        return [{"id": i + 1, "text": t} for i, t in enumerate(texts)]

    def test_keep_all(self):
        paragraphs = self._make_paragraphs(["A", "B", "C"])
        operations = [
            {"aktion": "behalten", "id": 1},
            {"aktion": "behalten", "id": 2},
            {"aktion": "behalten", "id": 3},
        ]
        result = apply_cohesion_operations(paragraphs, operations)
        self.assertEqual(len(result), 3)
        self.assertEqual([p["text"] for p in result], ["A", "B", "C"])

    def test_split_paragraph(self):
        paragraphs = self._make_paragraphs(["A", "B first. B second.", "C"])
        operations = [
            {"aktion": "behalten", "id": 1},
            {"aktion": "aufteilen", "id": 2, "text_teil_1": "B first.", "text_teil_2": "B second."},
            {"aktion": "behalten", "id": 3},
        ]
        result = apply_cohesion_operations(paragraphs, operations)
        self.assertEqual(len(result), 4)
        self.assertEqual(result[0]["text"], "A")
        self.assertEqual(result[1]["id"], 2)
        self.assertEqual(result[1]["text"], "B first.")
        self.assertEqual(result[2]["id"], 4)  # new id = max(3) + 1
        self.assertEqual(result[2]["text"], "B second.")
        self.assertEqual(result[3]["text"], "C")

    def test_merge_paragraphs(self):
        paragraphs = self._make_paragraphs(["A", "B", "C", "D"])
        operations = [
            {"aktion": "behalten", "id": 1},
            {"aktion": "zusammenfuehren", "ids": [2, 3]},
            {"aktion": "behalten", "id": 4},
        ]
        result = apply_cohesion_operations(paragraphs, operations)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0]["text"], "A")
        self.assertEqual(result[1]["id"], 2)
        self.assertEqual(result[1]["text"], "B\n\nC")
        self.assertEqual(result[2]["text"], "D")

    def test_split_with_missing_texts_falls_back(self):
        paragraphs = self._make_paragraphs(["A", "B"])
        operations = [
            {"aktion": "behalten", "id": 1},
            {"aktion": "aufteilen", "id": 2, "text_teil_1": "", "text_teil_2": ""},
        ]
        result = apply_cohesion_operations(paragraphs, operations)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[1]["text"], "B")  # kept original

    def test_merge_nonexistent_id_is_ignored(self):
        paragraphs = self._make_paragraphs(["A", "B"])
        operations = [
            {"aktion": "zusammenfuehren", "ids": [1, 99]},
            {"aktion": "behalten", "id": 2},
        ]
        result = apply_cohesion_operations(paragraphs, operations)
        # Merge is ignored since id 99 doesn't exist
        self.assertEqual(len(result), 2)

    def test_empty_operations_keeps_all(self):
        paragraphs = self._make_paragraphs(["A", "B"])
        result = apply_cohesion_operations(paragraphs, [])
        self.assertEqual(len(result), 2)

    def test_mixed_operations(self):
        paragraphs = self._make_paragraphs(["A", "B", "C first. C second.", "D", "E"])
        operations = [
            {"aktion": "zusammenfuehren", "ids": [1, 2]},
            {"aktion": "aufteilen", "id": 3, "text_teil_1": "C first.", "text_teil_2": "C second."},
            {"aktion": "behalten", "id": 4},
            {"aktion": "behalten", "id": 5},
        ]
        result = apply_cohesion_operations(paragraphs, operations)
        self.assertEqual(len(result), 5)
        self.assertEqual(result[0]["text"], "A\n\nB")  # merged
        self.assertEqual(result[1]["text"], "C first.")  # split part 1
        self.assertEqual(result[2]["text"], "C second.")  # split part 2
        self.assertEqual(result[3]["text"], "D")
        self.assertEqual(result[4]["text"], "E")


class TestCreateBatches(unittest.TestCase):

    def test_small_input(self):
        items = [{"id": i} for i in range(3)]
        batches = _create_batches(items, batch_size=8, overlap=2)
        self.assertEqual(len(batches), 1)
        self.assertEqual(len(batches[0]), 3)

    def test_exact_batch_size(self):
        items = [{"id": i} for i in range(8)]
        batches = _create_batches(items, batch_size=8, overlap=2)
        self.assertEqual(len(batches), 1)

    def test_overlapping_batches(self):
        items = [{"id": i} for i in range(14)]
        batches = _create_batches(items, batch_size=8, overlap=2)
        self.assertEqual(len(batches), 2)
        # First batch: items 0-7, second batch: items 6-13
        self.assertEqual(batches[0][0]["id"], 0)
        self.assertEqual(batches[1][0]["id"], 6)


class TestParseJsonResponse(unittest.TestCase):

    def test_plain_json(self):
        result = _parse_json_response('{"operationen": []}')
        self.assertEqual(result, {"operationen": []})

    def test_json_in_code_block(self):
        text = '```json\n{"operationen": []}\n```'
        result = _parse_json_response(text)
        self.assertEqual(result, {"operationen": []})

    def test_json_with_surrounding_text(self):
        text = 'Here is the result:\n{"operationen": []}\nDone.'
        result = _parse_json_response(text)
        self.assertEqual(result, {"operationen": []})

    def test_invalid_json_raises(self):
        with self.assertRaises(ValueError):
            _parse_json_response("not json at all")


if __name__ == "__main__":
    unittest.main()
