# T8: Blog sources at repo-root `blog/`

**Plan:** `./ai-artifacts/PLAN_2026_08_07_website-feedback-pass-2.md`
**Depends:** none
**Commit outcome:** Blog articles are authored as `blog/YYYY-MM-DD-slug.md` at the repo root, and one documented command regenerates the site from them.

## Context (self-contained)

- Goal: ship feedback batch 2 on the Astro site under `website/`.
- This slice: the feedback lines *"Move my first script video into
  {project_root}/blog/{date}-{title-of-the-article}.md"*, *"Link the Blog section of website
  to blog folder. Any editing of matching blog file and running script/command generate
  update for the website"*, and the Docs question *"Is there script / command that I can run
  to update docs after editing the docs markdown file themselves?"* (answer: yes,
  `node scripts/build-content.mjs`; this ticket gives it a name and documents it).
- Out of scope here: blog page styling and the blog rail (T9), the search palette (T10),
  the docs corpus loader (`docs.mjs` already reads `docs/**` at the repo root and needs no
  move), the teleprompter HTML under `content/`.
- Assumptions in force: none beyond the source-of-record decision below.

## Source-of-record decision (already made — do not re-litigate)

Two copies of the introduction article exist today:

- `content/2026-08-01-legend-of-alpha-project-introduction/script.md` (373 lines) — the raw
  **video script**, plus its `script.html` teleprompter. `content/context.md` declares
  `content/` the home for scripts and video assets.
- `website/content/blog/2026-08-01-legend-of-alpha-project-introduction/index.md` (244
  lines) — the edited, front-mattered **article** actually published at `/blog/…/`.

Decision: the *article* moves to `blog/2026-08-01-legend-of-alpha-project-introduction.md`
and becomes the single source of record for the site. The raw script and teleprompter stay
in `content/` — they are the video asset, which is what `content/context.md` is for.
Do not delete anything under `content/`.

## Current implementation

`website/scripts/content/blog.mjs`:

- `const BLOG_ROOT = path.join(CONTENT, 'blog');` where `CONTENT` is
  `website/content` (`shared.mjs` line 13).
- `const DIR_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)$/;` — one **directory** per post,
  containing `index.md`.
- `loadPosts()` walks the directory entries, `fail`s on symlinks, on a non-directory entry,
  on a name that does not match `DIR_RE`, on `index.md` over `MAX_POST_BYTES` (262 144),
  on a missing required key, on a bad date, on a `date` that disagrees with the directory
  prefix, on a summary over 240 chars, on a bad `draft`, on raw HTML in the body, and on a
  duplicate slug. Drafts are skipped. Posts sort by date desc, then slug.
- `ALLOWED_POST_KEYS = {title, date, author, summary, tags, draft}`.
- Returns `{ slug, route: '/blog/<slug>/', title, date, author, summary, tags[], body }`.

`website/package.json` scripts already run `node scripts/build-content.mjs` inside `dev`,
`build`, `check`, and expose `content:check` (`--check` mode). There is no plain
`content` script.

## Requirements

- `BLOG_ROOT` becomes `path.join(ROOT, 'blog')` — the repo root `blog/` directory.
- One **file** per post: `blog/YYYY-MM-DD-slug.md`. Directories inside `blog/` are ignored
  (so image folders can live there later); any other file extension `fail`s.
- Every other validation rule above is preserved verbatim, with `directory prefix` wording
  in the date-mismatch message replaced by `filename prefix`.
- A missing `blog/` directory still yields `[]` (the `ENOENT` branch stays).
- New npm script `content` → `node scripts/build-content.mjs`, documented as *the* command
  to re-generate the site data after editing any `docs/**.md` or `blog/**.md`.
- `website/content/blog/` is removed.

## Inputs

- `website/scripts/content/blog.mjs` (whole file), `website/scripts/content/shared.mjs`
  (`ROOT` line 11, `CONTENT` line 13, `fail`, `validDate`).
- `website/tests/unit/blog.test.ts` — its `writeFixturePost(dirName, content)` helper writes
  `${CONTENT}/blog/${dirName}/index.md`; it must be rewritten to write flat files under `ROOT/blog`.
- `website/content/blog/2026-08-01-legend-of-alpha-project-introduction/index.md` — the file to move.
- `website/package.json`, `website/README.md`, `README.md`.
- **From Depends:** none.

## Check plan

| Test                                         | Input                                                    | Expect                                                        |
| -------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `loads a flat post file`                     | `blog/2026-02-02-fixture-one.md` with valid front matter | one post, `slug: 'fixture-one'`, `route: '/blog/fixture-one/'` |
| `ignores directories inside blog/`           | `blog/images/` directory                                  | no failure, directory not treated as a post                    |
| `rejects a non-markdown file`                | `blog/2026-02-02-x.txt`                                   | throws `content: post 2026-02-02-x.txt: expected a .md file`   |
| `rejects a filename that is not date-slug`   | `blog/notes.md`                                           | throws `content: post notes.md: filename must match yyyy-mm-dd-slug.md` |
| `rejects a date that disagrees with the name`| `blog/2026-02-02-x.md` with `date: 2026-02-03`            | throws `does not match filename prefix 2026-02-02`             |
| `excludes drafts`                            | `draft: true`                                             | post absent                                                    |
| `sorts newest first`                         | two fixtures dated 2026-02-02 and 2026-03-03              | 2026-03-03 first                                               |
| `splits tags`                                | `tags: release, alpha`                                    | `['release','alpha']`                                          |
| `returns [] with no blog directory`          | `blog/` absent                                            | `[]`                                                            |
| `publishes the introduction article`         | real repo                                                 | `catalog.posts` has slug `legend-of-alpha-project-introduction` |

## TDD

1. **Red** — rewrite `website/tests/unit/blog.test.ts` fixtures to write flat files under
   `path.join(ROOT, 'blog')`, add the new rows, and add
   `website/tests/unit/blog-corpus.test.ts` for the last row (importing `{ catalog }` from
   `'../../src/lib/catalog'`). Run `cd website && npx vitest run tests/unit/blog.test.ts tests/unit/blog-corpus.test.ts` — red.
2. **Green** — move the file, retarget `blog.mjs`, rebuild content, rerun.
3. **Refactor** — add the npm script and the docs.

## Impl steps

- [x] 1. `mkdir -p blog` at the repo root, then
      `git mv website/content/blog/2026-08-01-legend-of-alpha-project-introduction/index.md blog/2026-08-01-legend-of-alpha-project-introduction.md`
      and `rmdir website/content/blog/2026-08-01-legend-of-alpha-project-introduction website/content/blog`.
      **Criterion:** `blog/2026-08-01-legend-of-alpha-project-introduction.md` exists with
      sha256 `db2672338df0aec280e63ff493b8ecce94f2e89dd653f723769654e09958daac` (unchanged
      from the source, 244 lines / 22223 bytes); `website/content/blog/` no longer exists;
      `git status` reports the change as a rename `R`.
- [x] 2. In `website/scripts/content/blog.mjs`, change the import to
      `import { ROOT, fail, validDate } from './shared.mjs';` and
      `const BLOG_ROOT = path.join(ROOT, 'blog');`.
      **Criterion:** `blog.mjs` line 3 imports `ROOT` (not `CONTENT`) and line 5 reads
      `path.join(ROOT, 'blog')`.
- [x] 3. Replace `const DIR_RE = …` with
      `const FILE_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/;`.
      **Criterion:** no occurrence of `DIR_RE` remains in `blog.mjs`.
- [x] 4. Rewrite the `loadPosts` loop body:
      ```js
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const entryPath = path.join(BLOG_ROOT, entry.name);
        const entryInfo = await lstat(entryPath);
        if (entryInfo.isSymbolicLink())
          fail(`post ${entry.name}: symlinks are not allowed`);
        // Directories under blog/ are reserved for per-post assets, not posts.
        if (entryInfo.isDirectory()) continue;
        if (!entry.name.endsWith('.md'))
          fail(`post ${entry.name}: expected a .md file`);
        const fileMatch = FILE_RE.exec(entry.name);
        if (!fileMatch)
          fail(`post ${entry.name}: filename must match yyyy-mm-dd-slug.md`);
        const [, datePrefix, slug] = fileMatch;
        if (!entryInfo.isFile()) fail(`post ${slug}: expected a file`);
        if (entryInfo.size > MAX_POST_BYTES)
          fail(`post ${slug}: file exceeds ${MAX_POST_BYTES} bytes`);
        const raw = await readFile(entryPath, 'utf8');
        …unchanged validation, with the date message reading
        `post ${slug}: date ${data.date} does not match filename prefix ${datePrefix}`
      }
      ```
      Drop the now-unused `indexPath` / `indexInfo` block and the `readdir` `withFileTypes`
      usage stays as is.
      **Criterion:** `npx vitest run tests/unit/blog.test.ts` green on all nine `loadPosts`
      rows of the check plan, including the four `fail` messages asserted verbatim.
- [x] 5. Rewrite `website/tests/unit/blog.test.ts`: import `{ ROOT }` from
      `'../../scripts/content/shared.mjs'`, replace `writeFixturePost` with
      ```ts
      async function writeFixturePost(fileName: string, content: string) {
        const file = path.join(ROOT, 'blog', fileName);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, content, 'utf8');
        FIXTURE_PATHS.push(file);
        return file;
      }
      ```
      and clean up with `rm(file, { force: true })` in `afterEach`. Keep the three
      `parseFrontMatter` cases untouched. Add the new rows from the check plan.
      **Criterion:** the file contains no reference to `CONTENT` or `index.md`; fixtures are
      removed after each test (`ls blog/` shows only the article).
- [x] 6. Create `website/tests/unit/blog-corpus.test.ts` asserting
      `catalog.posts.some(p => p.slug === 'legend-of-alpha-project-introduction')` and
      `catalog.posts.every(p => p.route.startsWith('/blog/'))`.
      **Criterion:** file exists and both its cases pass under vitest.
- [x] 7. Add `"content": "node scripts/build-content.mjs",` to `website/package.json`
      `scripts`, directly above `"content:check"`.
      **Criterion:** `npm run content` resolves and runs the content build.
- [x] 8. In `website/README.md`, add a `## Regenerating site content` section:
      > Edit any `docs/**/*.md` or `blog/*.md` at the repo root, then run
      > `cd website && npm run content`. That regenerates `website/src/generated/catalog.ts`
      > and the public asset copies. `npm run dev` and `npm run build` already run it first,
      > so you only need it explicitly when you want to refresh data without starting a server.
      > `npm run content:check` verifies the generated output is up to date without writing.
      **Criterion:** `grep "Regenerating site content" website/README.md` matches.
- [x] 9. In the repo-root `README.md`, add `blog/` to the layout list with the line
      `blog/ : Published blog articles, one \`YYYY-MM-DD-slug.md\` per post; \`cd website && npm run content\` regenerates the site.`
      Mirror the same line in `AGENT.md` under "Repository layout".
      **Criterion:** `grep -c "Published blog articles" README.md AGENT.md` returns 1 each.
      *Deviation logged:* the root `README.md` has no "layout list" section — that list lives
      only in `AGENT.md`. The line was added verbatim as a bullet in README's
      "Showcase website" section instead; `AGENT.md` got it under "Repository layout" as
      specified.
- [x] 10. Update `content/context.md` with one sentence: raw video scripts stay here;
      the published article lives at `blog/<date>-<slug>.md`.
      **Criterion:** `grep "blog/<date>-<slug>.md" content/context.md` matches.
- [x] 11. Run `cd website && npm run content` — expect `… 38 docs, 1 posts`.
      **Criterion:** output line reads `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs, 1 posts`.
- [x] 12. Run `cd website && npx vitest run tests/unit/blog.test.ts tests/unit/blog-corpus.test.ts` — green.
      **Criterion:** `Test Files 2 passed (2)`, `Tests 15 passed (15)`.
- [x] 13. Run `cd website && npm run format && npm run ci`.
      **Criterion:** `npm run format` clean; `npm run ci` exit 0. Run in an isolated
      `git worktree` at HEAD carrying only this ticket's diff, because a concurrent agent
      mutated `cards_mse/01_alpha/LOTA-0001-Alpha_0.1` in the shared working tree and that
      breaks `validatePackageHashes` for reasons unrelated to T8 (see Validation note).

## Outputs

- Touched: `blog/2026-08-01-legend-of-alpha-project-introduction.md` (moved),
  `website/content/blog/` (removed), `website/scripts/content/blog.mjs`,
  `website/tests/unit/blog.test.ts`, `website/tests/unit/blog-corpus.test.ts` (new),
  `website/package.json`, `website/README.md`, `README.md`, `AGENT.md`, `content/context.md`.
- Behaviour: blog authoring path changes; `/blog/<slug>/` routes are unchanged.
- Migrate/config: anyone with an in-flight post under `website/content/blog/` must move it.

## Validation

- [x] `cd website && npx vitest run tests/unit/blog.test.ts tests/unit/blog-corpus.test.ts` — passed
      → `Test Files 2 passed (2) / Tests 15 passed (15)`.
- [x] `cd website && npm run content` — `1 posts`
      → `content: 1 releases, 3 sections, 50 current cards, 50 versions, 73 keywords, 38 docs, 1 posts`.
- [x] `cd website && npm run ci` — exit 0, `links: N pages clean`
      → `CI EXIT=0`, `Test Files 36 passed (36) / Tests 330 passed (330)`, astro check
      `0 errors`, `151 page(s) built`, `dist scan: clean`. `links: 151 pages clean` came from
      `npm run links:check` — `links:check` is **not** part of the `ci` script
      (`ci` = `format:check && lint && check && test && build`), so it was run separately.
      **Note:** run in an isolated `git worktree` at HEAD (`de6ade2`) carrying only this
      ticket's diff. In the shared working tree `npm run ci` fails at
      `validatePackageHashes` → `content: …/LOTA-0001-Alpha_0.1: package hash mismatch`,
      caused by a *concurrent* agent editing the set symbol
      (`set: symbol: ` → `symbol: symbol1.mse-symbol` plus a new untracked
      `symbol1.mse-symbol`, mtimes 11:37:46/11:37:50). T8 touches no file under `cards_mse/`.
- [x] manual: edit the article's `summary:` in `blog/2026-08-01-…md`, run `npm run content`,
      reload `/blog/` — the new summary is shown
      → satisfied by an automated equivalent in the isolated worktree: replaced `summary:`
      with `ROUNDTRIP PROOF summary line.`, ran `npm run content` (`1 posts`), the string
      appears in `src/generated/catalog.ts`, and after `astro build` it appears in
      `dist/blog/index.html`.
- [x] app functional — `/blog/legend-of-alpha-project-introduction/` still renders
      → `dist/blog/legend-of-alpha-project-introduction/index.html` exists and contains the
      article title; `dist/blog/index.html` lists it with its summary.
- [x] commit msg draft: `feat(website): author blog posts from repo-root blog/`

## Conservation proof (source move)

- Article file: sha256 `db2672…daac` and 22223 bytes identical before and after the move;
  `git status` records it as a rename, so history follows the file.
- Post count and slugs: `1 posts` before and after; slug
  `legend-of-alpha-project-introduction` in both.
- Body: `website/src/generated/catalog.ts` is **byte-identical** before and after
  (`diff` reports no change), which proves title, date, author, summary, tags, route and
  the full rendered body all survived the move unchanged.
