import os
import json
from llm_engine import match_segment_to_document, generate_annotations

def test_gemini_integration():
    print("Testing Gemini API Integration...")
    
    # 1. Test Generate Annotations
    segment_text = "Today we are going to learn about dynamic programming, a method for solving complex problems by breaking them down into simpler subproblems. It's highly efficient because it uses memoization to cache results."
    
    print("\n--- Testing Annotations ---")
    concepts = generate_annotations(segment_text)
    print(json.dumps(concepts, indent=2))
    
    # 2. Test Alignment Matching
    candidates = [
        {"type": "slide", "id": 1, "text": "Introduction to computer science and basic algorithms."},
        {"type": "slide", "id": 2, "text": "Dynamic Programming: Breaking down problems into overlapping subproblems and caching with memoization."},
        {"type": "pdf", "id": 3, "text": "Graph theory and shortest path algorithms."}
    ]
    
    print("\n--- Testing Matching ---")
    match = match_segment_to_document(segment_text, candidates)
    print(json.dumps(match, indent=2))
    
    assert match["id"] == 2, "Failed to match the correct slide."
    assert "confidence" in match, "Missing confidence score."
    print("\n✅ All Gemini tests passed!")

if __name__ == "__main__":
    test_gemini_integration()
