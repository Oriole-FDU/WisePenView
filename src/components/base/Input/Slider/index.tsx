import { Slider as HeroSlider } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';

export type SliderProps = ComponentProps<typeof HeroSlider>;

function SliderRoot({ children, ...props }: SliderProps) {
  return (
    <HeroSlider {...props}>
      {(children as ReactNode | undefined) ?? (
        <HeroSlider.Track>
          <HeroSlider.Fill />
          <HeroSlider.Thumb />
        </HeroSlider.Track>
      )}
    </HeroSlider>
  );
}

const Slider = Object.assign(SliderRoot, {
  Fill: HeroSlider.Fill,
  Marks: HeroSlider.Marks,
  Output: HeroSlider.Output,
  Root: SliderRoot,
  Thumb: HeroSlider.Thumb,
  Track: HeroSlider.Track,
});

export default Slider;
