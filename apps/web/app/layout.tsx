// apps/web/app/layout.tsx
"use client";

import { NotificationContainer } from "@supa/shared";
import { AuthProvider } from "@supa/supabase/src/auth-context";
import type React from "react";

export default function RootLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<AuthProvider>
					{children}
					<NotificationContainer position="top-right" />
				</AuthProvider>
			</body>
		</html>
	);
}
