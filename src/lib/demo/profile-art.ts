const profileArtwork: Record<string, string> = {
  BOOMBUDDY: "/assets/team-kelvin.png",
  DOLLYDASH: "/assets/team-rae.png",
  LIGHTLEAK: "/assets/team-princess.png",
  PROPMaster: "/assets/team-joseph.png",
  FRAMEHUNTER: "/assets/director.png",
  CUTMASTER: "/assets/team-joseph.png",
  REELRUNNER: "/assets/team-rae.png",
  BOOMOPERATOR: "/assets/team-kelvin.png",
  STORYBOARD: "/assets/team-princess.png",
  FOCUSPULLER: "/assets/team-portrait.png",
  GAFFER_GEM: "/assets/team-kelvin.png",
  SLATEQUEEN: "/assets/team-rae.png",
  TRACKSHOT: "/assets/team-joseph.png",
  FRAMEPERFECT: "/assets/team-princess.png",
  CAMERA_PRO: "/assets/crew-set-illustration.png",
};

export function getProfileArtwork(name: string) {
  return profileArtwork[name] ?? "/assets/team-portrait.png";
}
