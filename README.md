# caleblivingstone.xyz

The personal site of Caleb-Livingstone Emmanuel: robotics, software, material science and [KhronaHQ](https://khronahq.com), with working notes on what's on the bench.

**Live:** [caleblivingstone.xyz](https://caleblivingstone.xyz) · [caystone.xyz](https://caystone.xyz)

```sh
npm install
npm run dev        # http://localhost:3010
npm run build      # production build
npm run typecheck
```

Next.js 16, React 19 and TypeScript, styled with plain CSS. Notes live in [Turso](https://turso.tech) (libSQL); photos and video live in a [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket.

## What's on the site

- **Home** (`app/page.tsx`): the hero with a live boids swarm, the bench (what I'm building and learning, each with an animated pen drawing), the latest notes with twelve weeks of activity, and work.
- **Notes** (`/notes`, `/notes/[slug]`): published notes, filterable by topic.
- **Writing** (`/write`): a password-protected editor for notes. It isn't linked anywhere, and search engines are told to skip it.
- **Top bar**: Cotonou's time (WAT), temperature and an animated drawing of the current sky, plus the light/dark switch.

## Changing the content

Almost everything the site says is in `lib/content.ts`:

- `bench`: projects and interests. Add an entry and it appears as a card with its drawing (`sketch`) and a link to its notes.
- `work`: roles (`roles`) and things built (`built`, each tagged with who it was `for`).
- `person`, `elsewhere` and `place`: name, motto, links, and the city the clock and weather follow.

Each bench drawing lives in `components/Sketch.tsx`. Its motion is in `app/globals.css` under "Bench motion".

## Look and feel

- **Light and dark:** colours are CSS variables on `:root` in `app/globals.css`. Dark is the default; light is under `:root[data-theme="light"]`. A small script in `app/layout.tsx` applies the visitor's saved choice, or their system setting, before the page paints. `components/ThemeSwitch.tsx` flips it.
- **Marble:** the home page's faint background is a WebGL shader in `components/Marble.tsx`, coloured by `--marble` and `--pen`.
- **Swarm:** `components/Swarm.tsx`, a boids simulation whose robots steer clear of the pointer.
- **Weather:** `lib/weather.ts` fetches from [Open-Meteo](https://open-meteo.com) (free, no key) every 15 minutes. `components/Sky.tsx` draws it.
- Everything animated stands still for visitors who turn on reduced motion.

## Notes

You write on the page as it will look:

- Select text to format it (bold, italic, underline, strikethrough, code, highlight, link).
- Type `/`, or press the `+` beside a block, to add headings, lists, checklists, quotes, callouts, code, dividers, photos or video with captions, and YouTube embeds.
- Drag a block's grip to move it, or click the grip to move, duplicate, convert or delete the block.
- Drop or paste photos and video straight in. They upload to R2 from the browser.
- `Cmd/Ctrl+S` saves. Publishing sets the date, and later edits don't change it. Unpublishing turns a note back into a draft.

The editor is [Tiptap](https://tiptap.dev) (`components/NoteEditor.tsx` and `components/editor/`). Notes are stored as HTML. `lib/render.ts` cleans each note with an allow-list before it's shown, which keeps scripts out and allows embeds only from YouTube. Older notes written in Markdown still render, and switch to HTML the next time they're saved.

Each note has a topic: a bench entry or General. Bench cards link to their notes. The home page shows the latest three notes and the last twelve weeks of activity.

### Setting it up

Copy `.env.example` to `.env.local` and fill it in. On Vercel, set the same variables in the project's settings.

| Variable | What it's for |
|---|---|
| `WRITE_PASSWORD` | The password for `/write`. Wrong guesses are slowed down; choose a long one. |
| `SESSION_SECRET` | Signs the sign-in cookie. Any long random string, e.g. `openssl rand -hex 32`. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | The notes database (`libsql://…`). The table is created on first use. Without these, notes go to `.data/notes.db` locally, which won't work on Vercel. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Uploads. Use an API token with Object Read & Write on this bucket only. |
| `R2_PUBLIC_URL` | Where uploaded files are served from: the bucket's r2.dev address or a custom domain. |

The bucket needs public access turned on, and a CORS rule so the browser can upload to it:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3010", "https://caleblivingstone.xyz", "https://caystone.xyz"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Files go to `notes/<year>/<month>/` in the bucket, up to 200 MB each.

## Deploying

The site deploys to Vercel from the `v2` branch. Set the variables above in the Vercel project, and point `caleblivingstone.xyz` and `caystone.xyz` at it. Notes pages are rendered on each request. The home page refreshes every 15 minutes, and immediately whenever a note is saved.
