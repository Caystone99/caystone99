import Header from "@/ui/header";
import { ThemeProvider } from "@/ui/theme-provider";
import "./globals.css";

export const metadata = {
  title: "Caleb-Livingstone Emmanuel",
  description: "Caystone does what?",
};

// Runs before paint to set the theme class, preventing a flash of the wrong theme.
const themeScript = `
  try {
    var t = localStorage.getItem('theme') || 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
