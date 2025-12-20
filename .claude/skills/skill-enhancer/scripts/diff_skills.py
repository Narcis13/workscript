#!/usr/bin/env python3
"""
Skill Diff - Compare two skill versions

Usage:
    diff_skills.py <original> <enhanced>
    diff_skills.py <original> <enhanced> --summary
    diff_skills.py <original> <enhanced> --json

Examples:
    diff_skills.py /tmp/my-skill-backup .claude/skills/my-skill
    diff_skills.py .claude/skills/old-version .claude/skills/new-version --summary
"""

import sys
import json
import difflib
from pathlib import Path
from typing import Dict, List, Any, Tuple


def parse_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
    """Extract YAML frontmatter and body from SKILL.md content."""
    if not content.startswith('---'):
        return {}, content

    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content

    frontmatter = {}
    for line in parts[1].strip().split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            frontmatter[key.strip()] = value.strip()

    return frontmatter, parts[2].strip()


def get_file_list(skill_path: Path) -> Dict[str, List[str]]:
    """Get categorized list of files in skill directory."""
    files = {
        'root': [],
        'scripts': [],
        'references': [],
        'assets': [],
        'other': []
    }

    for item in skill_path.iterdir():
        if item.name.startswith('.'):
            continue

        if item.is_file():
            files['root'].append(item.name)
        elif item.is_dir():
            if item.name in ['scripts', 'references', 'assets']:
                files[item.name] = [f.name for f in item.iterdir() if not f.name.startswith('.')]
            else:
                files['other'].extend([f"{item.name}/{f.name}" for f in item.iterdir()])

    return files


def diff_text(original: str, enhanced: str, context: int = 3) -> List[str]:
    """Generate unified diff between two text contents."""
    original_lines = original.splitlines(keepends=True)
    enhanced_lines = enhanced.splitlines(keepends=True)

    diff = difflib.unified_diff(
        original_lines,
        enhanced_lines,
        fromfile='original',
        tofile='enhanced',
        n=context
    )

    return list(diff)


def count_changes(diff_lines: List[str]) -> Dict[str, int]:
    """Count additions and deletions in diff output."""
    additions = 0
    deletions = 0

    for line in diff_lines:
        if line.startswith('+') and not line.startswith('+++'):
            additions += 1
        elif line.startswith('-') and not line.startswith('---'):
            deletions += 1

    return {
        'additions': additions,
        'deletions': deletions,
        'total_changes': additions + deletions
    }


def compare_skills(original_path: Path, enhanced_path: Path) -> Dict[str, Any]:
    """Compare two skill versions comprehensively."""
    result = {
        'original_path': str(original_path),
        'enhanced_path': str(enhanced_path),
        'frontmatter_changes': {},
        'body_changes': {},
        'file_changes': {},
        'summary': {}
    }

    # Check SKILL.md exists in both
    original_skill = original_path / 'SKILL.md'
    enhanced_skill = enhanced_path / 'SKILL.md'

    if not original_skill.exists():
        result['error'] = f"Original SKILL.md not found: {original_skill}"
        return result

    if not enhanced_skill.exists():
        result['error'] = f"Enhanced SKILL.md not found: {enhanced_skill}"
        return result

    # Read and parse both
    original_content = original_skill.read_text()
    enhanced_content = enhanced_skill.read_text()

    original_fm, original_body = parse_frontmatter(original_content)
    enhanced_fm, enhanced_body = parse_frontmatter(enhanced_content)

    # Compare frontmatter
    fm_changes = {}
    all_keys = set(original_fm.keys()) | set(enhanced_fm.keys())

    for key in all_keys:
        orig_val = original_fm.get(key)
        enh_val = enhanced_fm.get(key)

        if orig_val != enh_val:
            fm_changes[key] = {
                'original': orig_val,
                'enhanced': enh_val,
                'status': 'modified' if orig_val and enh_val else ('added' if enh_val else 'removed')
            }

    result['frontmatter_changes'] = fm_changes

    # Compare body
    body_diff = diff_text(original_body, enhanced_body)
    body_stats = count_changes(body_diff)

    result['body_changes'] = {
        'diff': ''.join(body_diff) if body_diff else None,
        'statistics': body_stats,
        'original_lines': len([l for l in original_body.split('\n') if l.strip()]),
        'enhanced_lines': len([l for l in enhanced_body.split('\n') if l.strip()])
    }

    # Compare files
    original_files = get_file_list(original_path)
    enhanced_files = get_file_list(enhanced_path)

    file_changes = {
        'added': {},
        'removed': {},
        'modified': {}
    }

    for category in ['scripts', 'references', 'assets']:
        orig_set = set(original_files.get(category, []))
        enh_set = set(enhanced_files.get(category, []))

        added = enh_set - orig_set
        removed = orig_set - enh_set
        common = orig_set & enh_set

        if added:
            file_changes['added'][category] = list(added)
        if removed:
            file_changes['removed'][category] = list(removed)

        # Check for modifications in common files
        modified = []
        for filename in common:
            orig_file = original_path / category / filename
            enh_file = enhanced_path / category / filename

            if orig_file.exists() and enh_file.exists():
                try:
                    if orig_file.read_text() != enh_file.read_text():
                        modified.append(filename)
                except:
                    pass

        if modified:
            file_changes['modified'][category] = modified

    result['file_changes'] = file_changes

    # Generate summary
    total_fm_changes = len(fm_changes)
    total_file_adds = sum(len(v) for v in file_changes['added'].values())
    total_file_removes = sum(len(v) for v in file_changes['removed'].values())
    total_file_mods = sum(len(v) for v in file_changes['modified'].values())

    result['summary'] = {
        'frontmatter_fields_changed': total_fm_changes,
        'body_lines_added': body_stats['additions'],
        'body_lines_removed': body_stats['deletions'],
        'files_added': total_file_adds,
        'files_removed': total_file_removes,
        'files_modified': total_file_mods,
        'has_changes': (
            total_fm_changes > 0 or
            body_stats['total_changes'] > 0 or
            total_file_adds > 0 or
            total_file_removes > 0 or
            total_file_mods > 0
        )
    }

    return result


def print_summary(result: Dict[str, Any]) -> None:
    """Print summary of changes."""
    if 'error' in result:
        print(f"Error: {result['error']}")
        return

    summary = result['summary']
    print(f"\n{'='*60}")
    print("SKILL COMPARISON SUMMARY")
    print(f"{'='*60}")
    print(f"Original: {result['original_path']}")
    print(f"Enhanced: {result['enhanced_path']}")
    print()

    if not summary['has_changes']:
        print("  No changes detected.")
    else:
        print(f"  Frontmatter fields changed: {summary['frontmatter_fields_changed']}")
        print(f"  Body lines added: {summary['body_lines_added']}")
        print(f"  Body lines removed: {summary['body_lines_removed']}")
        print(f"  Files added: {summary['files_added']}")
        print(f"  Files removed: {summary['files_removed']}")
        print(f"  Files modified: {summary['files_modified']}")

    print(f"\n{'='*60}\n")


def print_full_report(result: Dict[str, Any]) -> None:
    """Print detailed comparison report."""
    if 'error' in result:
        print(f"Error: {result['error']}")
        return

    print(f"\n{'='*60}")
    print("SKILL COMPARISON REPORT")
    print(f"{'='*60}")
    print(f"Original: {result['original_path']}")
    print(f"Enhanced: {result['enhanced_path']}")

    # Frontmatter changes
    fm_changes = result['frontmatter_changes']
    if fm_changes:
        print(f"\n--- Frontmatter Changes ---")
        for key, change in fm_changes.items():
            print(f"\n  {key} ({change['status']}):")
            if change['original']:
                print(f"    - {change['original'][:80]}...")
            if change['enhanced']:
                print(f"    + {change['enhanced'][:80]}...")

    # Body changes
    body = result['body_changes']
    print(f"\n--- Body Changes ---")
    print(f"  Original: {body['original_lines']} lines")
    print(f"  Enhanced: {body['enhanced_lines']} lines")
    print(f"  Added: +{body['statistics']['additions']} lines")
    print(f"  Removed: -{body['statistics']['deletions']} lines")

    if body['diff']:
        print(f"\n  Diff preview (first 50 lines):")
        diff_lines = body['diff'].split('\n')[:50]
        for line in diff_lines:
            print(f"    {line}")

    # File changes
    fc = result['file_changes']
    if any(fc.values()):
        print(f"\n--- File Changes ---")

        if fc['added']:
            print("  Added:")
            for cat, files in fc['added'].items():
                for f in files:
                    print(f"    + {cat}/{f}")

        if fc['removed']:
            print("  Removed:")
            for cat, files in fc['removed'].items():
                for f in files:
                    print(f"    - {cat}/{f}")

        if fc['modified']:
            print("  Modified:")
            for cat, files in fc['modified'].items():
                for f in files:
                    print(f"    ~ {cat}/{f}")

    print(f"\n{'='*60}\n")


def main():
    if len(sys.argv) < 3:
        print("Usage: diff_skills.py <original> <enhanced> [--summary] [--json]")
        sys.exit(1)

    original_path = Path(sys.argv[1]).resolve()
    enhanced_path = Path(sys.argv[2]).resolve()
    summary_only = '--summary' in sys.argv
    as_json = '--json' in sys.argv

    for path, name in [(original_path, 'Original'), (enhanced_path, 'Enhanced')]:
        if not path.exists():
            print(f"Error: {name} path not found: {path}")
            sys.exit(1)

    result = compare_skills(original_path, enhanced_path)

    if as_json:
        # Remove diff content for cleaner JSON (can be very long)
        if 'body_changes' in result and 'diff' in result['body_changes']:
            result['body_changes']['diff'] = '[diff content omitted]' if result['body_changes']['diff'] else None
        print(json.dumps(result, indent=2))
    elif summary_only:
        print_summary(result)
    else:
        print_full_report(result)

    sys.exit(0)


if __name__ == "__main__":
    main()
