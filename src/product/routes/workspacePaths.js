import { matchPath } from 'react-router-dom';

// Sub-paths rendered by UserWorkspace under /:username. Keep in sync with its <Routes>
// (enforced by tests/product/routes/workspacePaths.test.js); anything else is a 404.
export const WORKSPACE_PATHS = [
  '/',
  '/projects',
  '/settings',
  '/upload',
  '/takeoff/:projectId/edit',
  '/takeoff/:projectId/results',
  '/takeoff/:projectId/export',
  '/edit',
  '/results',
  '/export',
];

export function isWorkspacePath(subPath = '') {
  const pathname = `/${subPath}`.replace(/\/+$/, '') || '/';
  return WORKSPACE_PATHS.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
}
