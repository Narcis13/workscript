#!/usr/bin/env python3
"""
Enhancement Validator - Validate skill enhancements against original

Usage:
    validate_enhancement.py <path/to/skill>
    validate_enhancement.py <path/to/skill> --original <path/to/backup>
    validate_enhancement.py <path/to/skill> --strict

Examples:
    validate_enhancement.py .claude/skills/pdf-editor
    validate_enhancement.py .claude/skills/my-skill --original /tmp/my-skill-backup
"""

import sys
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional


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


def validate_frontmatter(frontmatter: Dict[str, str]) -> List[str]:
    """Validate frontmatter structure and content."""
    errors = []

    if 'name' not in frontmatter:
        errors.append("Missing required field: 'name'")
    elif not frontmatter['name']:
        errors.append("Field 'name' is empty")

    if 'description' not in frontmatter:
        errors.append("Missing required field: 'description'")
    elif not frontmatter['description']:
        errors.append("Field 'description' is empty")
    elif len(frontmatter['description']) < 20:
        errors.append("Description too short (minimum 20 characters)")

    # Check for invalid fields
    valid_fields = {'name', 'description', 'license'}
    for field in frontmatter:
        if field not in valid_fields:
            errors.append(f"Unknown frontmatter field: '{field}'")

    return errors


def strip_code_blocks(content: str) -> str:
    """Remove code block contents to avoid false positives."""
    return re.sub(r'```[\s\S]*?```', '', content)


def validate_structure(body: str) -> List[str]:
    """Validate SKILL.md body structure."""
    errors = []

    lines = body.split('\n')
    line_count = len([l for l in lines if l.strip()])

    # Check for minimum content
    if line_count < 10:
        errors.append("Body too short (minimum 10 non-empty lines)")

    # Check for maximum length
    if line_count > 500:
        errors.append(f"Body too long ({line_count} lines, maximum 500)")

    # Strip code blocks before analyzing headings
    body_no_code = strip_code_blocks(body)
    lines_no_code = body_no_code.split('\n')

    # Check heading structure (outside code blocks)
    headings = [l for l in lines_no_code if l.startswith('#')]
    h1_headings = [h for h in headings if h.startswith('# ') and not h.startswith('## ')]

    if len(h1_headings) == 0:
        errors.append("Missing main heading (H1)")
    elif len(h1_headings) > 1:
        errors.append(f"Multiple H1 headings found ({len(h1_headings)})")

    # Check for unclosed code blocks
    code_block_count = body.count('```')
    if code_block_count % 2 != 0:
        errors.append("Unclosed code block detected")

    # Check for TODO items (outside code blocks)
    todos = re.findall(r'\[TODO[^\]]*\]', body_no_code, re.IGNORECASE)
    if todos:
        errors.append(f"{len(todos)} TODO items still present")

    return errors


def validate_resources(skill_path: Path, body: str) -> List[str]:
    """Validate resource files and references."""
    errors = []

    # Strip code blocks before checking references
    body_no_code = strip_code_blocks(body)

    # Find all file references in body (more precise regex)
    file_refs = re.findall(r'(?:scripts|references|assets)/[\w\-\.]+(?:\.py|\.md|\.txt|\.json|\.yaml|\.sh)?', body_no_code)

    for ref in file_refs:
        ref_path = skill_path / ref
        if not ref_path.exists():
            errors.append(f"Referenced file not found: {ref}")

    # Check for orphaned resources
    for subdir in ['scripts', 'references', 'assets']:
        dir_path = skill_path / subdir
        if dir_path.exists():
            for file in dir_path.iterdir():
                if file.name.startswith('.'):
                    continue
                rel_path = f"{subdir}/{file.name}"
                if rel_path not in body and file.name not in body:
                    errors.append(f"Potentially orphaned resource: {rel_path}")

    return errors


def validate_no_regression(current_path: Path, original_path: Path) -> List[str]:
    """Compare enhanced skill against original for regressions."""
    errors = []

    current_skill = current_path / 'SKILL.md'
    original_skill = original_path / 'SKILL.md'

    if not original_skill.exists():
        return [f"Original SKILL.md not found: {original_skill}"]

    current_content = current_skill.read_text()
    original_content = original_skill.read_text()

    current_fm, current_body = parse_frontmatter(current_content)
    original_fm, original_body = parse_frontmatter(original_content)

    # Check name hasn't changed unexpectedly
    if current_fm.get('name') != original_fm.get('name'):
        errors.append(f"Skill name changed: '{original_fm.get('name')}' → '{current_fm.get('name')}'")

    # Check for major content loss (more than 30% reduction)
    current_lines = len([l for l in current_body.split('\n') if l.strip()])
    original_lines = len([l for l in original_body.split('\n') if l.strip()])

    if original_lines > 0:
        reduction = (original_lines - current_lines) / original_lines
        if reduction > 0.3:
            errors.append(f"Significant content reduction: {original_lines} → {current_lines} lines ({reduction*100:.1f}% reduction)")

    # Check for removed sections
    original_headings = set(re.findall(r'^##\s+(.+)$', original_body, re.MULTILINE))
    current_headings = set(re.findall(r'^##\s+(.+)$', current_body, re.MULTILINE))

    removed_sections = original_headings - current_headings
    if removed_sections:
        errors.append(f"Sections removed: {', '.join(removed_sections)}")

    # Check for removed resources
    for subdir in ['scripts', 'references', 'assets']:
        original_dir = original_path / subdir
        current_dir = current_path / subdir

        if original_dir.exists():
            original_files = set(f.name for f in original_dir.iterdir())
            current_files = set(f.name for f in current_dir.iterdir()) if current_dir.exists() else set()

            removed_files = original_files - current_files
            if removed_files:
                errors.append(f"Files removed from {subdir}/: {', '.join(removed_files)}")

    return errors


def validate_skill(skill_path: Path, original_path: Optional[Path] = None, strict: bool = False) -> Dict[str, Any]:
    """Perform comprehensive validation of enhanced skill."""
    skill_md = skill_path / 'SKILL.md'

    if not skill_md.exists():
        return {
            'valid': False,
            'errors': [f'SKILL.md not found in {skill_path}'],
            'warnings': []
        }

    content = skill_md.read_text()
    frontmatter, body = parse_frontmatter(content)

    errors = []
    warnings = []

    # Frontmatter validation
    fm_errors = validate_frontmatter(frontmatter)
    errors.extend(fm_errors)

    # Structure validation
    struct_errors = validate_structure(body)
    errors.extend(struct_errors)

    # Resource validation
    res_errors = validate_resources(skill_path, body)
    if strict:
        errors.extend(res_errors)
    else:
        warnings.extend(res_errors)

    # Regression check if original provided
    if original_path:
        reg_errors = validate_no_regression(skill_path, original_path)
        if strict:
            errors.extend(reg_errors)
        else:
            warnings.extend(reg_errors)

    return {
        'valid': len(errors) == 0,
        'path': str(skill_path),
        'name': frontmatter.get('name', 'unknown'),
        'errors': errors,
        'warnings': warnings
    }


def print_report(result: Dict[str, Any]) -> None:
    """Print validation report."""
    status = "VALID" if result['valid'] else "INVALID"
    print(f"\n{'='*60}")
    print(f"ENHANCEMENT VALIDATION: {result.get('name', 'unknown')}")
    print(f"{'='*60}")
    print(f"Path: {result['path']}")
    print(f"Status: {status}")

    if result['errors']:
        print(f"\n--- Errors ({len(result['errors'])}) ---")
        for error in result['errors']:
            print(f"  [ERROR] {error}")

    if result['warnings']:
        print(f"\n--- Warnings ({len(result['warnings'])}) ---")
        for warning in result['warnings']:
            print(f"  [WARN] {warning}")

    if result['valid'] and not result['warnings']:
        print("\n  All validations passed.")

    print(f"\n{'='*60}\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: validate_enhancement.py <path/to/skill> [--original <path>] [--strict]")
        sys.exit(1)

    skill_path = Path(sys.argv[1]).resolve()
    original_path = None
    strict = '--strict' in sys.argv

    # Parse --original argument
    if '--original' in sys.argv:
        idx = sys.argv.index('--original')
        if idx + 1 < len(sys.argv):
            original_path = Path(sys.argv[idx + 1]).resolve()

    if not skill_path.exists():
        print(f"Error: Path not found: {skill_path}")
        sys.exit(1)

    result = validate_skill(skill_path, original_path, strict)
    print_report(result)

    sys.exit(0 if result['valid'] else 1)


if __name__ == "__main__":
    main()
