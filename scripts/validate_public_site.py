"""Validate exact-case local links and the downloadable public data."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'docs'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.refs = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in {'src', 'href'} and value:
                self.refs.append(value)


def main():
    files = {path.relative_to(SITE).as_posix(): path for path in SITE.rglob('*') if path.is_file()}
    errors = []
    checked = 0
    for rel, path in files.items():
        if path.stat().st_size >= 100 * 1024 * 1024:
            errors.append('Oversized file: ' + rel)
        if path.suffix in {'.docx', '.pyc'} or any(part in {'__pycache__', 'tmp', 'previews'} for part in path.relative_to(SITE).parts):
            errors.append('Excluded archive/cache file: ' + rel)
        if path.suffix in {'.html', '.js', '.py', '.md', '.json', '.csv', '.txt'}:
            text = path.read_text(encoding='utf-8-sig')
            if re.search(r'\bs4907998\b|\b49079984\b|\b(?:Yuyang|Yuyan)\s+Gong\b|[A-Z]:[\\/]Users[\\/]', text, re.I):
                errors.append('Personal identifier or local path: ' + rel)
            if re.search(r'(?m)^\s*STUDENT_(?:NAME|ID)\s*=\s*[\"\'][^\"\']+?[\"\']', text):
                errors.append('Uncleared submission metadata: ' + rel)
        if path.suffix != '.html':
            continue
        for value in Page(path.read_text(encoding='utf-8')).refs:
            url = urlsplit(value)
            if url.scheme or not url.path:
                continue
            checked += 1
            if url.path.startswith('/'):
                errors.append(f'Root-relative URL: {rel}: {value}')
                continue
            target = (path.parent / unquote(url.path)).resolve()
            if not target.is_relative_to(SITE.resolve()):
                errors.append(f'URL escapes public site: {rel}: {value}')
                continue
            dest = target.relative_to(SITE.resolve()).as_posix()
            if dest not in files:
                errors.append(f'Missing or incorrectly cased URL: {rel}: {value}')
    assignments = json.loads((SITE / 'assignments-data.js').read_text(encoding='utf-8').removeprefix('window.ASSIGNMENT_DATA=').strip().rstrip(';'))
    for assignment in assignments['assignments']:
        if re.search(r'(?m)^\s*(?:STUDENT_NAME|STUDENT_ID|GITHUB_USERNAME)\s*=\s*[\"\'][^\"\']+[\"\']', assignment['code']):
            errors.append('Uncleared metadata in embedded source: ' + assignment['id'])
        refs = [assignment['codePath'], assignment['docPath'], assignment['printPath']]
        refs += [item['path'] for item in assignment['files']]
        for evidence in assignment.get('evidence', []):
            refs += [evidence['metrics'], evidence['summary'], evidence['plot']]
        for ref in refs:
            checked += 1
            if ref not in files:
                errors.append('Missing dynamic assignment resource: ' + ref)
    a3 = json.loads((SITE / 'a3-data.js').read_text(encoding='utf-8').removeprefix('window.A3_DATA=').strip().rstrip(';'))
    for curve in a3['curves']:
        checked += 1
        if curve['csv'] not in files:
            errors.append('Missing A3 curve: ' + curve['csv'])
    print(json.dumps({'status': 'failed' if errors else 'passed', 'files': len(files), 'html_pages': sum(path.suffix == '.html' for path in files.values()), 'checked_links': checked, 'errors': errors}, ensure_ascii=False, indent=2))
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
