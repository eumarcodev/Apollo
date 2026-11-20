import { defineConfig } from 'cypress';

/**
 * Two modes in one config:
 * - default (`npm run e2e`): `vite preview` on :4173, every /api call stubbed (cypress/support/api.ts).
 * - installed (`npm run e2e:installed`, env `mode=installed`): the Helios installed on this machine, no stubs,
 *   only `*.installed.cy.ts` specs, credentials from cypress.env.json.
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    excludeSpecPattern: ['**/*.installed.cy.ts'],
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(_on, config) {
      if (config.env['mode'] === 'installed') {
        config.baseUrl = (config.env['HELIOS_URL'] as string | undefined) ?? 'https://localhost:47990';
        config.specPattern = 'cypress/e2e/**/*.installed.cy.ts';
        config.excludeSpecPattern = [];
      }
      return config;
    },
  },
});
