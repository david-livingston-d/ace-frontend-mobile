import type { components, paths } from './schema';

export type Schemas = components['schemas'];
export type Paths = paths;

export type MeOut = Schemas['MeOut'];
export type DashboardSalesOut = Schemas['DashboardSalesOut'];
export type SalesOrderListItem = Schemas['SalesOrderListItemOut'];
export type TokenPair = Schemas['TokenPair'];
