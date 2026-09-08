import { createStore } from "@/lib/demo/store";

/**
 * Almanac equipment entries. Seeded from the original static catalog and
 * editable from Admin → Almanac Management. Shaped flat so it can later be
 * swapped for PlayFab title data without touching the UI.
 */
export type AlmanacEntry = {
  id: string;
  name: string;
  category: string;
  tier: string;
  role: string;
  image: string;
  description: string;
  features: string[];
  gameplay: string;
  specs: [string, string][];
};

export const seedAlmanac: AlmanacEntry[] = [
  {
    id: "sony-fx3",
    name: "Sony FX3",
    category: "Cameras",
    tier: "Low-End",
    role: "Cameraman",
    image: "/assets/gameplay-shot.png",
    description:
      "A compact cinema camera built for productions where mobility matters more than precision. The FX3 gives the Cameraman everything needed to capture a usable shot, but its limited stabilization and manual focusing make every frame a test of skill. Its drifting reticle forces operators to constantly correct camera sway, while the lack of focus feedback means sharpness must be judged entirely by eye.",
    features: [
      "Rule of Thirds Grid",
      "Zoom / Focal Length",
      "Tilt & Pan Controls",
      "Drift Reticle",
      "Manual Focus Ring",
    ],
    gameplay:
      "Camera sway constantly pushes the frame away from the intended composition. Manual focus provides no visual assistance, requiring the player to judge sharpness visually.",
    specs: [
      ["Stabilization", "Limited"],
      ["Focus Assist", "None"],
      ["Tracking", "Manual"],
      ["Tripod Lock", "No"],
    ],
  },
  {
    id: "sony-fs7m2",
    name: "Sony FS7M2",
    category: "Cameras",
    tier: "Mid-End",
    role: "Cameraman",
    image: "/assets/story-studio.png",
    description:
      "A professional workhorse designed to give Cameramen greater control without removing the need for hands-on operation. The FS7M2 introduces Focus Peaking, allowing operators to immediately identify subjects that are properly focused. Its improved stabilization also reduces camera sway, making composition considerably easier while still requiring the player to manually track moving actors.",
    features: [
      "Focus Peaking",
      "Reduced Camera Sway",
      "Rule of Thirds Grid",
      "Zoom / Focal Length",
      "Manual Actor Tracking",
    ],
    gameplay:
      "Focus Peaking outlines objects that are currently in focus, while improved stabilization reduces camera sway by 50%. Moving actors must still be manually tracked.",
    specs: [
      ["Stabilization", "50% Improved"],
      ["Focus Assist", "Focus Peaking"],
      ["Tracking", "Manual"],
      ["Tripod Lock", "No"],
    ],
  },
  {
    id: "sony-z280",
    name: "Sony Z280",
    category: "Cameras",
    tier: "High-End",
    role: "Cameraman",
    image: "/assets/hero-key-art.png",
    description:
      "A broadcast-grade camera equipped with intelligent tracking capabilities that dramatically reduce the workload of the Cameraman. Its AI Face Tracking identifies an actor and automatically maintains both focus and framing as they move through the scene. Combined with Tripod Lock, the Z280 eliminates camera sway entirely.",
    features: [
      "AI Face Tracking",
      "Automatic Focus",
      "Automatic Actor Tracking",
      "Tripod Lock",
      "Zero Camera Sway",
    ],
    gameplay:
      "Clicking an actor activates AI Face Tracking. The camera automatically rotates and focuses on the selected actor while Tripod Lock completely removes camera sway.",
    specs: [
      ["Stabilization", "Tripod Lock"],
      ["Focus Assist", "AI"],
      ["Tracking", "Automatic"],
      ["Camera Sway", "None"],
    ],
  },
  {
    id: "160-led-panel",
    name: "160 LED Panel",
    category: "Lighting",
    tier: "Low-End",
    role: "Lighting",
    image: "/assets/story-studio.png",
    description:
      "A straightforward lighting solution for crews working with limited equipment. The 160 LED Panel provides reliable illumination, but its fixed color temperature and hard light characteristics make it difficult to integrate with more demanding environments. Sharp shadows appear on the Heat Map, warning the player that the lighting may produce an Academic Error.",
    features: [
      "Intensity Control",
      "Lux Meter",
      "Footcandle Meter",
      "Light Stand Rotation",
      "Hard Light Warning",
    ],
    gameplay:
      "The fixed Kelvin temperature prevents the player from matching the room's ambient lighting. Harsh shadows appear on the Heat Map and can result in Academic Errors.",
    specs: [
      ["Color", "Fixed Kelvin"],
      ["Diffusion", "None"],
      ["Shadow", "Hard"],
      ["Automation", "None"],
    ],
  },
  {
    id: "aputure-cob-softbox",
    name: "Aputure COB + Softbox",
    category: "Lighting",
    tier: "Mid-End",
    role: "Lighting",
    image: "/assets/gameplay-shot.png",
    description:
      "A versatile lighting combination that gives the Lighting Artist greater control over both intensity and shadow quality. The COB light provides stronger illumination while the Softbox introduces diffusion, transforming harsh shadows into softer, more acceptable lighting. The operator must still manually adjust Kelvin to match the surrounding environment.",
    features: [
      "Intensity Control",
      "Lux / Footcandle Meter",
      "Diffusion Toggle",
      "Softbox",
      "Manual Kelvin Control",
    ],
    gameplay:
      "Activating Diffusion applies the Softbox and softens the shadows displayed on the Heat Map. Kelvin must still be manually adjusted to match the background.",
    specs: [
      ["Color", "Manual Kelvin"],
      ["Diffusion", "Softbox"],
      ["Shadow", "Soft"],
      ["Automation", "Partial"],
    ],
  },
  {
    id: "arri-skypanel",
    name: "ARRI SkyPanel",
    category: "Lighting",
    tier: "High-End",
    role: "Lighting",
    image: "/assets/hero-key-art.png",
    description:
      "A professional lighting system designed for productions where precision is paramount. The SkyPanel combines powerful illumination with advanced RGB color control, allowing Lighting Artists to reproduce virtually any required color temperature or hue. Its Auto-Match system can sample the environment and automatically configure the light to blend seamlessly with the scene.",
    features: [
      "RGB Color Wheel",
      "Auto-Match",
      "Color Sampling",
      "Automatic Kelvin",
      "Precision Exposure Control",
    ],
    gameplay:
      "The player can sample the background with the color picker and Auto-Match automatically configures the light's color and Kelvin temperature.",
    specs: [
      ["Color", "RGB"],
      ["Matching", "Automatic"],
      ["Diffusion", "Advanced"],
      ["Automation", "High"],
    ],
  },
  {
    id: "on-camera-boom-microphone",
    name: "On-Camera / Boom Microphone",
    category: "Audio",
    tier: "Low-End",
    role: "Audio",
    image: "/assets/gameplay-shot.png",
    description:
      "The entry-level solution for capturing production dialogue. While capable of recording usable speech, its broad pickup pattern makes it vulnerable to unwanted crew noise and ambient room tone. A visible Noise Floor shows the player exactly how much background sound is competing with the actor's voice.",
    features: [
      "dB Level Meter",
      "Gain Control",
      "Noise Floor Overlay",
      "Wide Pickup Pattern",
      "Manual Positioning",
    ],
    gameplay:
      "The wide pickup pattern captures unwanted crew noise. If an actor speaks too quietly, their dialogue becomes buried beneath the visible Noise Floor.",
    specs: [
      ["Pickup", "Wide"],
      ["Noise Control", "None"],
      ["Backup Track", "No"],
      ["Mixing", "Manual"],
    ],
  },
  {
    id: "xlr-boom-recorder",
    name: "XLR Boom + Recorder",
    category: "Audio",
    tier: "Mid-End",
    role: "Audio",
    image: "/assets/story-studio.png",
    description:
      "A dedicated production audio setup that provides considerably greater control over dialogue capture. The narrower pickup pattern reduces unwanted sounds from the sides, while the Low-Cut Filter removes much of the low-frequency room noise visible on the Noise Floor.",
    features: [
      "XLR Connection",
      "Low-Cut Filter",
      "Narrow Pickup Pattern",
      "Gain Control",
      "Dedicated Recorder",
    ],
    gameplay:
      "The Low-Cut Filter clears much of the Noise Floor while the narrower pickup pattern reduces sounds coming from the sides of the microphone.",
    specs: [
      ["Pickup", "Narrow"],
      ["Noise Control", "Low-Cut"],
      ["Backup Track", "No"],
      ["Mixing", "Manual"],
    ],
  },
  {
    id: "digital-mixer-wireless-lavs",
    name: "Digital Mixer + Wireless Lavs",
    category: "Audio",
    tier: "High-End",
    role: "Audio",
    image: "/assets/hero-key-art.png",
    description:
      "A professional multi-channel audio system built around redundancy and automatic level management. Wireless lavalier microphones allow actors to move freely while the Digital Mixer continuously monitors their signals. Safe-Track Recording provides a backup channel when one microphone clips, while Auto-Mix maintains balanced dialogue levels automatically.",
    features: [
      "Wireless Lavalier Mics",
      "Dual dB Monitoring",
      "Safe-Track Recording",
      "Auto-Mix",
      "Automatic Level Balancing",
    ],
    gameplay:
      "Two audio signals are recorded simultaneously. If one channel clips, the backup remains available. Auto-Mix automatically keeps dialogue levels balanced.",
    specs: [
      ["Pickup", "Wireless"],
      ["Noise Control", "Advanced"],
      ["Backup Track", "Yes"],
      ["Mixing", "Automatic"],
    ],
  },
  {
    id: "production-laptop",
    name: "Production Laptop",
    category: "Editing",
    tier: "Low-End",
    role: "Editor",
    image: "/assets/gameplay-shot.png",
    description:
      "A basic editing workstation capable of completing a production, but not without considerable patience. Limited processing power introduces Ingestion Lag after filming, while the unstable Sync interface makes precise audio-to-video alignment more difficult.",
    features: [
      "Timeline Trimming",
      "Basic Color Wheels",
      "Export Controls",
      "Ingestion Lag",
      "Jittery Sync",
    ],
    gameplay:
      "Production footage takes longer to ingest. During the Sync mini-game, clips jitter slightly, making perfect audio-to-video alignment more difficult.",
    specs: [
      ["Processing", "Limited"],
      ["Monitoring", "Basic"],
      ["Auto-Sync", "No"],
      ["Error Detection", "None"],
    ],
  },
  {
    id: "indie-station",
    name: "Indie Station",
    category: "Editing",
    tier: "Mid-End",
    role: "Editor",
    image: "/assets/story-studio.png",
    description:
      "A dedicated editing workstation that gives the Editor considerably more information during post-production. Dual monitors allow the timeline to remain visible alongside professional scopes such as the Vectorscope and Waveform, making technical problems easier to identify.",
    features: [
      "Dual Monitors",
      "Timeline Trimming",
      "Vectorscope",
      "Waveform Monitor",
      "Color Wheels",
    ],
    gameplay:
      "The second monitor provides dedicated Vectorscope and Waveform displays, making Illegal Colors and exposure problems much easier to identify.",
    specs: [
      ["Processing", "Improved"],
      ["Monitoring", "Dual"],
      ["Auto-Sync", "No"],
      ["Error Detection", "Visual"],
    ],
  },
  {
    id: "video-village",
    name: "Video Village",
    category: "Editing",
    tier: "High-End",
    role: "Editor",
    image: "/assets/hero-key-art.png",
    description:
      "A complete professional post-production environment designed to catch problems before they reach the client. Auto-Sync eliminates the tedious process of manually aligning audio and video, while Error Highlighting identifies technical issues originating from other departments.",
    features: [
      "Auto-Sync",
      "Error Highlighting",
      "Reference Monitor",
      "Soft Focus Detection",
      "Clipping Detection",
    ],
    gameplay:
      "The Magic Wand automatically synchronizes audio and video. The Reference Monitor highlights Soft Focus, Clipping, and other technical errors in red so the Editor can request a retake.",
    specs: [
      ["Processing", "Professional"],
      ["Monitoring", "Reference"],
      ["Auto-Sync", "Yes"],
      ["Error Detection", "Automatic"],
    ],
  },
];

export const almanacStore = createStore<AlmanacEntry>("cos.almanac", seedAlmanac);
