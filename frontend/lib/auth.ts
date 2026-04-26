const TOKEN_KEY = "expense_tracker_token";
const USER_DISPLAY_KEY = "expense_tracker_user_display";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function saveUserDisplayName(name: string) {
  localStorage.setItem(USER_DISPLAY_KEY, name.trim());
}

export function getUserDisplayName(): string {
  return localStorage.getItem(USER_DISPLAY_KEY) || "User";
}

export function inferDisplayNameFromEmail(email: string): string {
  const [local] = email.split("@");
  if (!local) return "User";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_DISPLAY_KEY);
}
