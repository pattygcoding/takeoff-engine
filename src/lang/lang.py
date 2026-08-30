import json
import time
import threading
import sys
import os
import re
from deep_translator import GoogleTranslator
from copy import deepcopy

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
source_language = "en"

target_languages = [
    "es",
    "fr",
    "pt"
]

skip_existing = "-skip" in sys.argv or "--skip" in sys.argv
retry_failed = "-retry" in sys.argv or "--retry" in sys.argv
requested_langs = [a for a in sys.argv[1:] if a in target_languages]

def get_locale_path(lang_code):
    return os.path.join(SCRIPT_DIR, f"{lang_code}.json")

def lint_json_file(source=None):
    if source is None:
        source = get_locale_path(source_language)
    try:
        with open(source, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"{source} is valid JSON.\n")
        return data
    except json.JSONDecodeError as e:
        print(f"JSON syntax error: Line {e.lineno}, Column {e.colno}: {e.msg}")
    except FileNotFoundError:
        print(f"File not found: {source}")
    return None

def load_existing_translations(target_language):
    output_file = get_locale_path(target_language)
    try:
        with open(output_file, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        print(f"Found existing translations for '{target_language}', will reuse them.")
        return existing_data
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def collect_string_paths(obj, path=()):
    paths = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            paths.extend(collect_string_paths(v, path + (k,)))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            paths.extend(collect_string_paths(v, path + (i,)))
    elif isinstance(obj, str):
        paths.append(path)
    return paths

def set_nested_value(obj, path, value):
    for key in path[:-1]:
        obj = obj[key]
    obj[path[-1]] = value

def get_nested_value(obj, path):
    for key in path:
        obj = obj[key]
    return obj

def periodic_progress(total, progress_ref, stop_flag):
    while not stop_flag[0]:
        print(f"✔️ {progress_ref[0]}/{total} lines translated")
        time.sleep(3)

def translate_text(translator, original):
    placeholders = re.findall(r"\{\{.*?\}\}", original)
    if not placeholders:
        return translator.translate(original)

    masked_text = original
    for i, ph in enumerate(placeholders):
        masked_text = masked_text.replace(ph, f"__VAR_{i}__", 1)

    translated = translator.translate(masked_text)
    if translated:
        for i, ph in enumerate(placeholders):
            pattern = re.compile(rf"__\s*VAR\s*_\s*{i}\s*__", re.IGNORECASE)
            if pattern.search(translated):
                translated = pattern.sub(ph, translated)
            else:
                translated = translated.replace(f"__VAR_{i}__", ph)
    return translated

def translate_one_by_one(json_data, target_language, existing_translations=None):
    string_paths = collect_string_paths(json_data)
    total = len(string_paths)
    progress = [0]
    stop_flag = [False]

    print(f"\nTranslating to '{target_language}'...")
    print(f"Total strings to translate: {total}\n")

    if target_language.count("_") >= 2:
        base_lang = "_".join(target_language.split("_")[:-1])
    elif "_" in target_language:
        base_lang = target_language.split("_")[0]
    else:
        base_lang = target_language

    translator = GoogleTranslator(source=source_language, target=base_lang)
    thread = threading.Thread(target=periodic_progress, args=(total, progress, stop_flag))
    thread.start()

    for path in string_paths:
        original = get_nested_value(json_data, path)

        if not original or not original.strip() or original.strip().lower().startswith("http"):
            progress[0] += 1
            continue

        if skip_existing and existing_translations:
            try:
                existing_value = get_nested_value(existing_translations, path)
                if existing_value and existing_value.strip() != "":
                    set_nested_value(json_data, path, existing_value)
                    progress[0] += 1
                    continue
            except (KeyError, IndexError, TypeError):
                pass

        success = False
        for attempt in range(3):
            try:
                translated = translate_text(translator, original)
                if translated:
                    set_nested_value(json_data, path, translated)
                success = True
                break
            except Exception as e:
                time.sleep(0.5 * (attempt + 1))
        
        if not success:
            print(f"Failed to translate after retries: {original}")

        progress[0] += 1
        time.sleep(0.05)  # small throttle to avoid rate limits

    stop_flag[0] = True
    thread.join()
    print(f"✔️ {progress[0]}/{total} lines translated (done!)")

    return json_data

def write_pretty_json(data, target_language):
    output_file = get_locale_path(target_language)
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\nSaved translated JSON to '{output_file}'")
    except Exception as e:
        print(f"Failed to write output file: {e}")

def retry_failed_translations(base_json, existing_json, target_language):
    """Re-attempts translation only for paths where the existing target value
    still matches the English source (i.e. previously failed after retries)."""
    string_paths = collect_string_paths(base_json)
    failed_paths = []
    for path in string_paths:
        original = get_nested_value(base_json, path)
        try:
            existing_value = get_nested_value(existing_json, path)
        except (KeyError, IndexError, TypeError):
            failed_paths.append(path)
            continue
        if not original or not original.strip() or original.strip().lower().startswith("http"):
            continue
        if existing_value == original:
            failed_paths.append(path)

    total = len(failed_paths)
    print(f"\nRetrying {total} previously failed translations for '{target_language}'...")

    if target_language.count("_") >= 2:
        base_lang = "_".join(target_language.split("_")[:-1])
    elif "_" in target_language:
        base_lang = target_language.split("_")[0]
    else:
        base_lang = target_language

    translator = GoogleTranslator(source=source_language, target=base_lang)
    result = deepcopy(existing_json)
    still_failed = []

    for i, path in enumerate(failed_paths, 1):
        original = get_nested_value(base_json, path)
        success = False
        for attempt in range(5):
            try:
                translated = translate_text(translator, original)
                if translated:
                    set_nested_value(result, path, translated)
                success = True
                break
            except Exception:
                time.sleep(0.75 * (attempt + 1))

        if not success:
            still_failed.append(original)
        print(f"✔️ {i}/{total} retried")
        time.sleep(0.1)

    if still_failed:
        print(f"\nStill failed after retry ({len(still_failed)}):")
        for text in still_failed:
            print(f"  - {text}")
    else:
        print("\nAll previously failed translations recovered.")

    return result

if __name__ == "__main__":
    base_json = lint_json_file()
    if base_json is not None:
        langs_to_process = requested_langs if requested_langs else target_languages
        if retry_failed:
            for lang_code in langs_to_process:
                existing_translations = load_existing_translations(lang_code)
                if existing_translations is None:
                    print(f"No existing translation file for '{lang_code}', skipping retry.")
                    continue
                fixed_json = retry_failed_translations(base_json, existing_translations, lang_code)
                write_pretty_json(fixed_json, lang_code)
        else:
            for lang_code in langs_to_process:
                data_copy = deepcopy(base_json)
                existing_translations = load_existing_translations(lang_code) if skip_existing else None
                translated_json = translate_one_by_one(data_copy, lang_code, existing_translations)
                write_pretty_json(translated_json, lang_code)
