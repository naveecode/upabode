import re

with open('src/app/api/auth/google/callback/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const host = request\.headers\.get\('host'\);.*?const baseUrl = process\.env\.NEXT_PUBLIC_APP_URL \|\| \\\\\$\{protocol\}\://\\\\$\{host\}\\;",
    '''const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : \\://\System.Management.Automation.Internal.Host.InternalHost\;''',
    content,
    flags=re.DOTALL
)

with open('src/app/api/auth/google/callback/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
