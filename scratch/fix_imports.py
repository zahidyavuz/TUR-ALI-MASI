import os
import re

root_dir = r'c:\Users\Melih\Desktop\TUR-ALI-MASI-main\app'
pattern = re.compile(r"from\s+['\"](?:\.\.?\/)+lib/([^'\"]+)['\"]")

count = 0
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = pattern.sub(r"from '@/app/lib/\1'", content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8', newline='') as f:
                        f.write(new_content)
                    count += 1
            except Exception as e:
                print(f"Error processing {path}: {e}")

print(f"Successfully updated {count} files with path aliases")
