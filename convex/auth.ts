import {
  BetterAuth,
  type AuthFunctions,
  type PublicAuthFunctions,
} from "@convex-dev/better-auth";
import { api, components, internal } from "./_generated/api";
import { query } from "./_generated/server";
import type { Id, DataModel } from "./_generated/dataModel";

const authFunctions: AuthFunctions = internal.auth;
const publicAuthFunctions: PublicAuthFunctions = api.auth;

export const betterAuthComponent = new BetterAuth(components.betterAuth, {
  authFunctions,
  publicAuthFunctions,
});

export const {
  createUser,
  updateUser,
  deleteUser,
  createSession,
  isAuthenticated,
} = betterAuthComponent.createAuthFunctions<DataModel>({
  onCreateUser: async (ctx, profile) => {
    return ctx.db.insert("profiles", {
      email: profile.email,
      fullName: profile.name ?? "",
      avatarUrl: profile.image ?? undefined,
      createdAt: Date.now(),
    });
  },

  onDeleteUser: async (ctx, profileId) => {
    await ctx.db.delete(profileId as Id<"profiles">);
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const profileMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!profileMetadata) {
      return null;
    }
    const profile = await ctx.db.get(profileMetadata.userId as Id<"profiles">);
    
    return {
      ...profile,
      ...profileMetadata,
    };
  },
});
