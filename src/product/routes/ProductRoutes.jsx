import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';

const UserWorkspace = lazy(() => import('@/product/components/UserWorkspace'));
const ClientProposalView = lazy(() => import('@/product/components/ClientProposalView'));
const ClientGuidePage = lazy(() => import('@/product/components/ClientGuidePage'));

export function renderProductRoutes(isAuthenticated) {
  return [
    <Route key="proposal-view" path="/p/:publicToken" element={<ClientProposalView />} />,
    <Route key="public-guide" path="/guide" element={<ClientGuidePage />} />,
    <Route key="user-guide" path="/:username/guide" element={<ClientGuidePage />} />,
    <Route
      key="user-workspace"
      path="/:username/*"
      element={
        !isAuthenticated ? (
          <Navigate to="/login" replace />
        ) : (
          <UserWorkspace />
        )
      }
    />,
  ];
}
