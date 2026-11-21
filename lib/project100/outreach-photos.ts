export const project100OutreachSource = "https://www.linkedin.com/showcase/project100-schoharships/"

export const project100OutreachPhotos = [
  ["17-delta", "Students and volunteers gather outside a school in Delta State"],
  ["02-anambra", "Children sit together during a school visit in Anambra"],
  ["08-bayelsa", "The Project100 team speaks to students in a hall in Bayelsa"],
  ["27-lagos", "Students and volunteers hold signs at a school visit in Lagos"],
  ["07-bayelsa", "Volunteers and a student pose together outside a school in Bayelsa"],
  ["18-delta", "Students stand beside a volunteer at a school in Delta State"],
  ["28-lagos", "Volunteers meet students in a school yard in Lagos"],
  ["09-bayelsa", "The outreach team poses together in a school hall in Bayelsa"],
  ["19-delta", "A volunteer hands school supplies to a student in Delta State"],
  ["30-lagos", "Students sit in rows during a school visit in Lagos"],
  ["10-bayelsa", "A black-and-white photo of the outreach in a school hall in Bayelsa"],
  ["20-delta", "Volunteers speak to students in a school yard in Delta State"],
  ["29-lagos", "Two outreach volunteers hold a blue sign at a school in Lagos"],
  ["11-bayelsa", "A volunteer takes a group photo outside a school in Bayelsa"],
  ["22-delta", "Students gather in groups for the school visit in Delta State"],
  ["16-bayelsa", "A team member stands with students in a school hall in Bayelsa"],
  ["23-delta", "A volunteer speaks to students from the steps in Delta State"],
  ["25-delta", "A volunteer meets a student on the school steps in Delta State"],
].map(([filename, alt], id) => ({ id, src: `/project100/outreach/${filename}.webp`, alt }))
