import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
// apps/mobile/app/_layout.tsx
import React from "react";

const qc = new QueryClient();

export default function Root() {
	return (
		<QueryClientProvider client={qc}>
			<Stack screenOptions={{ headerShown: false }} />
		</QueryClientProvider>
	);
}
