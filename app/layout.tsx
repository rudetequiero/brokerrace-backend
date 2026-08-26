export const metadata = {
  title: "BrokerRace API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "monospace", background: "#0a0b0c", color: "#e7e9ec" }}>
        {children}
      </body>
    </html>
  );
}
