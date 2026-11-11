import os
import glob
import re

tsx_files = glob.glob("src/**/*.tsx", recursive=True) + glob.glob("app/**/*.tsx", recursive=True)

patterns = [
    re.compile(r"Hash\s*Candidatura", re.IGNORECASE),
    re.compile(r"Hash\s*SHA-256", re.IGNORECASE),
    re.compile(r"candidacyHash", re.IGNORECASE),
]

for f in tsx_files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
        for p in patterns:
            matches = p.findall(content)
            if matches:
                # check if rendered in JSX
                for line_no, line in enumerate(content.splitlines(), start=1):
                    if p.search(line):
                        print(f"{f}:{line_no}: {line.strip()}")

