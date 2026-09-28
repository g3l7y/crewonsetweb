import type { CosmeticItem } from "@/lib/demo/portal-shop";

type CosmeticArtProps = {
  item: Pick<CosmeticItem, "assetKey" | "name" | "category">;
  className?: string;
};

const INK = "#252525";
const CREAM = "#F4E8D2";
const CORAL = "#C94F3D";
const MUSTARD = "#D9A63A";
const BLUE = "#4A78A8";
const GREEN = "#5B8C68";
const PLUM = "#7E6AA8";

export function CosmeticArt({ item, className = "" }: CosmeticArtProps) {
  return (
    <div className={`cosmetic-art ${className}`} role="img" aria-label={`${item.name}, ${item.category} cosmetic`}>
      <svg viewBox="0 0 240 190" aria-hidden="true" focusable="false">
        <rect x="8" y="8" width="224" height="174" rx="24" fill={CREAM} />
        <path d="M25 148C61 164 179 164 215 148" fill="none" stroke={INK} strokeOpacity=".12" strokeWidth="3" strokeDasharray="5 9" />
        <circle cx="36" cy="40" r="6" fill={MUSTARD} />
        <circle cx="204" cy="44" r="5" fill={CORAL} />
        {renderArt(item.assetKey)}
      </svg>
    </div>
  );
}

function renderArt(assetKey: string) {
  const common = { stroke: INK, strokeWidth: 7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (assetKey) {
    case "soft-crop":
      return <path d="M62 103c-6-35 15-61 56-61 38 0 61 23 58 61-11-8-20-15-32-18-14 15-39 19-82 18Z" fill={BLUE} {...common} />;
    case "coral-bob":
      return <path d="M53 122c-10-44 3-77 43-85 45-9 77 21 77 69l-16 30-18-17-11 16-15-18-16 18-16-17-18 15Z" fill={CORAL} {...common} />;
    case "studio-curls":
      return <path d="M58 126c-13-10-13-31 3-38-9-19 8-38 25-34 1-22 35-29 48-10 23-13 49 11 40 34 22 9 19 41-4 47l-15-14-18 17-22-17-22 17-18-17Z" fill={MUSTARD} {...common} />;
    case "indigo-swoop":
      return <path d="M55 112c-2-47 27-72 75-68 31 3 48 22 51 46-21-13-42-15-60-4-20 11-38 22-66 26Z" fill={PLUM} {...common} />;
    case "gold-pompadour":
      return <path d="M48 111c-1-25 13-42 33-49-5-21 20-43 43-33 15-20 52-8 54 16 25 6 33 40 11 55-25-18-52-21-77-9-20 10-40 19-64 20Z" fill={MUSTARD} {...common} />;
    case "coral-tee":
      return <path d="M72 55 91 45h58l20 10 27 20-17 25-18-11v55H79V91L61 100 44 75l28-20Z" fill={CORAL} {...common} />;
    case "blue-overshirt":
      return <path d="m80 42 17-9h47l18 9 28 29-22 22-13-11v53H68V82L54 93 33 72l29-30Z" fill={BLUE} {...common} />;
    case "utility-hoodie":
      return <g><path d="m75 49 24-18h42l24 18 26 28-19 22-14-12v39H82V87L67 99 48 77l27-28Z" fill={GREEN} {...common} /><path d="M99 33c0 19 42 19 42 0M109 74h22v29h-22z" fill="none" {...common} /></g>;
    case "mustard-knit":
      return <g><path d="M77 46h86l28 29-18 24-16-12v39H83V87L66 99 48 75l29-29Z" fill={MUSTARD} {...common} /><path d="M102 46c4 15 32 15 36 0M102 77h36v26h-36z" fill="none" {...common} /></g>;
    case "plum-jacket":
      return <g><path d="M77 44 96 32h48l19 12 30 29-20 24-15-13v40H82V84L67 97 47 73l30-29Z" fill={PLUM} {...common} /><path d="M119 38v85M98 67h18M142 67h-18M106 105h28" fill="none" {...common} /></g>;
    case "charcoal-jeans":
      return <g><path d="M76 45h88l-7 35-7 67h-27l-3-50-4 50H89l-6-67-7-35Z" fill={INK} {...common} /><path d="M76 45h88M98 60h44" fill="none" stroke={CREAM} strokeWidth="5" /></g>;
    case "olive-cargos":
      return <g><path d="M78 45h84l-5 36-5 66h-27l-3-49-4 49H91l-6-66-7-36Z" fill={GREEN} {...common} /><path d="M78 45h84M89 89h25v22H91M146 89h25v22h-23" fill="none" {...common} /></g>;
    case "coral-skirt":
      return <g><path d="M88 44h64l7 29 25 74H56l25-74 7-29Z" fill={CORAL} {...common} /><path d="M91 61h58M83 83l-11 64M107 83l-3 64M133 83l3 64M157 83l11 64" fill="none" stroke={CREAM} strokeWidth="5" /></g>;
    case "indigo-trousers":
      return <g><path d="M77 45h86l-4 34-7 67h-27l-4-51-4 51H90l-6-67-7-34Z" fill={BLUE} {...common} /><path d="M77 45h86M107 59h26" fill="none" stroke={CREAM} strokeWidth="5" /></g>;
    case "studio-boots":
      return <g><path d="M74 45h47v70l33 12c19 7 30 17 30 31H60c0-12 7-22 20-29l-6-84Z" fill={INK} {...common} /><path d="M80 88h37M80 101h37" fill="none" stroke={CREAM} strokeWidth="5" /></g>;
    case "coral-high-tops":
      return <g><path d="M76 42h48v72l31 11c20 7 29 18 29 33H60c0-14 8-25 22-32l-6-84Z" fill={CORAL} {...common} /><path d="M85 72h30M85 87h30M85 102h30" fill="none" stroke={CREAM} strokeWidth="5" /></g>;
    case "round-ink":
      return <g fill="none" {...common}><circle cx="84" cy="95" r="30" /><circle cx="156" cy="95" r="30" /><path d="M114 94c8-8 18-8 26 0M54 94H38M186 94h16" /></g>;
    case "square-coral":
      return <g fill="none" stroke={CORAL} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"><rect x="47" y="65" width="62" height="55" rx="12" /><rect x="131" y="65" width="62" height="55" rx="12" /><path d="M109 79c7-7 15-7 22 0M47 92H31M193 92h16" /></g>;
    case "cat-eye":
      return <g fill="none" stroke={PLUM} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"><path d="m45 80 18-16h43l14 13-10 38H67L51 103Z" /><path d="m195 80-18-16h-43l-14 13 10 38h43l16-12Z" /><path d="M120 78c0-8 0-8 0 0M51 82 36 70M189 82l15-12" /></g>;
    case "gold-wire":
      return <g fill="none" stroke={MUSTARD} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><circle cx="83" cy="95" r="30" /><circle cx="157" cy="95" r="30" /><path d="M113 94c6-5 8-5 14 0M53 95H35M187 95h18" /></g>;
    default:
      return <path d="M70 58h100l14 32-22 44H78L56 90l14-32Z" fill={BLUE} {...common} />;
  }
}
