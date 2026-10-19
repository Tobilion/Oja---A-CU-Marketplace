/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { accessDecision, AccessRequirement, toAccessUser } from './access';
import { paths, withNext } from './paths';
import { RouteFallback } from '../components/common/RouteFallback';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface RequireAccessProps {
  requirement: AccessRequirement;
  children: React.ReactNode;
}

/**
 * Route gate: waits for the auth session, sends guests to /login (carrying a
 * safe relative return path), and renders the 403 page for signed-in users
 * who lack the required role. The decision itself lives in access.ts and is
 * unit-tested there.
 */
export const RequireAccess: React.FC<RequireAccessProps> = ({ requirement, children }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteFallback />;
  }

  const decision = accessDecision(toAccessUser(currentUser), requirement);
  if (decision === 'login') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={withNext(paths.login, next)} replace />;
  }
  if (decision === 'forbidden') {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
};
