import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import UserWorkspace from '@/product/components/UserWorkspace';
import ClientProposalView from '@/product/components/ClientProposalView';
import ClientGuidePage from '@/product/components/ClientGuidePage';

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
