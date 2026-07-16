import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-logo">Map Video</div>
      <nav className="dashboard-nav">
        <ul>
          <li>
            <Link href="/dashboard">Overview</Link>
          </li>
          <li>
            <Link href="/dashboard/content">Content</Link>
          </li>
          <li>
            <Link href="/dashboard/content/new">New video</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
