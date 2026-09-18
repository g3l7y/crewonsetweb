import { createStore } from "@/lib/demo/store";

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
  crewId: string;
  profileImage?: string;
  bio: string;
  joinedDate: string;
  socials: FriendSocials;
  career: FriendCareer;
};

const seedFriends: FriendProfile[] = [
  {
    name: "BOOMBUDDY",
    level: 39,
    role: "Sound Mixer",
    online: true,
    crewId: "COS-1942-BM",
    profileImage: "/assets/team-kelvin.png",
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
    profileImage: "/assets/team-rae.png",
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
    profileImage: "/assets/team-princess.png",
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
    profileImage: "/assets/team-joseph.png",
    bio: "Prop master specializing in detailed environments, practical props, and believable production worlds.",
    joinedDate: "January 9, 2024",
    socials: { instagram: "propmaster", facebook: "propmaster.cos" },
    career: { productionsCompleted: 51, yearsExperience: 7, specialties: ["Props", "Set Dressing", "Production Design"] },
  },
];

export const friendRosterStore = createStore<FriendProfile>("cos.friendRoster", seedFriends);
