import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ReduxProvider from "@/components/ReduxProvider";

// Font configuration for the app
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// App metadata
export const metadata = {
  title: "Task Management App",
  description: "A modern task management application with Firebase and Redux",
};

/**
 * Root Layout Component
 * 
 * Provides the foundational layout structure with:
 * - Redux state management
 * - Firebase authentication context
 * - Global fonts and styling
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ReduxProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
