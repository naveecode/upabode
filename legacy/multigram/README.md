# Multigram (preserved snapshot)

This folder is the previous app that lived at the root of this repository: a full-stack social product (posts, reels, chat, calls, Google sign-in) built with Next.js, Prisma, and a Node server.

It is kept here so that work is not thrown away. It is **not** the site deployed to GitHub Pages. Static export cannot run it: the app uses server actions, route handlers, cookies, a database, and request-time APIs.

To run this snapshot, check out the commit before the portfolio change and use that tree as the project root (it expects `DATABASE_URL` and the other service credentials). Do not commit those values.

`render.yaml` in this folder no longer contains live credentials. If those values were ever pushed, rotate them in Pusher, UploadThing, and the database provider. They can still be recovered from older git history.
