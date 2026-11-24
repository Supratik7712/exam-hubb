export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} – ExamHubb` }, { name: "description", content: description }, { property: "og:title", content: `${title} – ExamHubb` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
}