import { v4 as uuidv4 } from "uuid";

export function getTabSessionId(): string {
  const key = "nb_tab_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem(key, id);
  }
  return id;
}