export interface TechItem {
  name: string;
  icon: string;
  color?: string;
  url?: string;
}

export interface TechGroup {
  category: string;
  items: TechItem[];
}
