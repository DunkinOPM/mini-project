"""
LLM Engine Module
Handles Gemini API integration with strict prompt design and JSON validation.
"""

import json
import os
import time
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load environment variables
load_dotenv(override=True)

# We will use the Google GenAI SDK
try:
    from google import genai
    from google.genai import types
except ImportError:
    raise ImportError("google-genai package is not installed. Please install it.")


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # Just a warning, it might be passed via environment or handled later
    print("Warning: GEMINI_API_KEY not found in environment.")

# Initialize the Gemini client
# If api_key is None, it will try to get it from the GEMINI_API_KEY environment variable automatically.
client = genai.Client(api_key=GEMINI_API_KEY)

# Use gemini-2.5-flash as default for fast structured generation
DEFAULT_MODEL = "gemini-2.5-flash"


class MatchResult(BaseModel):
    type: str = Field(description="Must be 'slide' or 'pdf'")
    id: int = Field(description="The ID of the matched document/slide")
    reason: str = Field(description="Short explanation of why this is the best match")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")


class ConceptAnnotation(BaseModel):
    concept: str = Field(description="The name of the concept extracted")
    explanation: str = Field(description="A clear and concise explanation of the concept based on the text")
    importance: str = Field(description="Importance level: 'high', 'medium', or 'low'")


class AnnotationResult(BaseModel):
    concepts: list[ConceptAnnotation] = Field(description="List of concepts extracted from the text")


def build_matching_prompt(
    segment_text: str,
    candidates: List[Dict[str, Any]],
) -> str:
    """
    Build a structured prompt for the LLM to match video content to documents.
    """
    lines = [
        "You are an AI system that links lecture video content to slides or PDF pages.",
        "",
        "Video content:",
        segment_text.strip(),
        "",
        "Candidates:",
    ]
    
    for idx, candidate in enumerate(candidates, start=1):
        doc_type = candidate.get("type", "unknown")
        doc_id = candidate.get("id", "?")
        doc_text = candidate.get("text", "").strip()
        lines.append(f"{idx}. ({doc_type} {doc_id}): {doc_text[:200]}...")
    
    lines.extend([
        "",
        "Select the BEST match from the candidates provided.",
        "Your response MUST be valid JSON conforming to the requested schema."
    ])
    
    return "\n".join(lines)


def match_segment_to_document(
    segment_text: str,
    candidates: List[Dict[str, Any]],
    model_name: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    """
    Use Gemini API to match a video segment to the best document.
    
    Args:
        segment_text: Video transcript segment
        candidates: Top-K candidate documents
        model_name: The Gemini model to use
    
    Returns:
        Match dict with type, id, reason, and confidence
    """
    if not candidates:
        raise ValueError("No candidates provided")
    
    prompt = build_matching_prompt(segment_text, candidates)
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MatchResult,
                temperature=0.1,
            ),
        )
        
        result = json.loads(response.text)
        
        # Verify that the LLM's match is one of the top K candidates
        match_valid = False
        for candidate in candidates:
            if candidate.get("type") == result.get("type") and candidate.get("id") == result.get("id"):
                match_valid = True
                break
                
        if not match_valid:
            print(f"Warning: LLM matched {result.get('type')} {result.get('id')} which is not in candidates.")
            # Fallback to best candidate but keep reasoning if possible
            best = candidates[0]
            result["type"] = best.get("type", "unknown")
            result["id"] = best.get("id", 0)
            result["reason"] = f"LLM selected invalid candidate. Fallback to best semantic match. Original reason: {result.get('reason')}"
            result["confidence"] = 0.5
            
        return result
        
    except Exception as e:
        print(f"Gemini API matching failed: {e}")
        # Fallback to best candidate
        best = candidates[0]
        return {
            "type": best.get("type", "unknown"),
            "id": best.get("id", 0),
            "reason": f"LLM API failed, using best semantic candidate: {str(e)}",
            "confidence": 0.0,
        }


def generate_annotations(
    segment_text: str,
    model_name: str = DEFAULT_MODEL,
) -> List[Dict[str, Any]]:
    """
    Generate rich concept annotations and explanations from a text segment using Gemini.
    
    Args:
        segment_text: The transcript segment text
        model_name: The Gemini model to use
        
    Returns:
        List of concept dictionaries
    """
    if not segment_text.strip():
        return []
        
    prompt = f"""
    Analyze the following lecture transcript segment and extract the key concepts.
    For each concept, provide a clear explanation and assign an importance level (high, medium, low).
    
    Transcript Segment:
    {segment_text}
    """
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnnotationResult,
                temperature=0.2,
            ),
        )
        
        result = json.loads(response.text)
        return result.get("concepts", [])
        
    except Exception as e:
        print(f"Gemini API annotation failed: {e}")
        # Fallback to basic extraction or empty
        return []
