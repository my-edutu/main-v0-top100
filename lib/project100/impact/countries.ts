import { getCountries } from "libphonenumber-js/min";
const names = new Intl.DisplayNames(["en"], { type: "region" });
const overrides: Record<string, string> = {
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  CI: "Côte d'Ivoire",
  GM: "Gambia",
  TR: "Turkey",
};
export const RESIDENCE_COUNTRIES = getCountries()
  .map((code) => overrides[code] ?? names.of(code) ?? code)
  .sort((a, b) => a.localeCompare(b));
