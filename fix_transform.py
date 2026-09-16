import re

with open('src/components/MobileNav.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'<svg className="tab-wave-bg" viewBox="0 0 120 24" style=\{\{ transform: 	ranslateX\(calc\(\$\{visualIndex \* \(100 / tabs\.length\)\}vw \+ vw - 60px\)\) \}\}>',
    r'<svg className="tab-wave-bg" viewBox="0 0 120 24" style={{ transform: 	ranslateX(calc(vw + vw - 60px)) }}>',
    content
)

with open('src/components/MobileNav.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
