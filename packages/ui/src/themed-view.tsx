// packages/ui/src/themed-view.tsx
"use client";
import type React from "react";
import { View } from "react-native";

export default function ThemedView(props: React.ComponentProps<typeof View>) {
	return <View {...props} />;
}
