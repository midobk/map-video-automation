import type { ReactNode } from 'react';
import { Sidebar } from '../../components/dashboard/Sidebar';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
