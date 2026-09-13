import { getUserData } from './player';
import { PLAYFAB_DATA_KEYS } from './constants';
import type { KnowledgeEntry } from './types';

/**
 * Standard definitions for the 23 film set almanac entries.
 * Content and categories remain static; player unlock state is authoritative in PlayFab.
 */
export const STANDARD_ALMANAC_ENTRIES: Omit<KnowledgeEntry, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'rule_of_thirds', title: 'Rule of Thirds', category: 'cinematography', content: 'A fundamental composition technique where the frame is divided into a 3x3 grid.' },
  { id: 'three_point_lighting', title: 'Three-Point Lighting', category: 'lighting', content: 'The standard method of lighting using a key light, fill light, and back light.' },
  { id: 'director_tablet', title: "Director's Tablet", category: 'equipment', content: 'The primary tool for managing set operations, reviewing takes, and adjusting budgets on the fly.' },
  { id: 'led_panel', title: 'LED Panel Lighting', category: 'lighting', content: 'Versatile continuous lighting fixtures with adjustable color temperature and intensity.' },
  { id: 'nony_fx_camera', title: 'Nony FX Cinema Camera', category: 'equipment', content: 'A high-end digital cinema camera known for robust color science.' },
  { id: 'sd_card', title: 'Media Management', category: 'workflow', content: 'The critical process of organizing and backing up digital media files.' },
  { id: 'level_2_camera', title: 'Advanced Camera Support', category: 'equipment', content: 'Utilizing gimbals and steadicams to stabilize dynamic shots.' },
  { id: 'level_3_soft_light', title: 'Soft Lighting Techniques', category: 'lighting', content: 'Using diffusion materials to create flattering, wrap-around lighting on subjects.' },
  { id: 'level_1_workflow', title: 'Basic On-Set Protocol', category: 'workflow', content: 'Understanding the hierarchy and communication flow on a professional film set.' },
  { id: 'contracts_and_guides', title: 'Production Paperwork', category: 'production', content: 'Managing essential legal documents including location agreements and releases.' },
  { id: 'set_building', title: 'Art Direction Basics', category: 'production', content: 'Collaborating with the art department to build believable environments.' },
  { id: 'recording_workflow', title: 'Dual-System Audio', category: 'workflow', content: 'Recording audio on a dedicated device separate from the camera for higher quality sound.' },
  { id: 'automotive_staging', title: 'Automotive Rigging', category: 'cinematography', content: 'Specialized techniques for safely mounting cameras to vehicles for dynamic driving shots.' },
  { id: 'soft_light_technique', title: 'Book Lighting', category: 'lighting', content: 'Bouncing a light source off a reflector and through diffusion for an ultra-soft effect.' },
  { id: 'hiring_and_posing_actors', title: 'Working with Talent', category: 'production', content: 'Effective communication strategies for directors to elicit authentic performances.' },
  { id: 'shot_coverage', title: 'Master Scene Technique', category: 'cinematography', content: 'Shooting a scene starting with a wide master shot, followed by tighter coverage.' },
  { id: 'screen_continuity', title: 'The 180-Degree Rule', category: 'cinematography', content: 'Maintaining spatial relationships between characters by keeping camera on one side of an axis.' },
  { id: 'motivated_lighting', title: 'Motivated Lighting', category: 'lighting', content: 'Designing lighting that logically appears to come from practical sources in scene.' },
  { id: 'lifestyle_staging', title: 'Lifestyle Art Direction', category: 'production', content: 'Creating authentic, lived-in sets that reflect the brand demographic.' },
  { id: 'warm_commercial_grade', title: 'Color Grading: Commercial', category: 'post-production', content: 'Applying warm, inviting color palettes used in lifestyle and food commercials.' },
  { id: 'creative_brief', title: 'The Creative Brief', category: 'workflow', content: 'The foundational document that outlines project goals and deliverables.' },
  { id: 'visual_hierarchy', title: 'Visual Hierarchy', category: 'cinematography', content: "Using lighting, focus, and framing to direct the viewer's eye to key elements." },
  { id: 'quality_control', title: 'Broadcast QC', category: 'post-production', content: 'Technical checks to ensure deliverables meet broadcast standards.' },
];

/**
 * Get knowledge entries (Almanac) for the player.
 * Resolves authoritative unlock state from PlayFab User Data keys.
 * Never invents unlocks if data is missing or empty.
 */
export async function getKnowledge(sessionTicket: string): Promise<KnowledgeEntry[]> {
  try {
    const data = await getUserData(sessionTicket, [
      PLAYFAB_DATA_KEYS.almanac_unlocked,
      PLAYFAB_DATA_KEYS.knowledge,
    ]);

    const rawUnlocked = data[PLAYFAB_DATA_KEYS.almanac_unlocked] || data[PLAYFAB_DATA_KEYS.knowledge];
    let unlockedMap: Record<string, string | boolean> = {};

    if (rawUnlocked) {
      try {
        const parsed = JSON.parse(rawUnlocked);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') {
              unlockedMap[item] = true;
            } else if (item && typeof item === 'object' && item.id) {
              unlockedMap[item.id] = item.unlockedAt || item.isUnlocked || true;
            }
          }
        } else if (parsed && typeof parsed === 'object') {
          unlockedMap = parsed;
        }
      } catch {
        console.warn('[Almanac] Failed to parse almanac_unlocked JSON from PlayFab.');
      }
    }

    return STANDARD_ALMANAC_ENTRIES.map((entry) => {
      const unlockVal = unlockedMap[entry.id];
      const isUnlocked = Boolean(unlockVal);
      const unlockedAt = typeof unlockVal === 'string' ? unlockVal : isUnlocked ? new Date().toISOString() : null;

      return {
        ...entry,
        unlocked: isUnlocked,
        isUnlocked,
        unlockedAt,
        contentSummary: entry.content.slice(0, 100) + '...',
      };
    });
  } catch (error) {
    console.error('Failed to get knowledge:', error);
    // Graceful fallback: return all standard entries as locked
    return STANDARD_ALMANAC_ENTRIES.map((entry) => ({
      ...entry,
      unlocked: false,
      isUnlocked: false,
      unlockedAt: null,
      contentSummary: entry.content.slice(0, 100) + '...',
    }));
  }
}
