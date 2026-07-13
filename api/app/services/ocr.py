import io
import re
import sys
import pytesseract
from PIL import Image

if sys.platform.startswith('win'):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def parse_mcq_text(text: str) -> dict:
    """Parse MCQ from OCR text. Returns a dict with stem and options."""
    lines = text.split("\n")
    i = 0
    n = len(lines)
    
    stem = ""
    options = {}
    
    while i < n:
        line = lines[i].strip()
        i += 1
        if not line:
            continue
            
        # Detect: Q.digit text  or  "digit. text" (question start)
        m = re.match(r"^(?:Q[.)]?\s*)?(\d{1,3})\s*[.)\]]?\s*(.*)", line, re.IGNORECASE)
        if m:
            stem = m.group(2).strip()
            # Collect options and remainder of stem
            while i < n:
                nxt = lines[i].strip()
                if not nxt:
                    i += 1
                    continue
                    
                # New question? Just break, we only extract the first one found
                if re.match(r"^(?:Q[.)]?\s*)?(\d{1,3})\s*[.)\]]?\s*", nxt, re.IGNORECASE):
                    break
                    
                # Option line: A. text  or  A) text  or  A text
                om = re.match(r"^([A-Da-d])\s*[.)\],;]?\s*(.+)", nxt)
                if om and len(nxt) < 200:
                    key = om.group(1).upper()
                    val = om.group(2).strip()
                    if val and key not in options:
                        options[key] = val
                        i += 1
                        continue
                        
                # Append to stem
                stem += " " + nxt
                i += 1
            break # We only parse the first question found in the image

        # If we didn't find a Q start, but we see an option line, we missed the Q start.
        # So we just treat everything before the first option as the stem.
        om = re.match(r"^([A-Da-d])\s*[.)\],;]?\s*(.+)", line)
        if om and len(line) < 200:
            key = om.group(1).upper()
            val = om.group(2).strip()
            if val and key not in options:
                options[key] = val
                # Now collect the rest of the options
                while i < n:
                    nxt = lines[i].strip()
                    if not nxt:
                        i += 1
                        continue
                    om2 = re.match(r"^([A-Da-d])\s*[.)\],;]?\s*(.+)", nxt)
                    if om2 and len(nxt) < 200:
                        key2 = om2.group(1).upper()
                        val2 = om2.group(2).strip()
                        if val2 and key2 not in options:
                            options[key2] = val2
                            i += 1
                            continue
                    # If it's not an option, maybe it belongs to the previous option or stem?
                    # Keep it simple: ignore or append to last option
                    i += 1
            break
        else:
            # Append to stem if no Q marker found yet
            stem += " " + line

    stem = re.sub(r"\s+", " ", stem).strip()
    # Clean watermarks
    stem = re.sub(r"camscanner|www\.\S+", "", stem, flags=re.IGNORECASE).strip()

    # Fill missing options
    for k in ["A", "B", "C", "D"]:
        options.setdefault(k, "")
        
    # Clean up options
    for k, v in options.items():
        options[k] = re.sub(r"\s+", " ", v).strip()

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
