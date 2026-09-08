import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download — Crew On Set!" },
      { name: "description", content: "Download Crew On Set!, system requirements, and installation instructions." },
      { property: "og:title", content: "Download — Crew On Set!" },
      { property: "og:description", content: "Download Crew On Set!, system requirements, and installation instructions." },
    ],
  }),
  component: DownloadPage,
});

import { Download, Gamepad2, HardDrive, MonitorPlay, ShieldCheck } from "lucide-react";

import Image from "@/components/next-compat/image";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { buildInfoStore, gameBuildStore, installStepsStore, systemRequirementsStore } from "@/lib/demo/store";

const DOWNLOAD_URL = "https://drive.google.com/";

function DownloadPage() {
  const [requirements] = systemRequirementsStore.useStore();
  const [buildInfoRows] = buildInfoStore.useStore();
  const buildInfo = buildInfoRows[0];
  const [gameBuilds] = gameBuildStore.useStore();
  const currentBuild = gameBuilds[0];
  const [steps] = installStepsStore.useStore();
  const downloadHref = currentBuild?.downloadUrl?.trim() ? currentBuild.downloadUrl : DOWNLOAD_URL;

  return (
    <MarketingShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#070b13] pb-16 pt-32 text-white sm:pb-20 sm:pt-40">
        <Image src="/assets/hero-key-art.png" alt="Key art from Crew On Set!" fill priority className="object-cover opacity-30 saturate-[.8]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,7,13,.99),rgba(7,11,19,.84),rgba(7,11,19,.48))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:72px_72px]" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <span className="eyebrow mb-5 bg-coral/15 text-coral-light">GET THE GAME</span>

          <h1 className="section-title max-w-4xl text-white">
            Download <span className="text-yellow">Crew On Set!</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            Grab the latest build, check your rig against the requirements, and get your crew on set in minutes.
          </p>

          <a
            href={downloadHref}
            target="_blank"
            rel="noreferrer"
            className="cta-primary mt-8 inline-flex sm:mt-10"
          >
            <span className="cta-text">DOWNLOAD THE GAME</span>
            <span className="cta-icon">
              <Download className="size-6" />
            </span>
          </a>


          {buildInfo && (
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-white/50">
              <span>{buildInfo.version}</span>
              <span className="hidden sm:inline">·</span>
              <span>{buildInfo.builtOn}</span>
              <span className="hidden sm:inline">·</span>
              <span>{buildInfo.platform}</span>
              {currentBuild && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span>Build {currentBuild.buildNumber}</span>
                  <span className="hidden sm:inline">·</span>
                  <span>{currentBuild.minWindows}</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-navy py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="eyebrow mb-5 bg-coral/15 text-coral-light">ABOUT THE BUILD</span>
            <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              What&apos;s in <span className="text-yellow">the download.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-white/70">
              Crew On Set! is a 1–4 player co-op game about running a chaotic
              commercial production studio. This build includes the full
              story campaign, all four crew roles, and the online co-op
              matchmaking lobby.
            </p>
            <p className="mt-4 leading-relaxed text-white/70">
              This is an active playtest build — expect frequent updates,
              new sets, and balance changes as the studio grows.
            </p>

            {currentBuild?.releaseNotes && (
              <p className="mt-4 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/60">
                <span className="font-black uppercase tracking-wider text-yellow">
                  Version {currentBuild.version}
                </span>{" "}
                — {currentBuild.releaseNotes}
              </p>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <Gamepad2 className="size-5 shrink-0 text-yellow" />
                <span className="text-sm font-bold">1–4 player co-op</span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <MonitorPlay className="size-5 shrink-0 text-yellow" />
                <span className="text-sm font-bold">Commercial Making</span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <HardDrive className="size-5 shrink-0 text-yellow" />
                <span className="text-sm font-bold">{buildInfo?.installSize ?? "~~ GB install size"}</span>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
                <ShieldCheck className="size-5 shrink-0 text-yellow" />
                <span className="text-sm font-bold">Play Online</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-black uppercase tracking-wide">System Requirements</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
                    <th className="px-5 py-3 font-black">Component</th>
                    <th className="px-5 py-3 font-black">Minimum</th>
                    <th className="px-5 py-3 font-black">Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 align-top last:border-0">
                      <td className="px-5 py-3 font-black text-yellow">{row.label}</td>
                      <td className="px-5 py-3 text-white/75">{row.minimum}</td>
                      <td className="px-5 py-3 text-white/75">{row.recommended}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#090e18] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Installation <span className="text-coral">instructions.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.id} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <span className="grid size-9 place-items-center rounded-md bg-coral text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-black uppercase tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
