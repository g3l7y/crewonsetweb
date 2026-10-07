/** Give achievements a quick visual cue based on what they celebrate. */
export function achievementEmoji(title: string): string {
  const name = title.toLowerCase();

  if (/crystal|bloom|flower/.test(name)) return "🌸";
  if (/perfect|flawless/.test(name)) return "✨";
  if (/first day|level/.test(name)) return "🎬";
  if (/first take|camera|lens/.test(name)) return "📷";
  if (/rolling|ten take|replay|veteran|production/.test(name)) return "🎞️";
  if (/signed|sealed|delivered|contract|approved/.test(name)) return "📋";
  if (/director|filmmaker|film/.test(name)) return "🎥";
  if (/finishing/.test(name)) return "🪄";
  if (/budget|coin|keeper/.test(name)) return "💰";
  if (/crew|team|together|friend|collab/.test(name)) return "🤝";
  if (/rank|legend|champion|box office/.test(name)) return "🏆";
  if (/right first time|first try/.test(name)) return "✅";

  return "🏅";
}
