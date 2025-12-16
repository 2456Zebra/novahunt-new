export const metadata = {
  title: 'NovaHunt.ai',
  description: 'Find business emails instantly',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
