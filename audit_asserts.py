import json

RISKY_KEYWORDS = [
    'auth', 'token', 'password', 'input', 'user', 'permission', 'secure', 'admin', 'validate', 'check'
]

def is_risky(assert_text):
    return any(kw in assert_text.lower() for kw in RISKY_KEYWORDS)

def main():
    try:
        with open("bandit_report.json") as f:
            report = json.load(f)
    except FileNotFoundError:
        print("Error: bandit_report.json not found. Please run Bandit with JSON output first.")
        return

    risky_count = 0
    ok_count = 0
    for result in report.get("results", []):
        if result["test_id"] == "B101":  # Use of assert detected
            fname = result["filename"]
            lineno = result["line_number"]
            code = result.get("code", "").strip().replace("\n", " ")
            flag = "RISKY" if is_risky(code) else "OK"
            print(f"{flag}: {fname}:{lineno} - {code}")
            if flag == "RISKY":
                risky_count += 1
            else:
                ok_count += 1

    print(f"\nSummary: {risky_count} RISKY asserts, {ok_count} OK asserts.")

if __name__ == "__main__":
    main()