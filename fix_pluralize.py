import os
import glob

for filepath in glob.glob('**/*.html', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'pluralize:"","s"' in content:
        content = content.replace('pluralize:"","s"', 'pluralize:"s"')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
