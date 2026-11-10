// SISTERLESS – Termine und Galerie aus Supabase laden
// Die beiden Werte stehen in Supabase unter Project Settings → API (URL + anon public key).
// Der anon key ist öffentlich und darf hier stehen.
const SUPABASE_URL = "https://pxcizcnenthnoggtoaqg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y2l6Y25lbnRobm9nZ3RvYXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTU1NTUsImV4cCI6MjEwNjU5MTU1NX0.Sp8Hp-E3Q0LGaxWOz8O2dM2hltzzmUBFqRRVMsRd0-Q";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function heuteWien() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna" }).format(new Date());
}

function datumLang(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function sichereUrl(u) {
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : null; } catch { return null; }
}

async function ladeGigs(el) {
  const { data, error } = await sb.from("sl_gigs").select("*").gte("date", heuteWien()).order("date");
  if (error) { el.innerHTML = '<p class="text-gray-500 text-center">Termine konnten nicht geladen werden.</p>'; return; }
  if (!data.length) { el.innerHTML = '<p class="text-gray-500 text-center uppercase tracking-widest">Neue Termine folgen bald.</p>'; return; }
  el.innerHTML = data.map((g) => {
    const ticket = sichereUrl(g.ticket_url);
    const ort = [g.title, g.city].filter(Boolean).map(esc).join(" - ");
    const zeit = g.time ? " · " + esc(g.time) : "";
    return `
      <div class="bg-white/5 p-8 flex flex-col md:flex-row justify-between items-center rounded-lg ${ticket ? "hover:border-rose-600" : "opacity-80 hover:border-white/20"} border border-transparent transition">
        <div>
          <p class="text-rose-500 font-bold uppercase tracking-widest">${datumLang(g.date)}${zeit}</p>
          <p class="text-4xl font-bold uppercase">${ort}</p>
          <p class="text-gray-500 text-sm uppercase">${esc(g.info || "Sisterless Live")}</p>
        </div>
        ${ticket
          ? `<a href="${esc(ticket)}" target="_blank" rel="noopener" class="btn-primary px-10 py-3 text-white mt-4 md:mt-0">Tickets</a>`
          : `<span class="text-gray-500 uppercase font-bold tracking-widest mt-4 md:mt-0">Live</span>`}
      </div>`;
  }).join("");
}

async function ladeGalerie(el) {
  const { data, error } = await sb.from("sl_gallery").select("*").order("sort").order("created_at", { ascending: false });
  if (error) { el.innerHTML = '<p class="text-gray-500 col-span-full text-center">Bilder konnten nicht geladen werden.</p>'; return; }
  el.innerHTML = data.map((b) => `
    <div class="gallery-item aspect-[3/4] overflow-hidden rounded-lg bg-zinc-900">
      <img src="${esc(b.url)}" alt="${esc(b.caption || "Sisterless live")}" loading="lazy" onclick="openLB(this.src)" class="gallery-img w-full h-full object-cover">
    </div>`).join("");
}
