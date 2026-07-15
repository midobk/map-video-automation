import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { readServerEnvironment } from '../lib/environment.server';
import './styles.css';

export const metadata: Metadata = {
  title: 'Map Video Automation',
  description: 'Source-backed map-video production with mandatory human approval.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const environment = readServerEnvironment();

  return (
    <html lang="en">
      <body data-app-environment={environment.APP_ENV}>{children}</body>
    </html>
  );
}
