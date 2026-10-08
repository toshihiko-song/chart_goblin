import { NavLink, Outlet } from 'react-router';

const NAV = [
  { to: '/', label: 'Opportunities', end: true },
  { to: '/history', label: 'History' },
  { to: '/coins', label: 'Coins' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <NavLink
            to="/"
            className="flex items-center gap-2 font-semibold text-slate-100"
          >
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            Chart Goblin
          </NavLink>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto hidden text-xs text-slate-500 sm:block">
            Signal detection only · not financial advice
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
