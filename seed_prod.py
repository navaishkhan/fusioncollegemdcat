"""Seed the production database via the live API."""
import json
import urllib.request

BASE = "https://fusion-mdcat.vercel.app"

users = [
    {"email": "admin@fusion.edu.pk", "password": "admin123", "full_name": "Admin User", "role": "admin", "phone": ""},
    {"email": "tutor@fusion.edu.pk", "password": "tutor123", "full_name": "Dr. Ahmed", "role": "tutor", "phone": ""},
    {"email": "parent@example.com", "password": "parent123", "full_name": "Parent User", "role": "parent", "phone": ""},
]

for i in range(1, 6):
    users.append({
        "email": f"student{i}@fusion.edu.pk",
        "password": "student123",
        "full_name": f"Student {i}",
        "role": "student",
        "phone": "",
    })

for u in users:
    data = json.dumps(u).encode()
    req = urllib.request.Request(
        f"{BASE}/api/auth/register",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req)
        body = json.loads(resp.read())
        print(f"✓ {u['role']:8s} — {u['email']} (id: {body['id'][:8]}...)")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read())
        if "already registered" in err.get("detail", ""):
            print(f"  {u['role']:8s} — {u['email']} (already exists)")
        else:
            print(f"✗ {u['role']:8s} — {u['email']}: {err.get('detail', 'Unknown error')}")

print("\nDone! Login credentials:")
print("  Admin:   admin@fusion.edu.pk / admin123")
print("  Tutor:   tutor@fusion.edu.pk / tutor123")
print("  Student: student1-5@fusion.edu.pk / student123")
print("  Parent:  parent@example.com / parent123")
