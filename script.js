const USERNAME = "mrreesee";

// Öne çıkanlar: istersen buraya repo adlarını ekle/çıkar
const FEATURED = new Set(["codeforge", "collab-ide"]);

const els = {
  year: document.getElementById("year"),
  projectsGrid: document.getElementById("projectsGrid"),
  projectSearch: document.getElementById("projectSearch"),
  projectFilter: document.getElementById("projectFilter"),
  repoCount: document.getElementById("repoCount"),
  followerCount: document.getElementById("followerCount"),
  lastUpdated: document.getElementById("lastUpdated"),
  themeBtn: document.getElementById("themeBtn"),
};

els.year.textContent = new Date().getFullYear();

// Theme
(function initTheme(){
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon();

  els.themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "" : "light";
    if (next) document.documentElement.setAttribute("data-theme", next);
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", next || "");
    updateThemeIcon();
  });

  function updateThemeIcon(){
    const cur = document.documentElement.getAttribute("data-theme");
    els.themeBtn.querySelector(".icon").textContent = cur === "light" ? "☀" : "☾";
  }
})();

// Reveal on scroll
(function reveal(){
  const items = [...document.querySelectorAll(".reveal")];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if (e.isIntersecting){
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });
  items.forEach(x => io.observe(x));
})();

// Typing effect
(function typing(){
  const el = document.querySelector(".typing");
  if (!el) return;
  const phrases = JSON.parse(el.getAttribute("data-typing") || "[]");
  if (!phrases.length) return;

  let i = 0, j = 0;
  let deleting = false;

  function tick(){
    const cur = phrases[i] || "";
    el.textContent = cur.slice(0, j);

    if (!deleting && j < cur.length) {
      j++;
      setTimeout(tick, 26);
      return;
    }
    if (!deleting && j === cur.length) {
      deleting = true;
      setTimeout(tick, 900);
      return;
    }
    if (deleting && j > 0) {
      j--;
      setTimeout(tick, 18);
      return;
    }
    deleting = false;
    i = (i + 1) % phrases.length;
    setTimeout(tick, 180);
  }
  tick();
})();

let allRepos = [];

async function fetchJSON(url){
  const r = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function formatDate(iso){
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { year:"numeric", month:"short", day:"2-digit" });
}

function guessCategory(repo){
  const name = (repo.name || "").toLowerCase();
  const lang = (repo.language || "").toLowerCase();
  const topics = (repo.topics || []).map(t => t.toLowerCase());

  if (FEATURED.has(name)) return "featured";
  if (lang.includes("c#") || lang.includes("csharp") || topics.includes("dotnet") || topics.includes("aspnet")) return "dotnet";
  if (lang.includes("typescript") || lang.includes("javascript") || topics.includes("web") || topics.includes("nextjs")) return "web";
  if (topics.includes("tool") || topics.includes("cli") || topics.includes("devtools")) return "tools";
  return "all";
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function projectCard(repo){
  const name = (repo.name || "").toLowerCase();
  const isFeatured = FEATURED.has(name);

  const el = document.createElement("article");
  el.className = "card projectCard";
  el.dataset.name = name;
  el.dataset.cat = guessCategory(repo);

  const desc = repo.description || "Açıklama eklenmemiş (repo About/Description doldurulabilir).";
  const topics = (repo.topics || []).slice(0, 4);
  const homepage = repo.homepage && repo.homepage.startsWith("http") ? repo.homepage : "";
  const stars = typeof repo.stargazers_count === "number" ? repo.stargazers_count : 0;

  el.innerHTML = `
    <h3 class="projectName">${escapeHtml(repo.name)}</h3>

    <div class="badges" style="margin-top:10px">
      ${isFeatured ? `<span class="badge">Öne Çıkan</span>` : ``}
      ${repo.language ? `<span class="badge">${escapeHtml(repo.language)}</span>` : ``}
      <span class="badge">★ ${stars}</span>
      <span class="badge">Güncellendi: ${formatDate(repo.updated_at)}</span>
    </div>

    <p class="projectDesc">${escapeHtml(desc)}</p>

    <div class="badges">
      ${topics.map(t => `<span class="badge">#${escapeHtml(t)}</span>`).join("")}
    </div>

    <div class="projectLinks">
      <a class="linkBtn" href="${repo.html_url}" target="_blank" rel="noreferrer">Repo</a>
      ${homepage ? `<a class="linkBtn" href="${homepage}" target="_blank" rel="noreferrer">Demo</a>` : ``}
    </div>
  `;
  return el;
}

function renderProjects(){
  els.projectsGrid.innerHTML = "";

  const q = (els.projectSearch.value || "").trim().toLowerCase();
  const f = els.projectFilter.value;

  const filtered = allRepos.filter(r => {
    const name = (r.name || "").toLowerCase();
    const desc = (r.description || "").toLowerCase();
    const lang = (r.language || "").toLowerCase();
    const topics = (r.topics || []).join(" ").toLowerCase();

    const inSearch = !q || (name.includes(q) || desc.includes(q) || lang.includes(q) || topics.includes(q));
    if (!inSearch) return false;

    if (f === "all") return true;
    if (f === "featured") return FEATURED.has(name);
    return guessCategory(r) === f;
  });

  if (!filtered.length){
    const empty = document.createElement("div");
    empty.className = "note";
    empty.innerHTML = `<span class="dot"></span><p>Eşleşen proje bulunamadı.</p>`;
    els.projectsGrid.appendChild(empty);
    return;
  }

  for (const repo of filtered){
    els.projectsGrid.appendChild(projectCard(repo));
  }
}

async function loadGitHub(){
  const profile = await fetchJSON(`https://api.github.com/users/${USERNAME}`);
  els.repoCount.textContent = profile.public_repos ?? "—";
  els.followerCount.textContent = profile.followers ?? "—";

  // Repos
  const repos = await fetchJSON(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`);
  allRepos = repos
    .filter(r => !r.fork)
    .sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));

  els.lastUpdated.textContent = allRepos[0]?.updated_at ? formatDate(allRepos[0].updated_at) : "—";
  renderProjects();
}

els.projectSearch?.addEventListener("input", renderProjects);
els.projectFilter?.addEventListener("change", renderProjects);

loadGitHub().catch(err => {
  console.error(err);
  els.projectsGrid.innerHTML = `
    <div class="note">
      <span class="dot"></span>
      <p>GitHub verileri çekilemedi. (Rate limit olabilir.) Biraz sonra tekrar deneyin.</p>
    </div>
  `;
});
