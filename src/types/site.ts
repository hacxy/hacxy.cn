export interface TechItem {
  name: string;
  icon: string;
  color?: string;
}

export interface TechGroup {
  category: string;
  items: TechItem[];
}
