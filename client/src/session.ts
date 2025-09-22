import { v4 as uuidv4 } from "uuid";

/**
 * Get or create a unique session ID for the current browser tab
 * 
 * This function ensures each browser tab has its own persistent session ID that:
 * - Persists across page refreshes (stored in sessionStorage)
 * - Is unique per tab (different tabs get different IDs)
 * - Is cleared when the tab is closed (sessionStorage is tab-scoped)
 * 
 * returns A unique session ID string for this browser tab
 */

export function getTabSessionId(): string {
  // key used to store the session id
  const key = "nb_tab_id";
  
  // try to retrieve existing session id from sessionStorage
  let id = sessionStorage.getItem(key);
  
  // if no session id exists, create a new one
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem(key, id);
  }
  
  // Return the session ID (either existing or newly created)
  return id;
}