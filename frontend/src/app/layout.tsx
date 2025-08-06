import { headers } from 'next/headers';
import { ReactNode } from 'react';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const cookies = headerList.get('cookie');
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}