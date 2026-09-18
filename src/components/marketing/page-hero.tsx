import type { ReactNode } from "react";
import Image from "@/components/next-compat/image";
import { CameraFrame } from "@/components/marketing/camera-frame";

export function PageHero({ eyebrow, title, accent, description, image, imageAlt, cameraFrame = false }: {
  eyebrow: string;
  title: string;
  accent: ReactNode;
  description: string;
  image: string;
  imageAlt: string;
  cameraFrame?: boolean;
}) {
  return (
    <section className="page-hero relative overflow-hidden border-b border-white/10 bg-[#070b13] pb-20 pt-32 text-white sm:pb-24 sm:pt-40">
      <Image src={image} alt={imageAlt} fill priority className="object-cover opacity-30 saturate-[.8]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,7,13,.99),rgba(7,11,19,.84),rgba(7,11,19,.48))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:72px_72px]" />
      {cameraFrame ? <CameraFrame /> : null}
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <span className="eyebrow mb-5 bg-coral/15 text-coral-light">{eyebrow}</span>
        <h1 className="section-title max-w-4xl text-white">{title} {accent}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">{description}</p>
      </div>
    </section>
  );
}
