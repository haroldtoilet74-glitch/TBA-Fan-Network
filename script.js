const teams = [
  "Celtics",
  "Knicks",
  "Nets",
  "76ers",
  "Raptors",
  "Bulls",
  "Cavaliers",
  "Pistons",
  "Pacers",
  "Bucks",
  "Heat",
  "Magic",
  "Hawks",
  "Hornets",
  "Wizards",
  "Lakers",
  "Clippers",
  "Suns",
  "Warriors",
  "Kings",
  "Trail Blazers",
  "Timberwolves",
  "Thunder",
  "Nuggets",
  "Rockets",
  "Spurs",
  "Grizzlies",
  "Pelicans",
  "Mavericks",
  "Jazz",
];

// real NBA divisions and conferences map
const teamMeta = {
  Celtics: { conference: "Eastern", division: "Atlantic" },
  Nets: { conference: "Eastern", division: "Atlantic" },
  Knicks: { conference: "Eastern", division: "Atlantic" },
  "76ers": { conference: "Eastern", division: "Atlantic" },
  Raptors: { conference: "Eastern", division: "Atlantic" },
  Bulls: { conference: "Eastern", division: "Central" },
  Cavaliers: { conference: "Eastern", division: "Central" },
  Pistons: { conference: "Eastern", division: "Central" },
  Pacers: { conference: "Eastern", division: "Central" },
  Bucks: { conference: "Eastern", division: "Central" },
  Hawks: { conference: "Eastern", division: "Southeast" },
  Hornets: { conference: "Eastern", division: "Southeast" },
  Heat: { conference: "Eastern", division: "Southeast" },
  Magic: { conference: "Eastern", division: "Southeast" },
  Wizards: { conference: "Eastern", division: "Southeast" },
  Lakers: { conference: "Western", division: "Pacific" },
  Clippers: { conference: "Western", division: "Pacific" },
  Suns: { conference: "Western", division: "Pacific" },
  Warriors: { conference: "Western", division: "Pacific" },
  Kings: { conference: "Western", division: "Pacific" },
  "Trail Blazers": { conference: "Western", division: "Northwest" },
  Timberwolves: { conference: "Western", division: "Northwest" },
  Thunder: { conference: "Western", division: "Northwest" },
  Nuggets: { conference: "Western", division: "Northwest" },
  Jazz: { conference: "Western", division: "Northwest" },
  Rockets: { conference: "Western", division: "Southwest" },
  Spurs: { conference: "Western", division: "Southwest" },
  Grizzlies: { conference: "Western", division: "Southwest" },
  Pelicans: { conference: "Western", division: "Southwest" },
  Mavericks: { conference: "Western", division: "Southwest" },
};

const teamInfo = teams.reduce((map, team) => {
  const meta = teamMeta[team] || { conference: "Unknown", division: "Unknown" };
  map[team] = {
    coach: "TBD",
    assistant: "TBD",
    record: "0-0",
    division: meta.division,
    conference: meta.conference,
  };
  return map;
}, {});

// persistence keys
const STORAGE_KEYS = {
  coaches: "tba_coaches",
  coachProfiles: "tba_coachProfiles",
  standings: "tba_standings",
  powerRankings: "tba_powerRankings",
  teamInfo: "tba_teamInfo",
  championships: "tba_championships",
  coachArchive: "tba_coachArchive",
};
const API_STATE_URL = "/api/state";
const API_STATE_URL_WITH_CACHE_BUSTER = `${API_STATE_URL}?t=${Date.now()}`;

let lastOpenedFromTeamCard = false;
let isCommissionerUnlocked = false;

function applyState(payload) {
  if (!payload || typeof payload !== "object") return;

  if (Array.isArray(payload.coaches)) {
    coaches.splice(0, coaches.length, ...payload.coaches);
  }
  if (Array.isArray(payload.coachProfiles)) {
    coachProfiles.splice(0, coachProfiles.length, ...payload.coachProfiles);
  }
  if (Array.isArray(payload.standings)) {
    standings.splice(0, standings.length, ...payload.standings);
  }
  if (Array.isArray(payload.powerRankings)) {
    powerRankings.splice(0, powerRankings.length, ...payload.powerRankings);
  }
  if (payload.teamInfo && typeof payload.teamInfo === "object") {
    Object.keys(payload.teamInfo).forEach((k) => {
      if (teamInfo[k]) {
        teamInfo[k] = payload.teamInfo[k];
      }
    });
  }
  if (Array.isArray(payload.championships)) {
    championships.splice(0, championships.length, ...payload.championships);
  }
  if (Array.isArray(payload.coachArchive)) {
    coachArchive.splice(0, coachArchive.length, ...payload.coachArchive);
  }
}

function getPersistedState() {
  return {
    coaches: coaches.slice(),
    coachProfiles: coachProfiles.slice(),
    standings: standings.slice(),
    powerRankings: powerRankings.slice(),
    teamInfo: Object.fromEntries(Object.entries(teamInfo)),
    championships: championships.slice(),
    coachArchive: coachArchive.slice(),
  };
}

function saveToLocalFallback() {
  try {
    localStorage.setItem(STORAGE_KEYS.coaches, JSON.stringify(coaches));
    localStorage.setItem(STORAGE_KEYS.coachProfiles, JSON.stringify(coachProfiles));
    localStorage.setItem(STORAGE_KEYS.standings, JSON.stringify(standings));
    localStorage.setItem(STORAGE_KEYS.powerRankings, JSON.stringify(powerRankings));
    localStorage.setItem(STORAGE_KEYS.teamInfo, JSON.stringify(teamInfo));
    localStorage.setItem(STORAGE_KEYS.championships, JSON.stringify(championships));
    localStorage.setItem(STORAGE_KEYS.coachArchive, JSON.stringify(coachArchive));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

function refreshViews() {
  renderTeamGrid();
  renderPowerRankings();
  renderStandings();
  renderRoster();
  renderArchive();
  renderChampionships();
}

async function saveState() {
  const payload = getPersistedState();
  try {
    const response = await fetch(API_STATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const serverState = await response.json();
    applyState(serverState);
    refreshViews();
    return true;
  } catch (e) {
    console.error("Failed to sync state to server:", e);
    saveToLocalFallback();
    return false;
  }
}

function getStateUrl() {
  return `${API_STATE_URL}?t=${Date.now()}`;
}

async function loadState() {
  try {
    const response = await fetch(getStateUrl(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const payload = await response.json();
    applyState(payload);
  } catch (e) {
    console.error("Failed to load shared state:", e);
    try {
      const sCoaches = localStorage.getItem(STORAGE_KEYS.coaches);
      const sProfiles = localStorage.getItem(STORAGE_KEYS.coachProfiles);
      const sStandings = localStorage.getItem(STORAGE_KEYS.standings);
      const sPower = localStorage.getItem(STORAGE_KEYS.powerRankings);
      const sTeamInfo = localStorage.getItem(STORAGE_KEYS.teamInfo);
      if (sCoaches) {
        const parsed = JSON.parse(sCoaches);
        if (Array.isArray(parsed)) {
          coaches.splice(0, coaches.length, ...parsed);
        }
      }
      if (sProfiles) {
        const parsed = JSON.parse(sProfiles);
        if (Array.isArray(parsed)) {
          coachProfiles.splice(0, coachProfiles.length, ...parsed);
        }
      }
      if (sStandings) {
        const parsed = JSON.parse(sStandings);
        if (Array.isArray(parsed)) {
          standings.splice(0, standings.length, ...parsed);
        }
      }
      if (sPower) {
        const parsed = JSON.parse(sPower);
        if (Array.isArray(parsed)) {
          powerRankings.splice(0, powerRankings.length, ...parsed);
        }
      }
      if (sTeamInfo) {
        const parsed = JSON.parse(sTeamInfo);
        if (parsed && typeof parsed === "object") {
          Object.keys(parsed).forEach((k) => {
            if (teamInfo[k]) {
              teamInfo[k] = parsed[k];
            }
          });
        }
      }
      const sChamps = localStorage.getItem(STORAGE_KEYS.championships);
      if (sChamps) {
        const parsed = JSON.parse(sChamps);
        if (Array.isArray(parsed)) {
          championships.splice(0, championships.length, ...parsed);
        }
      }
      const sArchive = localStorage.getItem(STORAGE_KEYS.coachArchive);
      if (sArchive) {
        const parsed = JSON.parse(sArchive);
        if (Array.isArray(parsed)) {
          coachArchive.splice(0, coachArchive.length, ...parsed);
        }
      }
    } catch (loadError) {
      console.error("Failed to load local fallback state:", loadError);
    }
  }
}

const standings = [];
const powerRankings = [];
const coaches = [];
const coachProfiles = [];
const coachArchive = [];
// championship history managed programmatically
const championships = [
  {
    id: "s1-finals",
    title: "S1 Finals",
    desc: "San Antonio Spurs defeat Milwaukee Bucks, 119-114",
  },
];
const commissionerPasscode = "KriS10!!";
const powerRankingsPasscode = "KriS10!!";

const mainTabs = document.querySelectorAll(".main-tabs .tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const miniTabs = document.querySelectorAll(".mini-tabs .mini-tab");
const miniPanels = document.querySelectorAll(".mini-panel");
const teamGrid = document.getElementById("team-grid");
const powerPassForm = document.getElementById("power-rankings-access-form");
const powerPassInput = document.getElementById("power-rankings-passcode");
const powerAccessMessage = document.getElementById("power-rankings-access-message");
const powerEditor = document.getElementById("power-rankings-editor");
const powerTeamSelect = document.getElementById("power-rankings-team-name");
const powerForm = document.getElementById("power-rankings-edit-form");
const powerRankingsContent = document.getElementById("power-rankings-content");
const standingsTeamSelect = document.getElementById("standings-team-name");
const standingsForm = document.getElementById("standings-edit-form");
const standingsContent = document.getElementById("standings-content");
const standingsPassForm = document.getElementById("standings-access-form");
const standingsPassInput = document.getElementById("standings-passcode");
const standingsAccessMessage = document.getElementById("standings-access-message");
const commissionerForm = document.getElementById("commissioner-form");
const commissionerPassInput = document.getElementById("commissioner-passcode");
const accessMessage = document.getElementById("access-message");
const publishCoachesButton = document.getElementById("publish-coaches-button");
const publishCoachesMessage = document.getElementById("publish-coaches-message");
const publishStandingsButton = document.getElementById("publish-standings-button");
const publishStandingsMessage = document.getElementById("publish-standings-message");
const rosterEditor = document.getElementById("roster-editor");
const rosterForm = document.getElementById("roster-form");
const playerName = document.getElementById("player-name");
const coachRole = document.getElementById("coach-role");
const teamName = document.getElementById("team-name");
const rosterList = document.getElementById("roster-list");
const coachDeleteList = document.getElementById("coach-delete-list");
const coachProfileList = document.getElementById("coach-profile-list");
const coachProfileForm = document.getElementById("coach-profile-form");
const profileIdInput = document.getElementById("profile-id");
const profileName = document.getElementById("profile-name");
const profileTeam = document.getElementById("profile-team");
const profileRole = document.getElementById("profile-role");
const profileRecord = document.getElementById("profile-record");
const profileAccolades = document.getElementById("profile-accolades");
const profileLegacy = document.getElementById("profile-legacy");
const profileSeasons = document.getElementById("profile-seasons");
const editTeamSelect = document.getElementById("edit-team-name");
const editCoach = document.getElementById("edit-coach");
const editAssistant = document.getElementById("edit-assistant");
const editRecord = document.getElementById("edit-record");
const editDivision = document.getElementById("edit-division");
const editConference = document.getElementById("edit-conference");
const teamEditForm = document.getElementById("team-edit-form");
const coachArchiveForm = document.getElementById("coach-archive-form");
const archiveIdInput = document.getElementById("archive-id");
const archiveName = document.getElementById("archive-name");
const archiveRole = document.getElementById("archive-role");
const archiveTeam = document.getElementById("archive-team");
const archiveRecord = document.getElementById("archive-record");
const archiveAccolades = document.getElementById("archive-accolades");
const archiveLegacy = document.getElementById("archive-legacy");
const archiveSeasons = document.getElementById("archive-seasons");
const archiveList = document.getElementById("coaches-archive-list");

function renderTeamGrid() {
  teamGrid.innerHTML = "";
  teams.forEach((team) => {
    const card = document.createElement("article");
    card.className = "team-card";
    card.innerHTML = `
      <h3>${team}</h3>
      <p><strong>Coach:</strong> ${teamInfo[team].coach && teamInfo[team].coach !== "TBD" ? `<span class="coach-link" data-coach="${teamInfo[team].coach}">${teamInfo[team].coach}</span>` : teamInfo[team].coach}</p>
      <p><strong>Assistant:</strong> ${teamInfo[team].assistant && teamInfo[team].assistant !== "TBD" ? `<span class="coach-link" data-coach="${teamInfo[team].assistant}">${teamInfo[team].assistant}</span>` : teamInfo[team].assistant}</p>
      <p><strong>Record:</strong> ${teamInfo[team].record}</p>
      <p><strong>Division:</strong> ${teamInfo[team].division}</p>
    `;
    // clicking the card shows team info popup (ignore clicks on coach links)
    card.addEventListener("click", (e) => {
      if (e.target.classList && e.target.classList.contains("coach-link")) return;
      const teamName = team;
      const coach = teamInfo[teamName].coach || "TBD";
      const assistant = teamInfo[teamName].assistant || "TBD";
      const record = teamInfo[teamName].record || "0-0";
      const divisionRank = getDivisionRank(teamName);
      const conferenceRank = getConferenceRank(teamName);
      const power = (powerRankings.find((p) => p.team === teamName) || {}).rank || "Unranked";
      const html = `
        <p><strong>Coach:</strong> ${coach}</p>
        <p><strong>Assistant:</strong> ${assistant}</p>
        <p><strong>Record:</strong> ${record}</p>
        <p><strong>Division Rank:</strong> ${divisionRank}</p>
        <p><strong>Conference Rank:</strong> ${conferenceRank}</p>
        <p><strong>Power Rank:</strong> ${power}</p>
      `;
      // mark modal opened from a team card so coach-link inside modal knows context
      lastOpenedFromTeamCard = true;
      showModal(teamName, html);
    });
    teamGrid.appendChild(card);
  });
}

function populateTeamSelects() {
  [powerTeamSelect, standingsTeamSelect, teamName, profileTeam, editTeamSelect, archiveTeam].forEach((select) => {
    if (!select) return;
    const existing = Array.from(select.options).map((option) => option.value);
    teams.forEach((team) => {
      if (!existing.includes(team)) {
        const option = document.createElement("option");
        option.value = team;
        option.textContent = team;
        select.appendChild(option);
      }
    });
    if (!existing.includes("Inactive") && select === archiveTeam) {
      const inactiveOption = document.createElement("option");
      inactiveOption.value = "Inactive";
      inactiveOption.textContent = "Inactive";
      select.appendChild(inactiveOption);
    }
  });
}

function renderPowerRankings() {
  powerRankings.sort((a, b) => a.rank - b.rank);
  powerRankingsContent.innerHTML = "";
  if (powerRankings.length === 0) {
    powerRankingsContent.innerHTML = "<li>No power rankings added yet.</li>";
    return;
  }
  powerRankings.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.team} — Rank ${entry.rank}`;
    powerRankingsContent.appendChild(item);
  });
}

function renderStandings() {
  standingsContent.innerHTML = "";
  // If no standings saved, show the empty conference/division structure
  if (standings.length === 0) {
    const conferences = {
      Eastern: ["Atlantic", "Central", "Southeast"],
      Western: ["Pacific", "Northwest", "Southwest"],
    };
    Object.keys(conferences).forEach((conf) => {
      const confEl = document.createElement("div");
      confEl.innerHTML = `<h3>${conf}</h3>`;
      conferences[conf].forEach((div) => {
        const divEl = document.createElement("div");
        divEl.className = "division-block";
        divEl.innerHTML = `<h4>${div}</h4><div class="division-empty">No teams added yet.</div>`;
        confEl.appendChild(divEl);
      });
      standingsContent.appendChild(confEl);
    });
    return;
  }

  const table = document.createElement("div");
  standings.forEach((entry) => {
    const entryCard = document.createElement("div");
    entryCard.innerHTML = `
      <strong>${entry.team}</strong>
      <p>${entry.conference} / ${entry.division}</p>
      <p>Record: ${entry.wins}-${entry.losses}</p>
      <p>Playoff: ${entry.status}${entry.seed ? ` — Seed ${entry.seed}` : ""}</p>
    `;
    table.appendChild(entryCard);
  });
  standingsContent.appendChild(table);
}

function renderArchive() {
  if (!archiveList) return;
  archiveList.innerHTML = "";
  if (coachArchive.length === 0) {
    archiveList.innerHTML = "<div>No archived coaches yet.</div>";
    return;
  }

  coachArchive.forEach((entry) => {
    const card = document.createElement("div");
    card.innerHTML = `
      <strong><span class="coach-link" data-coach="${entry.name}">${entry.name}</span></strong>
      <p>${entry.role} — ${entry.team}</p>
      <p>Record: ${entry.record || "N/A"}</p>
      <p>Seasons: ${entry.seasons || "N/A"}</p>
      <p>Legacy: ${entry.legacy} star(s)</p>
    `;
    archiveList.appendChild(card);
  });
}

function renderRoster() {
  rosterList.innerHTML = "";
  coachDeleteList.innerHTML = "";
  coachProfileList.innerHTML = "";

  if (coaches.length === 0) {
    rosterList.innerHTML = "<div>No coaches added yet.</div>";
  } else {
    coaches.forEach((coach) => {
      const coachRow = document.createElement("div");
        coachRow.innerHTML = `
          <strong><span class="coach-link" data-coach="${coach.name}">${coach.name}</span></strong>
          <p>${coach.role} — ${coach.team}</p>
        `;
      rosterList.appendChild(coachRow);

      const deleteRow = document.createElement("div");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = `Remove ${coach.name}`;
      deleteButton.addEventListener("click", () => {
        const index = coaches.findIndex((item) => item.id === coach.id);
        if (index > -1) {
          coaches.splice(index, 1);
          renderRoster();
          saveState();
        }
      });
      deleteRow.appendChild(deleteButton);
      coachDeleteList.appendChild(deleteRow);
    });
  }

  if (coachProfiles.length === 0) {
    coachProfileList.innerHTML = "<div>No coach profiles saved yet.</div>";
  } else {
    coachProfiles.forEach((profile) => {
      const profileCard = document.createElement("div");
      profileCard.innerHTML = `
        <strong>${profile.name}</strong>
        <p>${profile.role} — ${profile.team}</p>
        <p>Record: ${profile.record || "N/A"}</p>
        <p>Seasons: ${profile.seasons || "N/A"}</p>
        <p>Legacy: ${profile.legacy} star(s)</p>
        <p>Accolades: ${profile.accolades || "None"}</p>
      `;
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit profile";
      editBtn.addEventListener("click", () => {
        profileIdInput.value = profile.id;
        profileName.value = profile.name;
        profileTeam.value = profile.team;
        profileRole.value = profile.role;
        profileRecord.value = profile.record;
        profileAccolades.value = profile.accolades;
        profileLegacy.value = profile.legacy;
        profileSeasons.value = profile.seasons || "";
      });
      profileCard.appendChild(editBtn);
      coachProfileList.appendChild(profileCard);
    });
  }
  // populate coach datalist for profile input
  populateCoachesDatalist();
}

function populateCoachesDatalist() {
  const datalist = document.getElementById("coaches-list");
  if (!datalist) return;
  datalist.innerHTML = "";
  coaches.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.name;
    datalist.appendChild(option);
  });
}

function renderChampionships() {
  const list = document.getElementById("championship-history-list");
  if (!list) return;
  list.innerHTML = "";
  if (championships.length === 0) {
    list.innerHTML = "<li>No championship history yet.</li>";
    return;
  }
  championships.forEach((c) => {
    const li = document.createElement("li");
    li.className = "champ-link";
    if (c.id) li.dataset.id = c.id;
    if (c.title) li.dataset.title = c.title;
    if (c.desc) li.dataset.desc = c.desc;
    li.textContent = `${c.title}: ${c.desc}`;
    list.appendChild(li);
  });
}

function renderLegacyStars(count) {
  const maxStars = 5;
  const filled = Number(count) || 0;
  const stars = [];
  for (let i = 1; i <= maxStars; i += 1) {
    stars.push(i <= filled ? "★" : "☆");
  }
  return stars.join("");
}

function addChampionship(entry) {
  const e = {
    id: entry.id || `champ-${Date.now()}`,
    title: entry.title || "Championship",
    desc: entry.desc || "Details",
  };
  championships.push(e);
  saveState();
  renderChampionships();
  return e;
}
// expose helper for programmatic additions
window.addChampionship = addChampionship;

// compute ranks for popup display
function getDivisionRank(team) {
  const entry = standings.find((s) => s.team === team);
  if (!entry || !entry.division) return "N/A";
  const same = standings.filter((s) => s.division === entry.division);
  if (same.length === 0) return "N/A";
  same.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  const idx = same.findIndex((s) => s.team === team);
  return idx === -1 ? "N/A" : idx + 1;
}

function getConferenceRank(team) {
  const entry = standings.find((s) => s.team === team);
  if (!entry || !entry.conference) return "N/A";
  const same = standings.filter((s) => s.conference === entry.conference);
  if (same.length === 0) return "N/A";
  same.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  const idx = same.findIndex((s) => s.team === team);
  return idx === -1 ? "N/A" : idx + 1;
}

// modal helpers
function showModal(title, html) {
  const modal = document.getElementById("modal");
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  if (!modal || !titleEl || !bodyEl) {
    // fallback to alert
    alert(title + "\n" + (html || ""));
    return;
  }
  titleEl.textContent = title || "";
  bodyEl.innerHTML = html || "";
  modal.classList.remove("hidden");
  // close handlers
  const closeBtn = modal.querySelector(".modal-close");
  const backdrop = modal.querySelector(".modal-backdrop");
  const hide = () => modal.classList.add("hidden");
  if (closeBtn) closeBtn.onclick = hide;
  if (backdrop) backdrop.onclick = hide;
}

function hideModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.add("hidden");
  // reset flag when modal closed
  lastOpenedFromTeamCard = false;
}

// global handler for coach link clicks
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.classList && t.classList.contains("coach-link")) {
    const name = t.dataset.coach;
    if (!name || name === "TBD") {
      showModal("No coach assigned", "<p>No coach assigned yet.</p>");
      return;
    }
    const profile = coachProfiles.find((p) => p.name === name);
    const archivedProfile = coachArchive.find((p) => p.name === name);
    const inTeamCard = Boolean(t.closest && t.closest('.team-card'));
    const inArchiveList = Boolean(t.closest && t.closest('.archive-list'));
    if (inTeamCard || inArchiveList) {
      // show read-only profile modal when clicked from team hub
      const selectedProfile = profile || archivedProfile;
      if (!selectedProfile) {
        showModal(name, "<p>No profile found. Add profile in Commissioner Dashboard.</p>");
        return;
      }
      const legacyStars = renderLegacyStars(selectedProfile.legacy);
      const profHtml = `
        <p><strong>Team:</strong> ${selectedProfile.team}</p>
        <p><strong>Role:</strong> ${selectedProfile.role}</p>
        <p><strong>Seasons:</strong> ${selectedProfile.seasons || "N/A"}</p>
        <p><strong>All-Time Record:</strong> ${selectedProfile.record || "N/A"}</p>
        <p><strong>Legacy:</strong> <span class="legacy-stars">${legacyStars}</span></p>
        <p><strong>Accolades:</strong><br/>${(selectedProfile.accolades || "None").replace(/\n/g, '<br/>')}</p>
      `;
      showModal(selectedProfile.name, profHtml);
      return;
    }
    // otherwise (e.g., roster) open commissioner dashboard for editing
    // open commissioner dashboard and show profile form for editing/creating
    showTab("commissioner-dashboard");
    // ensure roster editor visible
    rosterEditor.classList.remove("hidden"); 
    // find coach record in coaches list
    const coach = coaches.find((c) => c.name === name);
    const existingProfile = profile || null;
    const existingArchive = archivedProfile || null;
    profileIdInput.value = existingProfile ? existingProfile.id : "";
    profileName.value = name;
    profileTeam.value = coach ? coach.team : "";
    profileRole.value = coach ? coach.role : "Head Coach";
    profileRecord.value = existingProfile ? existingProfile.record : "";
    profileAccolades.value = existingProfile ? existingProfile.accolades : "";
    profileLegacy.value = existingProfile ? existingProfile.legacy : "0";
    profileSeasons.value = existingProfile ? existingProfile.seasons : "";
    archiveIdInput.value = existingArchive ? existingArchive.id : "";
    archiveName.value = name;
    archiveTeam.value = existingArchive ? existingArchive.team : "Inactive";
    archiveRole.value = existingArchive ? existingArchive.role : (coach ? coach.role : "Head Coach");
    archiveRecord.value = existingArchive ? existingArchive.record : "";
    archiveAccolades.value = existingArchive ? existingArchive.accolades : "";
    archiveLegacy.value = existingArchive ? existingArchive.legacy : "0";
    archiveSeasons.value = existingArchive ? existingArchive.seasons : "";
    // focus on accolades so user can type
    profileAccolades.focus();
    return;
  }

  // championship history click handler
  if (t.classList && t.classList.contains("champ-link")) {
    const title = t.dataset.title || "Championship";
    const desc = t.dataset.desc || t.textContent || "Details";
    showModal(title, `<p>${desc}</p>`);
  }
});

function showTab(target) {
  tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
  mainTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.target === target));
}

function showMiniTab(target) {
  miniPanels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
  miniTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.target === target));
}

mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => showTab(tab.dataset.target));
});

miniTabs.forEach((tab) => {
  tab.addEventListener("click", () => showMiniTab(tab.dataset.target));
});

if (powerPassForm) {
  powerPassForm.addEventListener("submit", (event) => {
    event.preventDefault();
    // per-tab pass now replaced by Commissioner Dashboard unlock
    if (isCommissionerUnlocked) {
      if (powerEditor) powerEditor.classList.remove("hidden");
      if (powerAccessMessage) {
        powerAccessMessage.textContent = "Editing unlocked (Commissioner).";
        powerAccessMessage.style.color = "#9ee7a4";
      }
    } else if (powerAccessMessage) {
      powerAccessMessage.textContent = "Use Commissioner Dashboard to unlock editing.";
      powerAccessMessage.style.color = "#ffa9b0";
    }
    if (powerPassInput) powerPassInput.value = "";
  });
}

// standings unlock handler
if (standingsPassForm) {
  standingsPassForm.addEventListener("submit", (event) => {
    event.preventDefault();
    // per-tab pass now replaced by Commissioner Dashboard unlock
    if (isCommissionerUnlocked) {
      document.getElementById("standings-editor").classList.remove("hidden");
      standingsAccessMessage.textContent = "Editing unlocked (Commissioner).";
      standingsAccessMessage.style.color = "#9ee7a4";
    } else {
      standingsAccessMessage.textContent = "Use Commissioner Dashboard to unlock editing.";
      standingsAccessMessage.style.color = "#ffa9b0";
      document.getElementById("standings-editor").classList.add("hidden");
    }
    standingsPassInput.value = "";
  });
}

async function initializeApp() {
  await loadState();
  mergeDomChampionships();
  refreshViews();
  populateTeamSelects();
  setInterval(async () => {
    try {
      const response = await fetch(getStateUrl(), { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      applyState(payload);
      refreshViews();
    } catch (error) {
      console.error("Failed to refresh shared state:", error);
    }
  }, 1500);
}

// Merge any static <li> items in the Championship History DOM into the championships array
function mergeDomChampionships() {
  const list = document.getElementById("championship-history-list");
  if (!list) return;
  const items = Array.from(list.querySelectorAll("li"));
  items.forEach((li, idx) => {
    const title = li.dataset.title || (li.textContent.includes(":") ? li.textContent.split(":")[0].trim() : li.textContent.trim());
    const desc = li.dataset.desc || (li.textContent.includes(":") ? li.textContent.split(":").slice(1).join(":").trim() : li.textContent.trim());
    const exists = championships.some((c) => c.title === title && c.desc === desc);
    if (!exists) {
      championships.push({ id: li.dataset.id || `dom-${Date.now()}-${idx}`, title, desc });
    }
  });
}

mergeDomChampionships();

powerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const team = powerTeamSelect.value;
  const rank = Number(document.getElementById("power-rank-edit").value);
  const existing = powerRankings.find((entry) => entry.team === team);

  if (existing) {
    existing.rank = rank;
  } else {
    powerRankings.push({ team, rank });
  }
  renderPowerRankings();
  powerForm.reset();
  saveState();
});

standingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    team: standingsTeamSelect.value,
    conference: document.getElementById("standings-conference").value,
    division: document.getElementById("standings-division").value,
    wins: Number(document.getElementById("standings-wins").value),
    losses: Number(document.getElementById("standings-losses").value),
    status: document.getElementById("playoff-status").value,
    seed: document.getElementById("playoff-seed").value,
  };
  const index = standings.findIndex((item) => item.team === entry.team);
  if (index > -1) standings[index] = entry;
  else standings.push(entry);
  renderStandings();
  standingsForm.reset();
  saveState();
});

function setPublishMessage(element, message, isSuccess) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isSuccess ? "#9ee7a4" : "#ffa9b0";
}

if (publishCoachesButton) {
  publishCoachesButton.addEventListener("click", async () => {
    if (!isCommissionerUnlocked) {
      setPublishMessage(publishCoachesMessage, "Unlock the commissioner dashboard first.", false);
      return;
    }

    const published = await saveState();
    setPublishMessage(publishCoachesMessage, published ? "Coaches published to everyone." : "Could not publish coaches right now.", published);
  });
}

if (publishStandingsButton) {
  publishStandingsButton.addEventListener("click", async () => {
    if (!isCommissionerUnlocked) {
      setPublishMessage(publishStandingsMessage, "Unlock the commissioner dashboard first.", false);
      return;
    }

    const published = await saveState();
    setPublishMessage(publishStandingsMessage, published ? "Standings published to everyone." : "Could not publish standings right now.", published);
  });
}

commissionerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (commissionerPassInput.value.trim() === commissionerPasscode) {
    // unlock all editors site-wide
    isCommissionerUnlocked = true;
    rosterEditor.classList.remove("hidden");
    powerEditor.classList.remove("hidden");
    const standingsEditorEl = document.getElementById("standings-editor");
    if (standingsEditorEl) standingsEditorEl.classList.remove("hidden");
    // hide the per-tab pass forms
    if (powerPassForm) powerPassForm.classList.add("hidden");
    if (standingsPassForm) standingsPassForm.classList.add("hidden");
    accessMessage.textContent = "Commissioner unlocked: editing enabled for all editors.";
    accessMessage.style.color = "#9ee7a4";
  } else {
    accessMessage.textContent = "Access denied.";
    accessMessage.style.color = "#ffa9b0";
    // ensure editors remain hidden
    rosterEditor.classList.add("hidden");
    powerEditor.classList.add("hidden");
    const standingsEditorEl2 = document.getElementById("standings-editor");
    if (standingsEditorEl2) standingsEditorEl2.classList.add("hidden");
  }
  commissionerPassInput.value = "";
});

rosterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = Date.now().toString();
  coaches.push({
    id,
    name: playerName.value.trim(),
    role: coachRole.value,
    team: teamName.value,
  });
  // auto-place coach on team card
  const team = teamName.value;
  if (coachRole.value === "Head Coach") {
    teamInfo[team].coach = playerName.value.trim();
  } else if (coachRole.value === "Assistant Coach") {
    teamInfo[team].assistant = playerName.value.trim();
  }
  renderRoster();
  renderTeamGrid();
  rosterForm.reset();
  saveState();
});

coachArchiveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = archiveIdInput.value || Date.now().toString();
  const entry = {
    id,
    name: archiveName.value.trim(),
    team: archiveTeam.value,
    role: archiveRole.value,
    record: archiveRecord.value.trim(),
    accolades: archiveAccolades.value.trim(),
    legacy: archiveLegacy.value,
    seasons: archiveSeasons.value,
  };

  const index = coachArchive.findIndex((item) => item.id === id);
  if (index > -1) {
    coachArchive[index] = entry;
  } else {
    coachArchive.push(entry);
  }
  coachArchiveForm.reset();
  archiveIdInput.value = "";
  renderArchive();
  saveState();
});

coachProfileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = profileIdInput.value || Date.now().toString();
  const profile = {
    id,
    name: profileName.value.trim(),
    team: profileTeam.value,
    role: profileRole.value,
    record: profileRecord.value.trim(),
    accolades: profileAccolades.value.trim(),
    legacy: profileLegacy.value,
    seasons: profileSeasons.value,
  };

  const index = coachProfiles.findIndex((item) => item.id === id);
  if (index > -1) {
    coachProfiles[index] = profile;
  } else {
    coachProfiles.push(profile);
  }
  coachProfileForm.reset();
  profileIdInput.value = "";
  // ensure team card shows this coach if applicable
  if (profile.team) {
    if (profile.role === "Head Coach") {
      teamInfo[profile.team].coach = profile.name;
    } else if (profile.role === "Assistant Coach") {
      teamInfo[profile.team].assistant = profile.name;
    }
  }
  renderRoster();
  renderTeamGrid();
  saveState();
});

teamEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const team = editTeamSelect.value;
  teamInfo[team].coach = editCoach.value || teamInfo[team].coach;
  teamInfo[team].assistant = editAssistant.value || teamInfo[team].assistant;
  teamInfo[team].record = editRecord.value || teamInfo[team].record;
  teamInfo[team].division = editDivision.value || teamInfo[team].division;
  teamInfo[team].conference = editConference.value || teamInfo[team].conference;
  renderTeamGrid();
  teamEditForm.reset();
  saveState();
});

initializeApp();
