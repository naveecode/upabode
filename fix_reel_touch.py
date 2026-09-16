import re

with open('src/components/ReelViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const isLeft = clientX < window.innerWidth / 2;",
    "const isLeftEdge = clientX < 60;\n    const isRightEdge = clientX > window.innerWidth - 60;\n    if (!isLeftEdge && !isRightEdge) return;\n    const isLeft = isLeftEdge;"
)

with open('src/components/ReelViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
