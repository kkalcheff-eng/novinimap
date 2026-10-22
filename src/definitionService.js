export async function loadGlossary() {
  const res = await fetch("/glossary.json");
  return res.json();
}