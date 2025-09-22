// apps/web/app/layout.tsx
"use client";

import React from 'react';
import { AuthProvider } from '@supa/supabase/src/auth-context';
import { NotificationContainer } from '@rentinity/shared';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <NotificationContainer position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
