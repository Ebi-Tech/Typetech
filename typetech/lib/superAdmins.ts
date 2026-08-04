// Emails in this list can always sign in — bypassing the invites table check —
// and are auto-promoted to admin. They also cannot be removed via the Users
// admin API, even by another admin. Keep this list short and deliberate.
export const SUPER_ADMIN_EMAILS = [
  'difebi14@gmail.com',
  'd.ifechukwu@alustudent.com',
  'difechukwude@si.alueducation.com',
]

export function isSuperAdmin(email: string | null | undefined) {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}
