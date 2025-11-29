import React from 'react';
import { RouteObject } from 'react-router-dom';
import { Lobby } from './components/Lobby';
import { GameCanvas } from './components/GameCanvas';
import { DebugScene } from './components/DebugScene';
import LineCallback from './pages/LineCallback';

export type AppRoute = RouteObject & {
  path: string;
  element: React.ReactElement;
  label?: string;
  icon?: React.ComponentType;
};

export const routes: AppRoute[] = [
  {
    path: '/',
    element: <Lobby />,
    label: '大廳',
  },
  {
    path: '/lobby',
    element: <Lobby />,
    label: '大廳',
  },
  {
    path: '/game',
    element: <GameCanvas />,
    label: '遊戲',
  },
  {
    path: '/debug',
    element: <DebugScene />,
    label: '開發者工具',
    },
    {
    path: '/line/callback',
    element: <LineCallback />,
    label: 'LINE 登入',
  }
];

