// import { Stack } from "expo-router";

// export default function RootLayout() {
//   return (
//     <Stack>
//       {/* Hide the header for the index/loading and login screens */}
//       <Stack.Screen name="index" options={{ headerShown: false }} />
//       <Stack.Screen name="login" options={{ headerShown: false }} />
//     </Stack>
//   );
// }
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{headerShown:false}} />;
}
