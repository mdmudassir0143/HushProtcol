import HowItWorks from "@/components/HowItWorks";
import InteractiveNoteStrip from "@/components/InteractiveNoteStrip";
import InteractivePillars from "@/components/InteractivePillars";
import LandingCta from "@/components/LandingCta";
import LandingHero from "@/components/LandingHero";
import ProtocolFlow from "@/components/ProtocolFlow";

export default function Home() {
  return (
    <div className="flex w-full flex-col items-center gap-24 text-center sm:gap-32 md:gap-40">
      <LandingHero />

      <div id="architecture" className="landing-band w-full max-w-6xl scroll-mt-28">
        <ProtocolFlow />
      </div>

      <InteractivePillars />

      <div id="how-it-works" className="landing-band w-full max-w-5xl scroll-mt-28">
        <HowItWorks />
      </div>

      <InteractiveNoteStrip />

      <LandingCta />
    </div>
  );
}
