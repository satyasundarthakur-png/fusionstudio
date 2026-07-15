import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/15">
      <SliderPrimitive.Range className="absolute h-full bg-saffron" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-6 w-6 rounded-full border-2 border-saffron bg-midnight shadow transition-all
                 hover:scale-110 hover:shadow-[0_0_0_6px_rgba(239,159,39,0.18)]
                 active:scale-125 active:shadow-[0_0_0_10px_rgba(239,159,39,0.22)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron/60"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
