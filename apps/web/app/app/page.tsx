// apps/web/app/(protected)/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
	const router = useRouter();

	useEffect(() => {
		// Redirect to dashboard
		router.push("/app/dashboard");
	}, [router]);

	return (
		<main style={{ padding: "2rem", textAlign: "center" }}>
			<h1>Redirecting to Dashboard...</h1>
		</main>
	);
}
