let progressData = JSON.parse(localStorage.getItem("progressData")) || {};
const todoList = document.getElementById("todoList");
const newTodoInput = document.getElementById("newTodo");
const addBtn = document.getElementById("addBtn");
const completedCountEl = document.getElementById("completedCount");
const todayDateEl = document.querySelector(".today-date");
const taskTimeInput = document.getElementById("taskTime");
const taskDateInput = document.getElementById("taskDate");
const taskTypeSelect = document.getElementById("taskType");
const futureListEl = document.getElementById("futureList");
addBtn.addEventListener("click", addTask);
newTodoInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});
taskTimeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});
taskDateInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});
function isoToday(dateObj = new Date()) {
  return dateObj.toISOString().split("T")[0];
}
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
  newTodoInput.value = "";
  taskTimeInput.value = "";
  taskDateInput.value = "";
  taskTypeSelect.value = "task";
  renderToday();
}
function renderToday() {
  const today = isoToday();
  const dayData = progressData[today] || { tasks: [], completed: 0 };
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  todayDateEl.textContent = new Date().toLocaleDateString(undefined, options);
  todoList.innerHTML = "";
  let completed = 0;
  dayData.tasks.sort((a, b) => {
    if (a.isEvent && b.isEvent)
      return (a.time || "").localeCompare(b.time || "");
    if (a.isEvent) return -1;
    if (b.isEvent) return 1;
    return 0;
  });
  dayData.tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (task.done ? " completed" : "");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () =>
      toggleTask(index, checkbox.checked)
    );
    const timeSpan = document.createElement("span");
    timeSpan.className = "todo-time";
    timeSpan.textContent = task.isEvent && task.time ? task.time : "";
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = task.text;
    span.addEventListener("click", () => toggleTask(index, !task.done));
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.addEventListener("click", () => deleteTask(index));
    li.append(checkbox, timeSpan, span, deleteBtn);
    todoList.appendChild(li);
    if (task.done) completed++;
  });
  dayData.completed = completed;
  progressData[today] = dayData;
  saveData();
  completedCountEl.textContent = completed;
  renderHeatmap();
  renderFutureTasks();
}
function toggleTask(index, done) {
  const today = isoToday();
  if (!progressData[today]) return;
  progressData[today].tasks[index].done = done;
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
function saveData() {
  localStorage.setItem("progressData", JSON.stringify(progressData));
}
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
        const key = dateInWeek.toISOString().split("T")[0];
        const dayData = progressData[key];
        const amount = dayData ? dayData.completed || 0 : 0;
        const level = getLevel(amount);
        const block = document.createElement("div");
        block.classList.add("block", `level-${level}`);
        block.title = `${key} — ${amount} completed ${
          amount === 1 ? "task" : "tasks"
        }`;
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
        block.classList.add("block", "level-0");
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
    .filter((date) => date >= today)
    .sort()
    .flatMap((date) => {
      return (progressData[date].tasks || []).map((t) => ({ ...t, date }));
    })
    .filter((t) => t.isEvent && t.time);
  upcoming.sort((a, b) => {
    if (a.date === b.date) return a.time.localeCompare(b.time);
    return a.date.localeCompare(b.date);
  });
  upcoming.forEach((task) => {
    const item = document.createElement("div");
    item.className = "future-task-item";
    const meta = document.createElement("div");
    meta.className = "future-task-meta";
    meta.textContent = `${task.date} ${task.time}`;
    const text = document.createElement("div");
    text.className = "future-task-text";
    text.textContent = task.text;
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.innerHTML = "×";
    del.addEventListener("click", () => {
      removeFutureTask(task.date, task.time, task.text);
    });
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
  const nowDate = isoToday(now);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const nowTime = `${hh}:${mm}`;
  if (!progressData[nowDate]) return;
  (progressData[nowDate].tasks || []).forEach((task) => {
    if (
      task.isEvent &&
      !task.done &&
      task.time === nowTime &&
      !task._notified
    ) {
      notify(`Reminder: ${task.text} at ${task.time}`);
      task._notified = true;
      saveData();
      renderToday();
    }
  });
}
function notify(message) {
  if (window.Notification && Notification.permission === "granted") {
    new Notification(message);
    return;
  }
  if (window.Notification && Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(message);
      else alert(message);
    });
    return;
  }
  alert(message);
}
if (window.Notification && Notification.permission !== "granted")
  Notification.requestPermission().catch(() => {});
renderToday();
renderHeatmap();
setInterval(checkReminders, 30 * 1000);
window.addEventListener("storage", () => {
  progressData = JSON.parse(localStorage.getItem("progressData")) || {};
  renderToday();
});
