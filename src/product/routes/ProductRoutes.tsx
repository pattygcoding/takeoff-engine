import React, { lazy } from 'react';
import { Route, Navigate, useParams } from 'react-router-dom';
import NotFoundPage from '@/core/components/shared/NotFoundPage';
import { isWorkspacePath } from '@/product/routes/workspacePaths';

const UserWorkspace = lazy(() => import('@/product/components/UserWorkspace'));
const ClientProposalView = lazy(() => import('@/product/components/ClientProposalView'));
const ClientGuidePage = lazy(() => import('@/product/components/ClientGuidePage'));

// /:username/* also catches typos; only known workspace pages get the login redirect or the workspace.
function UserWorkspaceRoute({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { '*': subPath } = useParams();
  if (!isWorkspacePath(subPath)) return <NotFoundPage />;
  return isAuthenticated ? <UserWorkspace /> : <Navigate to="/login" replace />;
}

export function renderProductRoutes(isAuthenticated: boolean): React.ReactElement[] {
  return [
    <Route key="proposal-view" path="/p/:publicToken" element={<ClientProposalView />} />,
    <Route key="public-guide" path="/guide" element={<ClientGuidePage />} />,
    <Route key="user-guide" path="/:username/guide" element={<ClientGuidePage />} />,
    <Route
      key="user-workspace"
      path="/:username/*"
      element={<UserWorkspaceRoute isAuthenticated={isAuthenticated} />}
    />,
  ];
}
