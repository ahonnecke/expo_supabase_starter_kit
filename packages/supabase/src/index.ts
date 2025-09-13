// packages/supabase/src/index.ts
export * from './client'
export * from './server-only'

// Re-export for compatibility
export { createServerClient } from './server-only'
export { createAdminClient } from './server-only'
