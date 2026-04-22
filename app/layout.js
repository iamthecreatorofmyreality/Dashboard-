export const metadata = {
  title: "Praxis Dashboard",
  description: "Booking system"
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "Arial, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
