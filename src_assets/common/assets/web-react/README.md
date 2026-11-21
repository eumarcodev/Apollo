# Helios web UI (React)

The configuration UI served by Helios at `https://localhost:47990`. It is the only web UI: the CMake target `web-ui`
builds this folder and the build output is installed as `<assets>/web`.

## Stack

| Concern      | Choice                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| UI           | React 19, TypeScript (strict), Vite 8                                         |
| Components   | HeroUI v3 (`@heroui/react` + `@heroui/styles`, Tailwind CSS v4, no Provider)  |
| Icons        | `lucide-react` only                                                           |
| Translations | `i18next` + `react-i18next`, **en** and **pt_BR** only                        |
| Server state | `@tanstack/react-query`                                                       |
| QR codes     | `qrcode.react` (rendered client side, no CDN)                                 |
| Unit tests   | Vitest + Testing Library + jsdom, coverage v8 (80 % lines/branches/functions) |
| E2E          | Cypress (stubbed API, and installed host)                                     |
| Lint         | ESLint (typescript-eslint, react-hooks, eslint-plugin-boundaries), Prettier   |

Versions are pinned exactly in `package.json`. TypeScript stays on 6.0 (typescript-eslint supports `<6.1`) and jsdom on
29 (jsdom 30+ needs Node 22.22). Building needs Node `^20.19` or `>=22.12` (Vite 8); running Vitest and Cypress needs
Node 22 or newer. The release workflow pins Node 22.

## Commands

```bash
npm ci
npm run dev            # Vite dev server; /api is proxied to https://localhost:47990 (a running Helios)
npm run lint
npm run typecheck
npm run test:unit      # Vitest + coverage thresholds + locale parity + architecture lint tests
npm run build          # vite build + scripts/check-dist.mjs
npm run e2e            # build, vite preview on :4173, every Cypress spec with the API stubbed
npm run e2e:installed  # Cypress against the Helios installed on this machine (see below)
```

`npm run build` writes to `dist/`, or to `$HELIOS_ASSETS_DIR/assets/web` when CMake runs it (target `web-ui`).
`scripts/check-dist.mjs` fails the build when one of the 8 pages, a locale or an image is missing, or when a file type
is not one the server serves (`js css json svg png ico woff2 ttf` under `assets/`).

## Pages and routing

The server (`src/confighttp.cpp`) serves 8 fixed HTML files: `/` `index.html`, `/pin`, `/apps`, `/config`,
`/password`, `/welcome`, `/login`, `/troubleshooting`. Each HTML is thin (`#root` + `src/pages/<page>.tsx`) and has
`<meta name="helios-web-ui" content="react">`. Navigation between pages is a full page load through relative links
(`./config`); there is no client-side router. The Vite plugin `vite-plugins/helios-page-routes.ts` maps the routes to
the HTML files in `dev` and `preview`, keeping query and hash. Static files must live under `assets/` (the server
rejects other paths); `public/images/` holds the tray icons and logos the host reads by name.

## Architecture: Vertical Slice + Clean Architecture

```
src/
  app/             composition root: createPage(Page) = theme + i18n + providers + AppShell
  pages/           8 entries, each only calls createPage with a slice page
  shared/
    kernel/        pure TS: Result/AppError, Platform, boolean option codec, ids, list helpers
    infrastructure/http/            httpClient (credentials, JSON, typed AppError, 401 -> ./login?redir=...)
    infrastructure/server-config/   GET /api/config adapter + useServerConfig()
    i18n/          loader (GET /api/configLocale), i18next init, platform-aware tp()
    ui/            BooleanField, CommandListEditor, ConfirmDialog/useConfirm, notify, PageLayout, PlatformOnly, theme
    testing/       renderWithProviders, createTestI18n, fixtures (tests only)
  features/<slice>/
    domain/          entities, value objects, rules — no React, HeroUI or fetch
    application/     use cases (functions receiving ports) + hooks (react-query)
    infrastructure/  adapters implementing the ports with httpClient, DTO <-> domain mapping
    ui/              components and the page of the slice
    index.ts         the only public API of the slice (also wires adapters into the hooks)
```

Dependency rules, enforced by `npm run lint` (`eslint.config.js`, tested in `tests/architecture.test.ts`):

- `domain` -> `shared/kernel` and its own domain only; no React/HeroUI/react-query/i18n imports, no `fetch`.
- `application` -> its domain and application, `shared/kernel`, `shared/infrastructure/server-config`, other slices'
  `index.ts`; no HeroUI/lucide, no `fetch`.
- `infrastructure` -> its application (ports) and domain, `shared/kernel`, `shared/infrastructure`.
- `ui` -> its application, domain and ui, `shared/ui`, `shared/i18n`, `shared/kernel`; never infrastructure, no `fetch`.
- Another slice only through its `index.ts`. `shared/**` never imports `features/**`. `pages/**` imports only `app/`
  and slice entries.
- Imports across folders use the `@/` alias (`../` is rejected) so the rules can see them.

Tests live next to the code (`*.test.ts(x)`): domain/application without DOM, infrastructure with a mocked `fetch`
(`jsonResponse` helper), UI with Testing Library (`renderWithProviders`).

## Adding a slice

1. Create `src/features/<slice>/{domain,application,infrastructure,ui}/` and `index.ts`.
2. Domain first, with tests; then the adapter (one file per endpoint group, shapes taken from `src/confighttp.cpp`);
   then hooks; then UI.
3. Export the page component from `index.ts` and replace the placeholder in `src/pages/<page>.tsx`.
4. Every text goes through i18n with keys in **both** `public/assets/locale/en.json` and `pt_BR.json` (the parity test
   fails otherwise). Platform-specific texts use `usePlatformTranslation(platform)`.
5. Add Cypress specs: `cypress/e2e/<slice>/*.cy.ts` (stubbed, per platform when the slice has platform rules) and
   `*.installed.cy.ts` (real host, non-destructive).

## E2E

- **Stubbed** (`npm run e2e`): `stubServerApi({ platform, locale, overrides })` from `cypress/support/api.ts` intercepts
  every `/api/*` call (unstubbed ones answer 501). Fixtures in `cypress/fixtures/` are synthetic and follow the real
  handlers.
- **Installed** (`npm run e2e:installed`): `baseUrl https://localhost:47990`, only `*.installed.cy.ts`, no stubs.
  Copy `cypress.env.example.json` to `cypress.env.json` (git-ignored) with the web UI credentials. Use
  `loginInstalled()` (`cy.session` + `POST /api/login`) and, in specs that save settings, `snapshotConfig()` before and
  `restoreConfig()` after. Never quit/restart the host, unpair clients, launch/close apps or change credentials, port,
  address family, web UI origin or encryption.

## Validating on the installed build

A change is done only when it works on an installed Helios:

```powershell
# from Helios-Server (MSYS2 UCRT64 build, PROCESSOR_ARCHITECTURE=AMD64)
cmake -B build -G Ninja -S . -DBUILD_TESTS=ON
ninja -C build                 # the web-ui target runs npm ci + npm run build here
build/tests/test_helios
cpack -G NSIS --config build/CPackConfig.cmake

# install the build silently (elevated), prints OK <version> or ABORT <reason>
powershell -ExecutionPolicy Bypass -File src_assets\common\assets\web-react\scripts\install-helios.ps1 -Installer <Helios installer.exe>
cd src_assets\common\assets\web-react; npm run e2e:installed

# always put the official release back afterwards
powershell -ExecutionPolicy Bypass -File src_assets\common\assets\web-react\scripts\install-helios.ps1 -Restore <official installer.exe>
```
