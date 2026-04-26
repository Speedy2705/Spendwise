const FLASH_KEY = "expense_tracker_flash_message";

export function setFlashMessage(message: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FLASH_KEY, message);
}

export function consumeFlashMessage(): string {
  if (typeof window === "undefined") return "";
  const message = sessionStorage.getItem(FLASH_KEY) || "";
  if (message) {
    sessionStorage.removeItem(FLASH_KEY);
  }
  return message;
}
