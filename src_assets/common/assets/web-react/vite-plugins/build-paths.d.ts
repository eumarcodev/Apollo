export declare function resolveBuildPaths(
  env: Record<string, string | undefined>,
  appDir: string,
  realpath?: (path: string) => string,
): { root: string; outDir: string };
