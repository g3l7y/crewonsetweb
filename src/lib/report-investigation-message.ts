export type ReportInvestigationKind = "bug" | "player";

const bugCategoryCopy: Record<string, string> = {
  Gameplay: "Our team is investigating the gameplay issue described in your report and reviewing the conditions you provided.",
  "Graphics / Visual": "Our team is reviewing the visual issue in your report, including the affected scene and graphics conditions.",
  Audio: "Our team is investigating the audio behavior described in your report and reviewing the details you provided.",
  "Performance / Crash": "Our team is investigating the performance or stability issue in your report and reviewing the steps that may reproduce it.",
  "Account & Login": "Our team is reviewing the account or sign-in issue you reported. We will handle account-related details with care.",
  "Shop & C-Coins": "Our team is reviewing the shop or C-Coin issue you reported, including any relevant purchase details.",
  "UI / Navigation": "Our team is reviewing the interface or navigation issue described in your report.",
  Other: "Our team is reviewing the issue described in your report and will assess the details you provided.",
};

const playerCategoryCopy: Record<string, string> = {
  Trolling: "Our moderation team is reviewing the reported trolling behavior in line with the community guidelines.",
  "Negative Attitude": "Our moderation team is reviewing the conduct described in your report and will assess it against the community guidelines.",
  "Verbal Abuse": "Our moderation team is carefully reviewing the reported verbal abuse and will assess it in line with the community guidelines.",
  Other: "Our moderation team is reviewing the conduct described in your report and will assess the information provided.",
};

export function buildReportStatusMessage(args: {
  kind: ReportInvestigationKind;
  reportId: string;
  category: string;
  status: "Investigating" | "Resolved";
}) {
  const category = args.category.trim() || "Other";
  const isBug = args.kind === "bug";
  const subject = isBug ? "Update on your bug report" : "Update on your player conduct report";
  const detail = (isBug ? bugCategoryCopy : playerCategoryCopy)[category]
    ?? (isBug ? bugCategoryCopy["Other"] : playerCategoryCopy["Other"]);
  const privacyNote = args.status === "Resolved"
    ? isBug
      ? "Thank you for helping us improve Crew On Set."
      : "To protect everyone’s privacy, we cannot share details of any action taken regarding another account."
    : isBug
      ? "We will review the report and any supporting information. We will share an update if further information is needed."
    : "To protect everyone’s privacy, we cannot share details of any action taken regarding another account.";
  const detailUpdate = args.status === "Resolved"
    ? isBug
      ? "Our team has completed its review of the issue you reported."
      : "Our moderation team has completed its review. To protect everyone’s privacy, we cannot share details of any action taken regarding another account."
    : detail;
  const body = [
    "Hello,",
    "",
    "Thank you for taking the time to contact the Crew On Set team. Your " +
      (isBug ? "bug report" : "player conduct report") +
      " (" + args.reportId + ") " + (args.status === "Resolved" ? "has been marked Resolved." : "has been moved to Investigating."),
    "",
    detailUpdate,
    privacyNote,
    "",
    "No further action is needed from you at this time. If you have important additional information, please submit it through the appropriate report form.",
    "",
    "Regards,",
    "Crew On Set Support",
  ].join("\n");

  return { subject, body };
}
