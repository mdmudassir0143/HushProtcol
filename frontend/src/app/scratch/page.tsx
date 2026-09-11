import {ScratchPaymentForm} from "@/components/ScratchPaymentForm";

export const metadata = {title: "Create Gift Card · Hushh Protocol"};

export default function ScratchPage() {
  return (
    <div className="animate-fade mx-auto w-full max-w-6xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <header className="mb-6 max-w-xl sm:mb-8">
        <h1 className="text-[1.75rem] font-bold tracking-[-0.03em] sm:text-[2rem]">
          Create Gift Card
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-graphite sm:text-sm">
          Customize on the left. Preview the lottery ticket live on the right.
        </p>
      </header>
      <ScratchPaymentForm />
    </div>
  );
}
