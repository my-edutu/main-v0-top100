export interface Awardee {
  id: string;
  name: string;
  country: string;
  category: string;
  year: number;
  bio30?: string;
  photo_url?: string;
  featured?: boolean;
}