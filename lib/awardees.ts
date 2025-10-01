import fs from "fs";
import path from "path";
import { read, utils } from "xlsx";

export type Awardee = {
  id: string;
  slug: string;
  name: string;
  email?: string;
  country?: string;
  cgpa?: string | number;
  course?: string;
  bio?: string; // leadership description
};

// simple slugify
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

let _cache: Awardee[] | null = null;

export async function getAwardees(): Promise<Awardee[]> {
  if (_cache) return _cache;
  const file = path.join(process.cwd(), "public", "top100 Africa future Leaders 2025.xlsx");
  if (!fs.existsSync(file)) {
    // For development: create fallback data for 400+ awardees
    const awardees = [];
    const firstNames = ["Adaeze", "Kwame", "Zinhle", "Fatima", "Chiamaka", "Samuel", "Lerato", "Yusuf", "Aisha", "Tendai", "Nomsa", "Amara", "Grace", "Kofi", "Zara", "Nneka", "Thabo", "Aminata", "Salma", "Bright", "Ugonna", "Modibo", "Khadija", "Emeka", "Leyla", "Sipho", "Mariam", "Hassan", "Bukola", "Kagiso", "David", "Sarah", "Michael", "Grace", "James", "Fatoumata", "Moses", "Ngozi", "Emmanuel", "Amina", "Omar", "Zara", "Daniel", "Grace", "Kwesi", "Akosua", "Thabo", "Nomthandazo", "Sizani", "Lungelo"];
    const lastNames = ["Okafor", "Mensah", "Dlamini", "Al-Zahra", "Nzube", "Osei", "Mokoena", "Diallo", "Bakari", "Muzenda", "Mbeki", "Okello", "Nkomo", "Asante", "Jallow", "Eze", "Molefe", "Diallo", "Hassan", "Asiedu", "Okonkwo", "Keita", "Alami", "Chukwu", "Osman", "Ndlovu", "Diallo", "Juma", "Salako", "Molepo", "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez"];
    
    // Generate 400+ awardees
    for (let i = 0; i < 412; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const name = `${firstName} ${lastName} ${i > 29 ? i + 1 : ''}`.trim();
      
      awardees.push({
        id: `${i + 1}`,
        slug: slugify(name),
        name: name,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i > 29 ? i + 1 : ''}@example.com`,
        country: ["Nigeria", "Ghana", "South Africa", "Morocco", "Mali", "Tanzania", "Zimbabwe", "Uganda", "Gambia", "Somalia", "Kenya", "Ethiopia", "Egypt", "Algeria", "Senegal", "Tunisia", "Zambia", "Cameroon", "Chad", "Niger"][i % 20],
        cgpa: Number((Math.random() * 1.5 + 3.5).toFixed(2)), // Random CGPA between 3.5 and 5.0
        course: ["Computer Science", "Engineering", "Medicine", "Law", "Business", "Agriculture", "Education", "Arts", "Social Sciences", "Environmental Science", "Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Political Science", "Psychology", "Sociology", "History", "Geography"][i % 20],
        bio: `Outstanding leader and innovator in their field, making significant contributions to ${
          ["technology", "healthcare", "education", "environment", "social impact", "business", "research", "community development", "entrepreneurship", "public policy"][i % 10]
        }.`
      });
    }
    
    return awardees;
  }
  
  const buf = fs.readFileSync(file);
  const wb = read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = utils.sheet_to_json(sheet, { defval: "" });

  const norm = (k: string) => String(k).toLowerCase().replace(/\s+/g, "");
  const out: Awardee[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // try flexible column names
    const entries = Object.fromEntries(
      Object.entries(r).map(([k, v]) => [norm(k), v])
    );
    const name = (entries.name || entries.fullname || entries.awardee || "").toString().trim();
    if (!name) continue;

    const baseSlug = slugify(name);
    const count = (seen.get(baseSlug) ?? 0) + 1;
    seen.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${count}` : baseSlug;

    // Extract country name properly - remove abbreviations like "NG Nigeria", keep only "Nigeria"
    let country = (entries.country || entries.nationality || "").toString().trim();
    if (country && country.includes(' ')) {
      // If it looks like "XX CountryName", extract just the country name
      const parts = country.split(' ');
      if (parts.length >= 2 && parts[0].length === 2) { // Two-letter abbreviation
        country = parts.slice(1).join(' '); // Take everything after the abbreviation
      }
    }

    out.push({
      id: String(i + 1),
      slug,
      name,
      email: (entries.email || entries.mail || entries["e-mail"] || entries.e_mail || "").toString().trim(),
      country: country,
      cgpa: entries.cgpa || entries.gpa || entries.grade || entries["cgpa/gpa"] || entries["overall cgpa"] || entries["overall gpa"] || "",
      course: (entries.course || entries.program || entries.department || entries.fieldofstudy || "").toString().trim(),
      bio: (entries.description || entries.leadership || entries.bio || entries.about || entries["descriptionaboutleadership"] || entries["about section"] || "").toString().trim(),
    });
  }
  _cache = out;
  return out;
}