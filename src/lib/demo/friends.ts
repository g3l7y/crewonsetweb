import { createStore } from "@/lib/demo/store";
import type { PlayerFriendRequest } from "@/lib/playfab/types";

export type FriendSocials = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
};

export type FriendCareer = {
  productionsCompleted: number;
  yearsExperience: number;
  specialties: string[];
};

export type FriendProfile = {
  name: string;
  level: number;
  role: string;
  online: boolean;
  showStatus?: boolean;
  crewId: string;
  profileImage?: string;
  bio: string;
  joinedDate: string;
  socials: FriendSocials;
  career: FriendCareer;
};

export type VisiblePlayerStatus = "Online" | "Offline" | null;

/**
 * Status is only visible to confirmed friends. A friend who hides their
 * status is intentionally shown as Offline, even while their live status is
 * online.
 */
export function getVisiblePlayerStatus(
  online: boolean,
  showStatus: boolean | undefined,
  viewerIsFriend: boolean,
): VisiblePlayerStatus {
  if (!viewerIsFriend) {
    return null;
  }

  return showStatus === false || !online ? "Offline" : "Online";
}

const seedFriends: FriendProfile[] = [
  {
    name: "BOOMBUDDY",
    level: 39,
    role: "Sound Mixer",
    online: true,
    crewId: "COS-1942-BM",
    profileImage: "/assets/profile-default.jpg",
    bio: "Sound enthusiast focused on clean production audio and creating immersive soundscapes for every project.",
    joinedDate: "March 14, 2024",
    socials: { instagram: "boombuddy", facebook: "boombuddy.cos", twitter: "boombuddy" },
    career: { productionsCompleted: 87, yearsExperience: 6, specialties: ["Production Sound", "Boom Operation", "Location Recording"] },
  },
  {
    name: "DOLLYDASH",
    level: 31,
    role: "Camera Operator",
    online: true,
    crewId: "COS-7381-DD",
    profileImage: "/assets/profile-default.jpg",
    bio: "Camera operator who loves dynamic movement, practical lighting, and finding the perfect shot.",
    joinedDate: "July 22, 2024",
    socials: { instagram: "dollydash", facebook: "dollydash.film", linkedin: "dollydash" },
    career: { productionsCompleted: 62, yearsExperience: 4, specialties: ["Camera Operation", "Gimbal", "Steadicam"] },
  },
  {
    name: "LIGHTLEAK",
    level: 29,
    role: "Lighting Artist",
    online: false,
    crewId: "COS-4920-LL",
    profileImage: "/assets/profile-default.jpg",
    bio: "Lighting artist creating cinematic atmosphere through color, contrast, and carefully controlled light.",
    joinedDate: "November 3, 2023",
    socials: { instagram: "lightleak", twitter: "lightleakfilm" },
    career: { productionsCompleted: 74, yearsExperience: 5, specialties: ["Lighting Design", "Color", "Practical Lighting"] },
  },
  {
    name: "PROPMaster",
    level: 34,
    role: "Prop Master",
    online: false,
    crewId: "COS-6157-PM",
    profileImage: "/assets/profile-default.jpg",
    bio: "Prop master specializing in detailed environments, practical props, and believable production worlds.",
    joinedDate: "January 9, 2024",
    socials: { instagram: "propmaster", facebook: "propmaster.cos" },
    career: { productionsCompleted: 51, yearsExperience: 7, specialties: ["Props", "Set Dressing", "Production Design"] },
  },
];

const seedFriendRequests: PlayerFriendRequest[] = [
  {
    id: "seed-incoming-framehunter",
    senderPlayFabId: "mock:framehunter",
    senderUsername: "FRAMEHUNTER",
    senderLevel: 27,
    senderRole: "Director",
    recipientPlayFabId: "mock:camera_pro",
    recipientUsername: "CAMERA_PRO",
    recipientLevel: 1,
    recipientRole: "Crew Member",
    createdAt: "2026-08-21T10:00:00.000Z",
    status: "pending",
  },
  {
    id: "seed-incoming-cutmaster",
    senderPlayFabId: "mock:cutmaster",
    senderUsername: "CUTMASTER",
    senderLevel: 22,
    senderRole: "Editor",
    recipientPlayFabId: "mock:camera_pro",
    recipientUsername: "CAMERA_PRO",
    recipientLevel: 1,
    recipientRole: "Crew Member",
    createdAt: "2026-08-19T10:00:00.000Z",
    status: "pending",
  },
  {
    id: "seed-outgoing-gaffer-gem",
    senderPlayFabId: "mock:camera_pro",
    senderUsername: "CAMERA_PRO",
    senderLevel: 1,
    senderRole: "Crew Member",
    recipientPlayFabId: "mock:gaffer_gem",
    recipientUsername: "GAFFER_GEM",
    recipientLevel: 24,
    recipientRole: "Gaffer",
    createdAt: "2026-08-20T10:00:00.000Z",
    status: "pending",
  },
  {
    id: "seed-outgoing-slatequeen",
    senderPlayFabId: "mock:camera_pro",
    senderUsername: "CAMERA_PRO",
    senderLevel: 1,
    senderRole: "Crew Member",
    recipientPlayFabId: "mock:slatequeen",
    recipientUsername: "SLATEQUEEN",
    recipientLevel: 19,
    recipientRole: "Script Supervisor",
    createdAt: "2026-08-17T10:00:00.000Z",
    status: "pending",
  },
  {
    id: "seed-outgoing-trackshot",
    senderPlayFabId: "mock:camera_pro",
    senderUsername: "CAMERA_PRO",
    senderLevel: 1,
    senderRole: "Crew Member",
    recipientPlayFabId: "mock:trackshot",
    recipientUsername: "TRACKSHOT",
    recipientLevel: 45,
    recipientRole: "Dolly Grip",
    createdAt: "2026-08-09T10:00:00.000Z",
    status: "pending",
  },
];

export const friendRosterStore = createStore<FriendProfile>("cos.friendRoster", seedFriends);
export const friendRequestsStore = createStore<PlayerFriendRequest>(
  "cos.friendRequests",
  seedFriendRequests,
);
