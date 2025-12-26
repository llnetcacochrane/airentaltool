import { ComponentType, lazy } from 'react';

/**
 * Wrapper for React.lazy that retries failed chunk loads
 * Helps with:
 * - Network issues
 * - Cache issues after deployments
 * - Intermittent loading failures
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      // Check if this is a chunk loading error
      const isChunkLoadError =
        error instanceof Error &&
        (error.name === 'ChunkLoadError' ||
          /Loading chunk/.test(error.message) ||
          /Failed to fetch/.test(error.message));

      if (!pageHasAlreadyBeenForceRefreshed && isChunkLoadError) {
        // Mark that we're going to force refresh
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');

        console.warn(
          `Chunk loading failed for ${componentName || 'component'}. Refreshing page...`
        );

        // Force refresh the page to get the latest chunks
        window.location.reload();

        // Return a promise that never resolves to prevent further rendering
        // The page will reload before this matters
        return new Promise(() => {});
      }

      // If we already tried refreshing or it's a different error, throw it
      console.error(
        `Failed to load ${componentName || 'component'}:`,
        error
      );
      throw error;
    }
  });
}
