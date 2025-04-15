/**
 * Navigation utilities to help prevent redirect loops
 */

// Track the last navigation request ID to differentiate between refreshes and real navigations
let lastNavigationRequestId: string | null = null;

// Key for session storage
const REQUEST_ID_KEY = 'last_navigation_request_id';

/**
 * Checks if the current page load is a refresh or a new navigation
 * 
 * @returns {boolean} True if the page is refreshing, false for new navigation
 */
export function isPageRefresh(): boolean {
  if (typeof window === 'undefined') {
    return false; // Server-side rendering
  }
  
  // Check if we've saved the last request ID in session storage
  const savedRequestId = sessionStorage.getItem(REQUEST_ID_KEY);
  
  // Get the current request ID from headers (set by middleware)
  const currentRequestId = document.querySelector('meta[name="request-id"]')?.getAttribute('content') || null;
  
  // If there's no current request ID, we can't determine
  if (!currentRequestId) {
    return false;
  }
  
  // Store the new request ID
  sessionStorage.setItem(REQUEST_ID_KEY, currentRequestId);
  
  // Compare with the last known request ID
  // If no saved ID (first visit) or IDs match (real navigation), not a refresh
  return savedRequestId !== null && savedRequestId !== currentRequestId;
}

/**
 * Utility to prevent redirects when refreshing a page
 * 
 * @param targetPath The path to redirect to
 * @param currentPath The current path
 * @returns {boolean} True if redirection should proceed, false otherwise
 */
export function shouldRedirect(targetPath: string, currentPath: string): boolean {
  // Don't redirect if already on the target path
  if (targetPath === currentPath) {
    return false;
  }
  
  // Don't redirect on page refresh
  if (isPageRefresh()) {
    console.log('Preventing redirect on page refresh');
    return false;
  }
  
  return true;
} 