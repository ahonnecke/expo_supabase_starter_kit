import { createPublicClient } from "@supa/supabase/src/client";
import { useRouter } from "expo-router";
// apps/mobile/app/app/home.tsx
import React from "react";
import { Button, Text, View } from "react-native";

const supabase = createPublicClient();

export default function Home() {
	const router = useRouter();
	return (
		<View style={{ padding: 24, gap: 12 }}>
			<Text style={{ fontSize: 24, fontWeight: "bold" }}>
				App Home (protected)
			</Text>
			<Button
				title="Sign out"
				onPress={async () => {
					await supabase.auth.signOut();
					router.replace("/");
				}}
			/>
		</View>
	);
}
