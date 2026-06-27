import { LandingHeader } from "@/components/behar/landing/header";
import { LandingHero } from "@/components/behar/landing/hero";
import { TrustBand } from "@/components/behar/landing/trust-band";
import { SuiteGrid } from "@/components/behar/landing/suite-grid";
import { TargetCarousel } from "@/components/behar/landing/target-carousel";
import { BenefitsCarousel } from "@/components/behar/landing/benefits-carousel";
import { FourToolsSection } from "@/components/behar/landing/four-tools";
import { InteractiveDemoSection } from "@/components/behar/landing/demo-section";
import { AcademySection } from "@/components/behar/landing/academy-section";
import { PricingSection } from "@/components/behar/landing/pricing";
import { FinalCtaSection } from "@/components/behar/landing/final-cta";
import { LandingFooter } from "@/components/behar/landing/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] selection:bg-[#2A9D8F] selection:text-white font-sans overflow-x-hidden">
      <LandingHeader />
      
      <main>
        <LandingHero />
        <TrustBand />
        <SuiteGrid />
        <TargetCarousel />
        <BenefitsCarousel />
        <FourToolsSection />
        <InteractiveDemoSection />
        <AcademySection />
        <PricingSection />
        <FinalCtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}
