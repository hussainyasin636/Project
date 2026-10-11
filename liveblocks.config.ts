/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { LiveObject, LiveMap, LsonObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
      isThinking?: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      flow: LiveObject<{
        nodes: LiveMap<string, LiveObject<LsonObject>>;
        edges: LiveMap<string, LiveObject<LsonObject>>;
      }>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar?: string;
        color: string;
        displayName?: string;
        avatarUrl?: string;
        cursorColor?: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent:
      | {
          type: "AI_STATUS";
          status: "start" | "processing" | "complete" | "error";
          message: string;
          summary?: string;
          timestamp: number;
        }
      | {
          type: "ai-status-feed";
          status?: "idle" | "start" | "thinking" | "processing" | "complete" | "error";
          text?: string;
          message?: string;
          summary?: string;
          taskType?: "design" | "spec" | "general";
          timestamp?: number;
        };

    // Custom metadata set on feeds, for useFeeds, useCreateFeed, etc.
    FeedMetadata: {
      name?: string;
    };

    // Custom data set on feed messages, for useFeedMessages, useCreateFeedMessage, etc.
    FeedMessageData: {
      status?: "idle" | "start" | "thinking" | "processing" | "complete" | "error";
      text?: string;
      message?: string;
      summary?: string;
      taskType?: "design" | "spec" | "general";
      timestamp?: number;
      userId?: string;
      // Chat message fields
      sender?:
        | string
        | {
            id?: string;
            name: string;
            avatar?: string;
            color?: string;
          };
      role?: "user" | "assistant" | "system";
      content?: string;
    };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {};

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {};

    // Custom group info set with resolveGroupsInfo, for useGroupInfo
    GroupInfo: {};

    // Custom activities data for custom notification kinds
    ActivitiesData: {};
  }
}

export {};
