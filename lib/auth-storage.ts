const KEYS = {
  isLoggedIn: "raku_logged_in",
  userName: "raku_user_name",
  userAvatar: "raku_user_avatar",
} as const;

export interface StoredUser {
  name: string;
  avatar: string;
}

export function saveLogin(name: string, avatar: string) {
  localStorage.setItem(KEYS.isLoggedIn, "true");
  localStorage.setItem(KEYS.userName, name);
  localStorage.setItem(KEYS.userAvatar, avatar);
}

export function loadLogin(): StoredUser | null {
  const isLoggedIn = localStorage.getItem(KEYS.isLoggedIn);
  if (isLoggedIn !== "true") return null;
  return {
    name: localStorage.getItem(KEYS.userName) || "YouTube User",
    avatar: localStorage.getItem(KEYS.userAvatar) || "",
  };
}

export function clearLogin() {
  localStorage.removeItem(KEYS.isLoggedIn);
  localStorage.removeItem(KEYS.userName);
  localStorage.removeItem(KEYS.userAvatar);
}
