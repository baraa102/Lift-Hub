export const CONFIG = {
  appName: "Lift Up Hub",
  ui: { defaultTheme: "dark" },

  roles: ["student", "teacher", "admin"],

  usernamePolicy: {
    minLen: 3,
    maxLen: 16,
    allowed: /^[A-Za-z0-9_]+$/
  },

  passwordPolicy: {
    minLen: 10,
    forbidSpaces: true,
    requireUpper: true,
    requireLower: true,
    requireNumber: true,
    requireSymbol: true
  },

  permissions: {
    admin_panel: ["admin"],
    guide_manage: ["admin", "teacher"],
    chat_send: ["admin", "teacher", "student"],
    chat_delete: ["admin"]
  }
};