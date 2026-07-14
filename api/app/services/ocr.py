import io
import re
import sys
import pytesseract
from PIL import Image

if sys.platform.startswith('win'):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def parse_mcq_text(text: str) -> dict:
    """Parse MCQ from OCR text using robust option marker detection."""
    # Collapse all whitespace/newlines into a single line
    text = re.sub(r"\s+", " ", text).strip()
    
    options = {}
    
    # Find positions of option markers: A., B., C., D., or A), B), C), D)
    # Using \b or \s to ensure we don't match letters in the middle of words
    markers = list(re.finditer(r"(?:\b|\s|^)[(]?([A-D])[.)\]]+\s+", text, re.IGNORECASE))
    
    if len(markers) >= 2:
        # We found at least two option markers, we can assume this is a parsed MCQ
        extracted_stem = text[:markers[0].start()].strip()
        
        for i in range(len(markers)):
            key = markers[i].group(1).upper()
            start_pos = markers[i].end()
            end_pos = markers[i+1].start() if i + 1 < len(markers) else len(text)
            
            if key not in options:
                options[key] = text[start_pos:end_pos].strip()
                
        stem = extracted_stem
    else:
        # Fallback if no clear option markers found
        stem = text

    # Clean watermarks from stem
    stem = re.sub(r"camscanner|www\.\S+", "", stem, flags=re.IGNORECASE).strip()

    # Ensure all keys exist
    for k in ["A", "B", "C", "D"]:
        options.setdefault(k, "")
        
    return {"stem": stem, "options": options}


def extract_text_from_image(image_bytes: bytes) -> dict:
    """Runs OCR on the given image bytes and parses it."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Ensure image is in a mode Tesseract likes, e.g. RGB
        if img.mode != "RGB":
            img = img.convert("RGB")
        
        # Run Tesseract
        text = pytesseract.image_to_string(img, lang="eng", config="--psm 6")
        
        # Parse text
        return parse_mcq_text(text)
    except Exception as e:
        print(f"OCR Error: {e}")
        return {"stem": "", "options": {"A": "", "B": "", "C": "", "D": ""}}
