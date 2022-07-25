// Inspired from Donnie McNeal's solution:
// https://gist.github.com/wontondon/e8c4bdf2888875e4c755712e99279536

import { Transaction, TransactionContext, TransactionSource } from '@sentry/types';
import { getGlobalObject, logger } from '@sentry/utils';
import hoistNonReactStatics from 'hoist-non-react-statics';
import React from 'react';

import { Action, Location } from './types';

interface RouteObject {
  caseSensitive?: boolean;
  children?: RouteObject[];
  element?: React.ReactNode;
  index?: boolean;
  path?: string;
}

type Params<Key extends string = string> = {
  readonly [key in Key]: string | undefined;
};

interface RouteMatch<ParamKey extends string = string> {
  params: Params<ParamKey>;
  pathname: string;
  route: RouteObject;
}

type UseEffect = (cb: () => void, deps: unknown[]) => void;
type UseLocation = () => Location;
type UseNavigationType = () => Action;
type CreateRoutesFromChildren = (children: JSX.Element[]) => RouteObject[];
type MatchRoutes = (routes: RouteObject[], location: Location) => RouteMatch[] | null;

let activeTransaction: Transaction | undefined;

let _useEffect: UseEffect;
let _useLocation: UseLocation;
let _useNavigationType: UseNavigationType;
let _createRoutesFromChildren: CreateRoutesFromChildren;
let _matchRoutes: MatchRoutes;
let _customStartTransaction: (context: TransactionContext) => Transaction | undefined;
let _startTransactionOnLocationChange: boolean;

const global = getGlobalObject<Window>();

const SENTRY_TAGS = {
  'routing.instrumentation': 'react-router-v6',
};

export function reactRouterV6Instrumentation(
  useEffect: UseEffect,
  useLocation: UseLocation,
  useNavigationType: UseNavigationType,
  createRoutesFromChildren: CreateRoutesFromChildren,
  matchRoutes: MatchRoutes,
) {
  return (
    customStartTransaction: (context: TransactionContext) => Transaction | undefined,
    startTransactionOnPageLoad = true,
    startTransactionOnLocationChange = true,
  ): void => {
    const initPathName = global && global.location && global.location.pathname;
    if (startTransactionOnPageLoad && initPathName) {
      activeTransaction = customStartTransaction({
        name: initPathName,
        op: 'pageload',
        tags: SENTRY_TAGS,
        metadata: {
          source: 'url',
        },
      });
    }

    _useEffect = useEffect;
    _useLocation = useLocation;
    _useNavigationType = useNavigationType;
    _matchRoutes = matchRoutes;
    _createRoutesFromChildren = createRoutesFromChildren;

    _customStartTransaction = customStartTransaction;
    _startTransactionOnLocationChange = startTransactionOnLocationChange;
  };
}

function getNormalizedName(
  routes: RouteObject[],
  location: Location,
  matchRoutes: MatchRoutes,
): [string, TransactionSource] {
  if (!routes || routes.length === 0 || !matchRoutes) {
    return [location.pathname, 'url'];
  }

  const branches = matchRoutes(routes, location);

  if (branches) {
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let x = 0; x < branches.length; x++) {
      if (branches[x].route && branches[x].route.path && branches[x].pathname === location.pathname) {
        const path = branches[x].route.path;
        if (path) {
          return [path, 'route'];
        }
      }
    }
  }

  return [location.pathname, 'url'];
}

export function withSentryReactRouterV6Routing<P extends Record<string, any>, R extends React.FC<P>>(Routes: R): R {
  if (
    !_useEffect ||
    !_useLocation ||
    !_useNavigationType ||
    !_createRoutesFromChildren ||
    !_matchRoutes ||
    !_customStartTransaction
  ) {
    __DEBUG_BUILD__ &&
      logger.warn('reactRouterV6Instrumentation was unable to wrap Routes because of one or more missing parameters.');

    return Routes;
  }

  let isBaseLocation: boolean = false;
  let routes: RouteObject[];

  const SentryRoutes: React.FC<P> = (props: P) => {
    const location = _useLocation();
    const navigationType = _useNavigationType();

    _useEffect(() => {
      // Performance concern:
      // This is repeated when <Routes /> is rendered.
      routes = _createRoutesFromChildren(props.children);
      isBaseLocation = true;

      if (activeTransaction) {
        const [name, source] = getNormalizedName(routes, location, _matchRoutes);
        activeTransaction.setName(name);
        activeTransaction.setMetadata({ source });
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.children]);

    _useEffect(() => {
      if (isBaseLocation) {
        if (activeTransaction) {
          activeTransaction.finish();
        }

        return;
      }

      if (_startTransactionOnLocationChange && (navigationType === 'PUSH' || navigationType === 'POP')) {
        if (activeTransaction) {
          activeTransaction.finish();
        }

        const [name, source] = getNormalizedName(routes, location, _matchRoutes);
        activeTransaction = _customStartTransaction({
          name,
          op: 'navigation',
          tags: SENTRY_TAGS,
          metadata: {
            source,
          },
        });
      }
    }, [props.children, location, navigationType, isBaseLocation]);

    isBaseLocation = false;

    // @ts-ignore Setting more specific React Component typing for `R` generic above
    // will break advanced type inference done by react router params
    return <Routes {...props} />;
  };

  hoistNonReactStatics(SentryRoutes, Routes);

  // @ts-ignore Setting more specific React Component typing for `R` generic above
  // will break advanced type inference done by react router params
  return SentryRoutes;
}