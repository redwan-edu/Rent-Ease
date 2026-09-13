/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as archive from "../archive.js";
import type * as audit from "../audit.js";
import type * as family from "../family.js";
import type * as files from "../files.js";
import type * as lib from "../lib.js";
import type * as members from "../members.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as properties from "../properties.js";
import type * as push from "../push.js";
import type * as pushData from "../pushData.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  archive: typeof archive;
  audit: typeof audit;
  family: typeof family;
  files: typeof files;
  lib: typeof lib;
  members: typeof members;
  notes: typeof notes;
  notifications: typeof notifications;
  payments: typeof payments;
  properties: typeof properties;
  push: typeof push;
  pushData: typeof pushData;
  tenants: typeof tenants;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
