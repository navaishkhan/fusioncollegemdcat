import csv
import json
import os
import ssl
import time
import urllib.request
import urllib.error
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database connection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Question

url = "postgresql+psycopg://neondb_owner:npg_pBoRIF4X0Pfs@ep-damp-river-at10akz3-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(url)
Session = sessionmaker(bind=engine)
db = Session()

API_KEYS = [
    os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
]
current_key_idx = 0
ctx = ssl.create_default_context()

def call_gemini(prompt):
    global current_key_idx
    for attempt in range(len(API_KEYS) * 3):
        key = API_KEYS[current_key_idx]
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
        data = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            resp = urllib.request.urlopen(req, timeout=60, context=ctx)
            text = json.loads(resp.read().decode())["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text.strip())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                err_body = e.read().decode()
                if "GenerateRequestsPerDay" in err_body or "Quota exceeded" in err_body:
                    current_key_idx = (current_key_idx + 1) % len(API_KEYS)
                time.sleep(2)
                continue
            elif e.code in [403, 503]:
                current_key_idx = (current_key_idx + 1) % len(API_KEYS)
                time.sleep(2)
                continue
            raise
        except Exception as e:
            current_key_idx = (current_key_idx + 1) % len(API_KEYS)
            time.sleep(2)
    return []

print("Fetching questions from database...")
questions = db.query(Question).filter(Question.is_active.is_(True)).all()
print(f"Total active questions: {len(questions)}")

# CSV Output
output_file = "C:/Users/nvais/.gemini/antigravity/brain/054640d8-2b14-4eac-bb06-dae75ba4abf1/flagged_mcqs.csv"
os.makedirs(os.path.dirname(output_file), exist_ok=True)
csv_file = open(output_file, mode="w", newline="", encoding="utf-8")
writer = csv.writer(csv_file)
writer.writerow(["Question ID", "Subject", "Issue Type", "AI Explanation", "Question Stem"])

BATCH_SIZE = 50
flagged_count = 0

print("Starting AI review...")
for i in range(0, len(questions), BATCH_SIZE):
    batch = questions[i:i+BATCH_SIZE]
    
    prompt = (
        "You are an expert QA reviewer for a medical entrance exam database. Review the following batch of MCQs.\n"
        "Identify any MCQs that are:\n"
        "1. Missing vital context (e.g., 'In the above figure...', but no figure is described)\n"
        "2. Severely garbled by OCR (e.g., 'whi1ch of the f0llowing1')\n"
        "3. Incomplete options (e.g., options are just 'a)', 'b)')\n"
        "4. Grammatically unintelligible.\n\n"
        "Return ONLY a JSON array of objects for the FLAGGED questions. If a question is perfectly fine, DO NOT include it.\n"
        "Format: [{\"index\": <index>, \"issue_type\": \"<Missing Context|OCR Garbage|Incomplete Options>\", \"reason\": \"<short explanation>\"}]\n"
        "If all questions in the batch are perfectly clear, return an empty array [].\n\n"
        "Questions:\n"
    )
    
    for idx, q in enumerate(batch):
        prompt += f"Index: {idx}\nStem: {q.stem}\n"
        if q.options:
            for k in ["A", "B", "C", "D"]:
                prompt += f"{k}: {q.options.get(k, '')} | "
        prompt += "\n---\n"
        
    try:
        flagged = call_gemini(prompt)
        if flagged:
            for f in flagged:
                idx = f.get("index")
                if idx is not None and 0 <= idx < len(batch):
                    q = batch[idx]
                    writer.writerow([
                        str(q.id), q.subject.value, f.get("issue_type", "Unknown"), 
                        f.get("reason", ""), q.stem[:200]
                    ])
                    flagged_count += 1
    except Exception as e:
        print(f"Error on batch {i}: {e}")
        
    csv_file.flush()
    if (i // BATCH_SIZE) % 5 == 0:
        print(f"Reviewed {min(i+BATCH_SIZE, len(questions))}/{len(questions)}... Flagged so far: {flagged_count}")
    time.sleep(2)

csv_file.close()
print(f"Review complete. {flagged_count} questions flagged as unclear. Saved to {output_file}")
