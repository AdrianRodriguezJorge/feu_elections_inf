import os
import glob
import re

tsx_files = glob.glob("src/**/*.tsx", recursive=True) + glob.glob("app/**/*.tsx", recursive=True)

forbidden_words = ["veedur", "padrón", "padron", "quórum", "quorum", "orca"]

for f in tsx_files:
    with open(f, "r", encoding="utf-8") as file:
        for line_no, line in enumerate(file, start=1):
            lower_line = line.lower()
            for word in forbidden_words:
                if word in lower_line:
                    # ignore comments or import paths if necessary, but let's see all matches
                    print(f"{f}:{line_no} [{word}]: {line.strip()}")

