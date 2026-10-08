import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { CoinsPage } from './pages/CoinsPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { SettingsPage } from './pages/SettingsPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <OpportunitiesPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'coins', element: <CoinsPage /> },
      {
        path: 'coins/:symbol',
        // Code-split: the charting library is only needed here.
        lazy: async () => ({
          Component: (await import('./pages/CoinPage')).CoinPage,
        }),
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
