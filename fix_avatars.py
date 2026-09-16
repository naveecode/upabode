import os
import re

def fix_avatars_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern: {obj.avatarUrl || obj.username?.charAt(0).toUpperCase() || '?'}
    # Or variations of it.
    
    def repl(m):
        full_match = m.group(0)
        obj_avatar_var = m.group(1) # e.g. user.avatarUrl
        # The entire matched string except the outer braces
        inside = full_match[1:-1]
        
        # Replacement
        # {user.avatarUrl?.startsWith('http') ? <img src={user.avatarUrl} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} /> : (user.avatarUrl || user.username?.charAt(0)...)}
        
        replacement = f"{{{obj_avatar_var}?.startsWith?.('http') ? <img src={{{obj_avatar_var}}} style={{{{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}}} alt="avatar" /> : ({inside})}}"
        return replacement

    # Regex to find: {something.avatarUrl || something.username...}
    # It must start with { and end with }. It must contain .avatarUrl ||.
    # Let's match { something.avatarUrl || ... }
    new_content = re.sub(r'\{([\w\.\?]+avatarUrl)\s*\|\|([^}]+)\}', repl, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            fix_avatars_in_file(os.path.join(root, file))
