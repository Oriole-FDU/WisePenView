export interface StepDotItem {
  title: string;
}

export interface StepDotsProps {
  items: StepDotItem[];
  current: number;
  className?: string;
}
