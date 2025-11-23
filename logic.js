/* =============================================================================
   DAILY PROGRESS TRACKER – COMPLETE GAMIFIED VERSION WITH TABS
   Features:
   • Two tabs: "Today" (clean) + "Progress & Rewards" (gamification)
   • Tasks, timed events, heatmap, upcoming events
   • XP, Levels, Streaks, Badges, Challenges
   • All data saved in localStorage
   • Notifications & cross-tab sync
   =========================================================================== */

let progressData = JSON.parse(localStorage.getItem("progressData")) || {};
let gamification = JSON.parse(localStorage.getItem("gamification")) || {
  level: 1,
  xp: 0,
  totalXP: 0,
  streak: 0,
  lastActiveDate: null,
  badges: [],
  activeChallenges: [],
  completedChallenges: [],
};

/* ----------------------------- CHALLENGE DEFINITIONS ---------------------------- */
const CHALLENGES = [
  {
    id: "complete5",
    name: "Task Novice",
    desc: "Complete 5 tasks in one day",
    goal: 5,
    xp: 80,
    badge: "novice",
  },
  {
    id: "complete10",
    name: "Task Master",
    desc: "Complete 10 tasks in one day",
    goal: 10,
    xp: 150,
    badge: "master",
  },
  {
    id: "early5",
    name: "Early Bird ×5",
    desc: "Complete a task before 09:00 five different days",
    goal: 5,
    xp: 120,
    badge: "early",
  },
  {
    id: "streak7",
    name: "Week on Fire",
    desc: "Maintain a 7-day streak",
    xp: 250,
    badge: "fire7",
  },
  {
    id: "perfectWeek",
    name: "Perfect Week",
    desc: "Complete ≥5 tasks every day for 7 consecutive days",
    xp: 400,
    badge: "perfect",
  },
];

const BADGES = {
  novice: "Task Novice",
  master: "Task Master",
  early: "Early Bird",
  fire7: "7-Day Streak",
  perfect: "Perfect Week",
};

/* -------------------------------- DOM ELEMENTS -------------------------------- */
const todoList = document.getElementById("todoList");
const newTodoInput = document.getElementById("newTodo");
const addBtn = document.getElementById("addBtn");
const completedCountEl = document.getElementById("completedCount");
const todayDateEl = document.querySelector(".today-date");
const taskTimeInput = document.getElementById("taskTime");
const taskDateInput = document.getElementById("taskDate");
const taskTypeSelect = document.getElementById("taskType");
const futureListEl = document.getElementById("futureList");

// Gamification tab elements
const currentLevelEl = document.getElementById("currentLevel");
const xpDisplayEl = document.getElementById("xpDisplay");
const xpProgressEl = document.getElementById("xpProgress");
const streakCountEl = document.getElementById("streakCount");
const badgesListEl = document.getElementById("badgesList");

// Tab system
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

/* ---------------------------------- HELPERS ----------------------------------- */
function isoToday(dateObj = new Date()) {
  return dateObj.toISOString().split("T")[0];
}

function saveData() {
  localStorage.setItem("progressData", JSON.stringify(progressData));
}

function saveGamification() {
  localStorage.setItem("gamification", JSON.stringify(gamification));
}

/* -------------------------------- XP & LEVELS --------------------------------- */
function addXP(amount) {
  if (amount <= 0) return;
  gamification.totalXP += amount;
  gamification.xp += amount;

  let nextLevelXP = (gamification.level + 1) * 100;
  while (gamification.xp >= nextLevelXP) {
    gamification.xp -= nextLevelXP;
    gamification.level++;
    notify(`Level Up! You are now Level ${gamification.level}!`);
    nextLevelXP = (gamification.level + 1) * 100;
  }
  saveGamification();
  renderGamificationUI();
}

/* ---------------------------------- STREAK ------------------------------------ */
function updateStreak() {
  const today = isoToday();
  if (gamification.lastActiveDate === today) return;

  const completedToday = (progressData[today]?.completed || 0) > 0;

  if (gamification.lastActiveDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasActiveYesterday =
      isoToday(yesterday) === gamification.lastActiveDate;

    if (wasActiveYesterday && completedToday) {
      gamification.streak++;
    } else if (completedToday) {
      gamification.streak = 1;
    } else {
      gamification.streak = 0;
    }
  } else if (completedToday) {
    gamification.streak = 1;
  }

  if (completedToday) gamification.lastActiveDate = today;
  saveGamification();
}

/* -------------------------------- CHALLENGES ---------------------------------- */
function checkDailyChallenges(todayKey) {
  const day = progressData[todayKey];
  if (!day) return;

  // Daily completion challenges
  CHALLENGES.filter((c) => c.id.startsWith("complete")).forEach((ch) => {
    if (day.completed >= ch.goal) awardChallenge(ch);
  });

  // Early Bird challenge
  const earlyChallenge = CHALLENGES.find((c) => c.id === "early5");
  if (earlyChallenge) {
    const hasEarlyTask = day.tasks.some(
      (t) => t.done && t.time && t.time < "09:00"
    );
    if (hasEarlyTask) {
      let active = gamification.activeChallenges.find(
        (a) => a.id === earlyChallenge.id
      );
      if (!active) {
        active = {
          id: earlyChallenge.id,
          progress: 0,
          goal: earlyChallenge.goal,
        };
        gamification.activeChallenges.push(active);
      }
      active.progress += 1;
      if (active.progress >= earlyChallenge.goal)
        awardChallenge(earlyChallenge);
      saveGamification();
    }
  }

  // Streak challenge
  if (gamification.streak === 7) {
    const streak7 = CHALLENGES.find((c) => c.id === "streak7");
    if (streak7) awardChallenge(streak7);
  }
}

function awardChallenge(challenge) {
  if (gamification.completedChallenges.includes(challenge.id)) return;

  gamification.completedChallenges.push(challenge.id);
  addXP(challenge.xp || 0);

  if (challenge.badge && !gamification.badges.includes(challenge.badge)) {
    gamification.badges.push(challenge.badge);
    notify(`Badge Unlocked: ${BADGES[challenge.badge]}`);
  }

  notify(`Challenge Complete: ${challenge.name} (+${challenge.xp || 0} XP)`);
  saveGamification();
}

/* ------------------------------- NOTIFICATIONS -------------------------------- */
function notify(message) {
  if (Notification.permission === "granted") {
    new Notification("Daily Tracker", { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => {
      if (p === "granted") new Notification("Daily Tracker", { body: message });
    });
  }
}

/* -------------------------------- TASK LOGIC ---------------------------------- */
function addTask() {
  const text = newTodoInput.value.trim();
  if (!text) return;

  const selectedDate = taskDateInput.value || isoToday();
  const selectedTime = taskTimeInput.value || null;
  const type = taskTypeSelect.value;

  if (!progressData[selectedDate])
    progressData[selectedDate] = { tasks: [], completed: 0 };

  progressData[selectedDate].tasks.push({
    text,
    done: false,
    time: selectedTime,
    date: selectedDate,
    isEvent: type === "event" && !!selectedTime,
  });

  saveData();
  clearInputs();
  renderToday();
}

function clearInputs() {
  newTodoInput.value = "";
  taskTimeInput.value = "";
  taskDateInput.value = "";
  taskTypeSelect.value = "task";
}

function toggleTask(index, done) {
  const today = isoToday();
  if (!progressData[today]) return;

  const wasDone = progressData[today].tasks[index].done;
  progressData[today].tasks[index].done = done;

  if (done && !wasDone) {
    addXP(10);
    checkDailyChallenges(today);
  }

  saveData();
  renderToday();
}

function deleteTask(index) {
  const today = isoToday();
  if (!progressData[today]) return;
  progressData[today].tasks.splice(index, 1);
  if (progressData[today].tasks.length === 0) delete progressData[today];
  saveData();
  renderToday();
}

/* -------------------------------- RENDERING ----------------------------------- */
function renderToday() {
  updateStreak();
  const today = isoToday();
  const dayData = progressData[today] || { tasks: [], completed: 0 };

  todayDateEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  todoList.innerHTML = "";
  let completed = 0;

  dayData.tasks.sort((a, b) => {
    if (a.isEvent && b.isEvent)
      return (a.time || "").localeCompare(b.time || "");
    return a.isEvent ? -1 : 1;
  });

  dayData.tasks.forEach((task, i) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (task.done ? " completed" : "");

    const checkbox = Object.assign(document.createElement("input"), {
      type: "checkbox",
      checked: task.done,
    });
    checkbox.addEventListener("change", () => toggleTask(i, checkbox.checked));

    const timeSpan = Object.assign(document.createElement("span"), {
      className: "todo-time",
      textContent: task.isEvent && task.time ? task.time : "",
    });
    const textSpan = Object.assign(document.createElement("span"), {
      className: "todo-text",
      textContent: task.text,
    });
    textSpan.addEventListener("click", () => toggleTask(i, !task.done));

    const delBtn = Object.assign(document.createElement("button"), {
      className: "delete-btn",
      innerHTML: "×",
    });
    delBtn.addEventListener("click", () => deleteTask(i));

    li.append(checkbox, timeSpan, textSpan, delBtn);
    todoList.appendChild(li);
    if (task.done) completed++;
  });

  dayData.completed = completed;
  progressData[today] = dayData;
  saveData();
  completedCountEl.textContent = completed;

  renderHeatmap();
  renderFutureTasks();
  renderGamificationUI(); // Always update (used in both tabs)
}

function renderGamificationUI() {
  if (!currentLevelEl) return; // Safety
  currentLevelEl.textContent = gamification.level;
  const nextXP = (gamification.level + 1) * 100;
  xpDisplayEl.textContent = `${gamification.xp} / ${nextXP} XP`;
  xpProgressEl.style.width = `${(gamification.xp / nextXP) * 100}%`;
  streakCountEl.textContent = gamification.streak;

  badgesListEl.innerHTML = "";
  gamification.badges.forEach((id) => {
    const span = document.createElement("span");
    span.textContent =
      "🏆⭐🔥🌅👑"[gamification.badges.indexOf(id) % 5] || "🏅";
    span.title = BADGES[id] || id;
    badgesListEl.appendChild(span);
  });
}

function renderGamificationTab() {
  renderGamificationUI();

  // Active challenges
  const activeEl = document.getElementById("activeChallenges");
  if (gamification.activeChallenges.length === 0) {
    activeEl.innerHTML =
      "<p style='color:#8b949e;text-align:center;margin:1rem 0;'>No active challenges</p>";
  } else {
    activeEl.innerHTML = gamification.activeChallenges
      .map((ch) => {
        const def = CHALLENGES.find((c) => c.id === ch.id) || {};
        return `<div style="margin:1rem 0;padding:1rem;background:#0d1117;border-radius:8px;">
                <strong>${def.name || ch.id}</strong><br>
                <small style="color:#8b949e;">${def.desc || ""}</small>
                <div style="margin-top:0.8rem;background:#30363d;border-radius:6px;overflow:hidden;">
                  <div style="background:#58a6ff;width:${
                    (ch.progress / ch.goal) * 100
                  }%;padding:6px 0;text-align:center;font-size:0.9rem;color:white;">
                    ${ch.progress} / ${ch.goal}
                  </div>
                </div>
              </div>`;
      })
      .join("");
  }

  // Stats
  const totalTasks = Object.values(progressData).reduce(
    (sum, d) => sum + (d.completed || 0),
    0
  );
  document.getElementById("totalTasks").textContent = totalTasks;
  document.getElementById("totalXP").textContent = gamification.totalXP;

  // Longest streak (simple 365-day scan)
  let best = 0,
    current = 0;
  const date = new Date();
  for (let i = 0; i < 365; i++) {
    const key = isoToday(date);
    if ((progressData[key]?.completed || 0) > 0) {
      current++;
      best = Math.max(best, current);
    } else if (current > 0) current = 0;
    date.setDate(date.getDate() - 1);
  }
  document.getElementById("bestStreak").textContent = best;
}

/* ----------------------------- HEATMAP & FUTURE TASKS ---------------------------- */
function getLevel(value) {
  if (value === 0) return 0;
  if (value <= 2) return 1;
  if (value <= 5) return 2;
  if (value <= 10) return 3;
  return 4;
}

function renderHeatmap() {
  const heatmap = document.getElementById("heatmap");
  const monthLabels = document.getElementById("monthLabels");
  heatmap.innerHTML = "";
  monthLabels.innerHTML = "";

  const today = new Date();
  const daysToShow = 30;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToShow + 1);

  const weeks = [];
  let currentWeek = [];
  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    currentWeek.push(date);
    if (date.getDay() === 6 || i === daysToShow - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  let lastMonth = -1;
  const monthPositions = [];

  weeks.forEach((week, weekIndex) => {
    const column = document.createElement("div");
    column.className = "heatmap-column";

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dateInWeek = week.find((d) => d.getDay() === dayOfWeek);
      if (dateInWeek) {
        const key = isoToday(dateInWeek);
        const amount = progressData[key]?.completed || 0;
        const level = getLevel(amount);
        const block = document.createElement("div");
        block.className = `block level-${level}`;
        block.title = `${key} — ${amount} completed`;
        column.appendChild(block);

        if (dateInWeek.getMonth() !== lastMonth) {
          lastMonth = dateInWeek.getMonth();
          monthPositions.push({
            weekIndex,
            name: dateInWeek.toLocaleDateString(undefined, { month: "short" }),
          });
        }
      } else {
        const block = document.createElement("div");
        block.className = "block level-0";
        block.style.opacity = "0.3";
        column.appendChild(block);
      }
    }
    heatmap.appendChild(column);
  });

  let labelIndex = 0;
  for (let i = 0; i < weeks.length; i++) {
    const label = document.createElement("div");
    label.className = "month-label";
    if (
      labelIndex < monthPositions.length &&
      monthPositions[labelIndex].weekIndex === i
    ) {
      label.textContent = monthPositions[labelIndex].name;
      labelIndex++;
    }
    monthLabels.appendChild(label);
  }
}

function renderFutureTasks() {
  futureListEl.innerHTML = "";
  const today = isoToday();
  const upcoming = Object.keys(progressData)
    .filter((date) => date > today)
    .sort()
    .flatMap((date) =>
      (progressData[date].tasks || []).map((t) => ({ ...t, date }))
    )
    .filter((t) => t.isEvent && t.time);

  upcoming.sort((a, b) =>
    a.date === b.date
      ? a.time.localeCompare(b.time)
      : a.date.localeCompare(b.date)
  );

  upcoming.forEach((task) => {
    const item = document.createElement("div");
    item.className = "future-task-item";

    const meta = Object.assign(document.createElement("div"), {
      className: "future-task-meta",
      textContent: `${task.date} ${task.time}`,
    });
    const text = Object.assign(document.createElement("div"), {
      className: "future-task-text",
      textContent: task.text,
    });
    const del = Object.assign(document.createElement("button"), {
      className: "delete-btn",
      innerHTML: "×",
    });
    del.addEventListener("click", () =>
      removeFutureTask(task.date, task.time, task.text)
    );

    item.append(meta, text, del);
    futureListEl.appendChild(item);
  });
}

function removeFutureTask(date, time, text) {
  if (!progressData[date]) return;
  const idx = progressData[date].tasks.findIndex(
    (t) => t.time === time && t.text === text
  );
  if (idx !== -1) {
    progressData[date].tasks.splice(idx, 1);
    if (progressData[date].tasks.length === 0) delete progressData[date];
    saveData();
    renderToday();
  }
}

function checkReminders() {
  const now = new Date();
  const today = isoToday(now);
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  if (!progressData[today]) return;
  progressData[today].tasks.forEach((task) => {
    if (
      task.isEvent &&
      !task.done &&
      task.time === timeStr &&
      !task._notified
    ) {
      notify(`Reminder: ${task.text}`);
      task._notified = true;
      saveData();
    }
  });
}

/* ------------------------------- TAB SWITCHING -------------------------------- */
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    tabBtns.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(target).classList.add("active");

    if (target === "gamification") renderGamificationTab();
  });
});

/* ----------------------------------- INIT ------------------------------------- */
addBtn.addEventListener("click", addTask);
newTodoInput.addEventListener(
  "keypress",
  (e) => e.key === "Enter" && addTask()
);
[taskTimeInput, taskDateInput].forEach((el) =>
  el.addEventListener("keypress", (e) => e.key === "Enter" && addTask())
);

if (window.Notification && Notification.permission !== "granted") {
  Notification.requestPermission();
}

renderToday();
renderHeatmap();
setInterval(checkReminders, 30 * 1000);

window.addEventListener("storage", () => {
  progressData = JSON.parse(localStorage.getItem("progressData")) || {};
  gamification = JSON.parse(localStorage.getItem("gamification")) || {
    level: 1,
    xp: 0,
    streak: 0,
    badges: [],
  };
  renderToday();
  renderGamificationTab();
});
