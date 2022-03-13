export interface Team {
  name: string;
  abbr: string;
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  alternates?: string[] | string;
  logo: {
    url: string;
    background: string;
  };
}
