import re

with open('src/components/MobileNav.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'transform: 	ranslateX(calc(vw + vw - 60px))',
    'transform: 	ranslateX(calc(vw + vw - 60px))'
)

with open('src/components/MobileNav.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
