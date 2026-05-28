import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Shell: React.FC = () => (
  <div className="flex min-h-screen">
    <Sidebar />
    <div className="flex flex-col flex-1 min-w-0">
      <Topbar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  </div>
);

export default Shell;
