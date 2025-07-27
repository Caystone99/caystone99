import "./globals.css";

export const metadata = {
  title: "Caleb-Livingstone Emmanuel",
  description: "Caystone does what?",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
