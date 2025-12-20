#!/usr/bin/env python3
"""
Skill Analyzer - Comprehensive analysis of skill structure and quality

Usage:
    analyze_skill.py <path/to/skill>
    analyze_skill.py <path/to/skill> --verbose
    analyze_skill.py <path/to/skill> --json

Examples:
    analyze_skill.py .claude/skills/pdf-editor
    analyze_skill.py .claude/skills/my-skill --verbose
"""

import sys
import re
import json
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


def count_lines(content: str) -> int:
    """Count non-empty lines in content."""
    return len([line for line in content.split('\n') if line.strip()])


def analyze_description(description: str) -> Dict[str, Any]:
    """Analyze frontmatter description quality."""
    issues = []
    suggestions = []
    score = 100

    if not description:
        return {'score': 0, 'issues': ['Missing description'], 'suggestions': ['Add description to frontmatter']}

    word_count = len(description.split())

    # Length checks
    if word_count < 10:
        issues.append('Description too short')
        suggestions.append('Expand description to include what the skill does and when to use it')
        score -= 30

    if word_count > 100:
        issues.append('Description may be too long')
        suggestions.append('Consider condensing to essential triggers only')
        score -= 10

    # Trigger keywords
    trigger_patterns = ['use when', 'use for', 'triggers on', 'use this', 'should be used']
    has_trigger = any(pattern in description.lower() for pattern in trigger_patterns)
    if not has_trigger:
        issues.append('Missing trigger guidance')
        suggestions.append('Add "Use when..." or similar trigger phrases')
        score -= 20

    # Action verbs
    if not re.search(r'\b(create|edit|manage|process|handle|generate|analyze|convert|build)\b', description.lower()):
        issues.append('Missing action verbs')
        suggestions.append('Include verbs describing what the skill does')
        score -= 10

    return {
        'score': max(0, score),
        'word_count': word_count,
        'has_trigger_guidance': has_trigger,
        'issues': issues,
        'suggestions': suggestions
    }


def strip_code_blocks(content: str) -> str:
    """Remove code block contents to avoid false positives."""
    return re.sub(r'```[\s\S]*?```', '', content)


def analyze_structure(body: str) -> Dict[str, Any]:
    """Analyze SKILL.md body structure."""
    issues = []
    suggestions = []
    score = 100

    lines = body.split('\n')
    line_count = count_lines(body)

    # Strip code blocks before analyzing headings
    body_no_code = strip_code_blocks(body)
    lines_no_code = body_no_code.split('\n')

    # Extract headings (outside code blocks)
    headings = [line for line in lines_no_code if line.startswith('#')]
    h1_count = len([h for h in headings if h.startswith('# ') and not h.startswith('## ')])
    h2_count = len([h for h in headings if h.startswith('## ') and not h.startswith('### ')])

    # Structure checks
    if h1_count == 0:
        issues.append('Missing main heading (H1)')
        score -= 15

    if h1_count > 1:
        issues.append(f'Multiple H1 headings ({h1_count})')
        suggestions.append('Use single H1 for skill title, H2 for sections')
        score -= 10

    if h2_count < 2:
        issues.append('Few section headings')
        suggestions.append('Add H2 sections to organize content')
        score -= 10

    # Length checks
    if line_count > 500:
        issues.append(f'Body too long ({line_count} lines)')
        suggestions.append('Move detailed content to references/')
        score -= 20

    if line_count < 20:
        issues.append('Body very short')
        suggestions.append('Add more guidance and examples')
        score -= 15

    # Code blocks
    code_blocks = len(re.findall(r'```', body)) // 2
    if code_blocks == 0 and line_count > 50:
        suggestions.append('Consider adding code examples')

    # TODO detection (outside code blocks)
    todos = len(re.findall(r'\[TODO', body_no_code, re.IGNORECASE))
    if todos > 0:
        issues.append(f'{todos} TODO items remaining')
        score -= todos * 5

    return {
        'score': max(0, score),
        'line_count': line_count,
        'h1_count': h1_count,
        'h2_count': h2_count,
        'code_blocks': code_blocks,
        'todos': todos,
        'issues': issues,
        'suggestions': suggestions
    }


def analyze_resources(skill_path: Path) -> Dict[str, Any]:
    """Analyze skill resources (scripts, references, assets)."""
    resources = {
        'scripts': [],
        'references': [],
        'assets': [],
        'other': []
    }
    issues = []
    suggestions = []

    for item in skill_path.iterdir():
        if item.name == 'SKILL.md':
            continue

        if item.is_dir():
            if item.name == 'scripts':
                resources['scripts'] = list(item.glob('*'))
            elif item.name == 'references':
                resources['references'] = list(item.glob('*'))
            elif item.name == 'assets':
                resources['assets'] = list(item.glob('*'))
            else:
                resources['other'].append(item)
        else:
            resources['other'].append(item)

    # Check for orphaned resources (would need SKILL.md content to verify)
    total_resources = sum(len(v) for v in resources.values())

    if resources['other']:
        issues.append(f"Files outside standard directories: {[f.name for f in resources['other']]}")
        suggestions.append('Move files to scripts/, references/, or assets/')

    return {
        'scripts_count': len(resources['scripts']),
        'references_count': len(resources['references']),
        'assets_count': len(resources['assets']),
        'other_count': len(resources['other']),
        'total': total_resources,
        'scripts': [f.name for f in resources['scripts']],
        'references': [f.name for f in resources['references']],
        'assets': [f.name for f in resources['assets']],
        'issues': issues,
        'suggestions': suggestions
    }


def analyze_skill(skill_path: Path) -> Dict[str, Any]:
    """Perform comprehensive skill analysis."""
    skill_md = skill_path / 'SKILL.md'

    if not skill_md.exists():
        return {
            'valid': False,
            'error': f'SKILL.md not found in {skill_path}'
        }

    content = skill_md.read_text()
    frontmatter, body = parse_frontmatter(content)

    name = frontmatter.get('name', '')
    description = frontmatter.get('description', '')

    # Run analyses
    description_analysis = analyze_description(description)
    structure_analysis = analyze_structure(body)
    resources_analysis = analyze_resources(skill_path)

    # Calculate overall score
    overall_score = (
        description_analysis['score'] * 0.3 +
        structure_analysis['score'] * 0.5 +
        (100 if not resources_analysis['issues'] else 80) * 0.2
    )

    # Collect all issues and suggestions
    all_issues = (
        description_analysis['issues'] +
        structure_analysis['issues'] +
        resources_analysis['issues']
    )
    all_suggestions = (
        description_analysis['suggestions'] +
        structure_analysis['suggestions'] +
        resources_analysis['suggestions']
    )

    return {
        'valid': True,
        'path': str(skill_path),
        'name': name,
        'overall_score': round(overall_score),
        'description': {
            'score': description_analysis['score'],
            'word_count': description_analysis.get('word_count', 0),
            'has_trigger_guidance': description_analysis.get('has_trigger_guidance', False),
            'issues': description_analysis['issues'],
            'suggestions': description_analysis['suggestions']
        },
        'structure': {
            'score': structure_analysis['score'],
            'line_count': structure_analysis['line_count'],
            'sections': structure_analysis['h2_count'],
            'code_blocks': structure_analysis['code_blocks'],
            'todos': structure_analysis['todos'],
            'issues': structure_analysis['issues'],
            'suggestions': structure_analysis['suggestions']
        },
        'resources': resources_analysis,
        'all_issues': all_issues,
        'all_suggestions': all_suggestions
    }


def print_report(analysis: Dict[str, Any], verbose: bool = False) -> None:
    """Print human-readable analysis report."""
    if not analysis.get('valid'):
        print(f"Error: {analysis.get('error')}")
        return

    print(f"\n{'='*60}")
    print(f"SKILL ANALYSIS: {analysis['name']}")
    print(f"{'='*60}")
    print(f"Path: {analysis['path']}")
    print(f"Overall Score: {analysis['overall_score']}/100")

    # Description
    desc = analysis['description']
    print(f"\n--- Description ({desc['score']}/100) ---")
    print(f"  Word count: {desc['word_count']}")
    print(f"  Has trigger guidance: {'Yes' if desc['has_trigger_guidance'] else 'No'}")

    # Structure
    struct = analysis['structure']
    print(f"\n--- Structure ({struct['score']}/100) ---")
    print(f"  Lines: {struct['line_count']}")
    print(f"  Sections (H2): {struct['sections']}")
    print(f"  Code blocks: {struct['code_blocks']}")
    if struct['todos']:
        print(f"  TODOs remaining: {struct['todos']}")

    # Resources
    res = analysis['resources']
    print(f"\n--- Resources ---")
    print(f"  Scripts: {res['scripts_count']} {res['scripts'] if verbose else ''}")
    print(f"  References: {res['references_count']} {res['references'] if verbose else ''}")
    print(f"  Assets: {res['assets_count']} {res['assets'] if verbose else ''}")

    # Issues
    if analysis['all_issues']:
        print(f"\n--- Issues ({len(analysis['all_issues'])}) ---")
        for issue in analysis['all_issues']:
            print(f"  - {issue}")

    # Suggestions
    if analysis['all_suggestions']:
        print(f"\n--- Suggestions ({len(analysis['all_suggestions'])}) ---")
        for suggestion in analysis['all_suggestions']:
            print(f"  - {suggestion}")

    print(f"\n{'='*60}\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_skill.py <path/to/skill> [--verbose] [--json]")
        sys.exit(1)

    skill_path = Path(sys.argv[1]).resolve()
    verbose = '--verbose' in sys.argv
    as_json = '--json' in sys.argv

    if not skill_path.exists():
        print(f"Error: Path not found: {skill_path}")
        sys.exit(1)

    if not skill_path.is_dir():
        print(f"Error: Path is not a directory: {skill_path}")
        sys.exit(1)

    analysis = analyze_skill(skill_path)

    if as_json:
        print(json.dumps(analysis, indent=2))
    else:
        print_report(analysis, verbose)

    # Exit code based on validity and score
    if not analysis.get('valid'):
        sys.exit(1)
    if analysis['overall_score'] < 50:
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
