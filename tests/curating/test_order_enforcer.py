import unittest
from curating.order_enforcer import (
    enforce_monotonic_order,
    _longest_non_decreasing_subsequence_indices,
)


def _make_paragraphs(n):
    """Create a list of n paragraph dicts with sequential IDs."""
    return [{"id": i + 1, "text": f"Paragraph {i + 1}"} for i in range(n)]


def _make_slide_matches(assignments, score=0.9):
    """Create slide_matches entries for the given assignments dict.

    Each slide gets a single result entry pointing to the assigned paragraph
    with the given score.
    """
    matches = []
    for slide_file, para_id in assignments.items():
        matches.append({
            "slide_file": slide_file,
            "results": [{"paragraph_id": para_id, "score": score}],
        })
    return matches


class TestLongestNonDecreasingSubsequence(unittest.TestCase):

    def test_empty(self):
        self.assertEqual(_longest_non_decreasing_subsequence_indices([]), [])

    def test_single_element(self):
        self.assertEqual(_longest_non_decreasing_subsequence_indices([5]), [0])

    def test_already_sorted(self):
        result = _longest_non_decreasing_subsequence_indices([1, 2, 3, 4, 5])
        self.assertEqual(len(result), 5)

    def test_reverse_sorted(self):
        result = _longest_non_decreasing_subsequence_indices([5, 4, 3, 2, 1])
        self.assertEqual(len(result), 1)

    def test_with_equal_values(self):
        result = _longest_non_decreasing_subsequence_indices([1, 2, 2, 3, 3])
        self.assertEqual(len(result), 5)

    def test_mixed(self):
        # [1, 6, 3, 7] -> LNDS could be [1, 3, 7] or [1, 6, 7], length 3
        result = _longest_non_decreasing_subsequence_indices([1, 6, 3, 7])
        self.assertEqual(len(result), 3)

    def test_all_same(self):
        result = _longest_non_decreasing_subsequence_indices([3, 3, 3, 3])
        self.assertEqual(len(result), 4)


class TestEnforceMonotonicOrder(unittest.TestCase):

    def test_empty_assignments(self):
        result = enforce_monotonic_order({}, _make_paragraphs(5), [])
        self.assertEqual(result, {})

    def test_already_monotonic(self):
        paragraphs = _make_paragraphs(5)
        assignments = {
            "page_001.png": 1,
            "page_002.png": 2,
            "page_003.png": 4,
        }
        matches = _make_slide_matches(assignments)
        result = enforce_monotonic_order(assignments, paragraphs, matches)
        self.assertEqual(result, assignments)

    def test_single_violation(self):
        paragraphs = _make_paragraphs(7)
        assignments = {
            "page_001.png": 1,
            "page_002.png": 6,
            "page_003.png": 3,  # violation: 3 < 6
            "page_004.png": 7,
        }
        matches = _make_slide_matches(assignments)
        result = enforce_monotonic_order(assignments, paragraphs, matches)

        # Verify monotonicity
        sorted_slides = sorted(result.keys())
        positions = [result[s] for s in sorted_slides]
        for i in range(1, len(positions)):
            self.assertGreaterEqual(positions[i], positions[i - 1])

    def test_multiple_violations(self):
        paragraphs = _make_paragraphs(10)
        assignments = {
            "page_001.png": 5,
            "page_002.png": 2,  # violation
            "page_003.png": 8,
            "page_004.png": 3,  # violation
            "page_005.png": 9,
        }
        matches = _make_slide_matches(assignments)
        result = enforce_monotonic_order(assignments, paragraphs, matches)

        sorted_slides = sorted(result.keys())
        positions = [result[s] for s in sorted_slides]
        for i in range(1, len(positions)):
            self.assertGreaterEqual(positions[i], positions[i - 1])

    def test_all_same_paragraph(self):
        paragraphs = _make_paragraphs(5)
        assignments = {
            "page_001.png": 3,
            "page_002.png": 3,
            "page_003.png": 3,
        }
        matches = _make_slide_matches(assignments)
        result = enforce_monotonic_order(assignments, paragraphs, matches)
        # All same is valid (non-decreasing)
        self.assertEqual(result["page_001.png"], 3)
        self.assertEqual(result["page_002.png"], 3)
        self.assertEqual(result["page_003.png"], 3)

    def test_reverse_order(self):
        paragraphs = _make_paragraphs(5)
        assignments = {
            "page_001.png": 5,
            "page_002.png": 4,
            "page_003.png": 3,
            "page_004.png": 2,
            "page_005.png": 1,
        }
        matches = _make_slide_matches(assignments)
        result = enforce_monotonic_order(assignments, paragraphs, matches)

        sorted_slides = sorted(result.keys())
        positions = [result[s] for s in sorted_slides]
        for i in range(1, len(positions)):
            self.assertGreaterEqual(positions[i], positions[i - 1])

    def test_prefers_higher_score_candidate(self):
        """When reassigning a violating slide, prefer the candidate with higher vector score."""
        paragraphs = _make_paragraphs(5)
        # Sequence [1, 5, 3, 5] has LNDS [1, 3, 5] (indices 0, 2, 3)
        # so page_002 is the violator, must be reassigned to [1..3] range
        assignments = {
            "page_001.png": 1,
            "page_002.png": 5,  # violation — will be reassigned
            "page_003.png": 3,
            "page_004.png": 5,
        }
        # Give page_002 different scores for paragraphs in valid range [1,3]
        matches = [
            {"slide_file": "page_001.png", "results": [{"paragraph_id": 1, "score": 0.9}]},
            {"slide_file": "page_002.png", "results": [
                {"paragraph_id": 5, "score": 0.85},
                {"paragraph_id": 1, "score": 0.70},
                {"paragraph_id": 2, "score": 0.88},
                {"paragraph_id": 3, "score": 0.92},
            ]},
            {"slide_file": "page_003.png", "results": [{"paragraph_id": 3, "score": 0.9}]},
            {"slide_file": "page_004.png", "results": [{"paragraph_id": 5, "score": 0.9}]},
        ]
        result = enforce_monotonic_order(assignments, paragraphs, matches)

        # page_002 should be reassigned to para 3 (highest score in valid range [1, 3])
        self.assertEqual(result["page_002.png"], 3)
        # Verify overall monotonicity
        sorted_slides = sorted(result.keys())
        positions = [result[s] for s in sorted_slides]
        for i in range(1, len(positions)):
            self.assertGreaterEqual(positions[i], positions[i - 1])

    def test_string_paragraph_ids_in_matches(self):
        """slide_matches may contain string paragraph IDs."""
        paragraphs = _make_paragraphs(3)
        assignments = {
            "page_001.png": 1,
            "page_002.png": 2,
        }
        matches = [
            {"slide_file": "page_001.png", "results": [{"paragraph_id": "1", "score": 0.9}]},
            {"slide_file": "page_002.png", "results": [{"paragraph_id": "2", "score": 0.9}]},
        ]
        result = enforce_monotonic_order(assignments, paragraphs, matches)
        self.assertEqual(result["page_001.png"], 1)
        self.assertEqual(result["page_002.png"], 2)


if __name__ == "__main__":
    unittest.main()
