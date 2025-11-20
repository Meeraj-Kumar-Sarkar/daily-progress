// Data structure: { "2025-11-20": { tasks: [{text: "Task", done: true/false}], completed: 5 } }
let progressData = JSON.parse(localStorage.getItem("progressData")) || {};

const daysToShow = 30;

// Elements
const todoList = document.getElementById("todoList");
const newTodoInput = document.getElementById("newTodo");
const addBtn = document.getElementById("addBtn");
const completedCountEl = document.getElementById("completedCount");

// Add new task
addBtn.addEventListener("click", addTask);
newTodoInput.addEventListener("keypress", e => {
    if (e.key === "Enter") addTask();
});

function addTask() {
    const text = newTodoInput.value.trim();
    if (!text) return;

    const today = new Date().toISOString().split("T")[0];
    if (!progressData[today]) progressData[today] = { tasks: [], completed: 0 };

    progressData[today].tasks.push({ text, done: false });
    localStorage.setItem("progressData", JSON.stringify(progressData));

    newTodoInput.value = "";
    renderTodayTasks();
    renderHeatmap();
}

// Render today's task list
function renderTodayTasks() {
    const today = new Date().toISOString().split("T")[0];
    const dayData = progressData[today] || { tasks: [], completed: 0 };

    todoList.innerHTML = "";
    let completed = 0;

    dayData.tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.className = "todo-item" + (task.done ? " completed" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.addEventListener("change", () => toggleTask(index, checkbox.checked));

        const span = document.createElement("span");
        span.className = "todo-text";
        span.textContent = task.text;
        span.addEventListener("click", () => toggleTask(index, !task.done));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "×";
        deleteBtn.addEventListener("click", () => deleteTask(index));

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        todoList.appendChild(li);

        if (task.done) completed++;
    });

    dayData.completed = completed;
    progressData[today] = dayData;
    localStorage.setItem("progressData", JSON.stringify(progressData));
    completedCountEl.textContent = completed;
    renderHeatmap();
}

function toggleTask(index, done) {
    const today = new Date().toISOString().split("T")[0];
    progressData[today].tasks[index].done = done;
    localStorage.setItem("progressData", JSON.stringify(progressData));
    renderTodayTasks();
}

function deleteTask(index) {
    const today = new Date().toISOString().split("T")[0];
    progressData[today].tasks.splice(index, 1);
    if (progressData[today].tasks.length === 0) delete progressData[today];
    localStorage.setItem("progressData", JSON.stringify(progressData));
    renderTodayTasks();
}

// Heatmap logic
function getLevel(value) {
    if (value === 0) return 0;
    if (value <= 3) return 1;
    if (value <= 7) return 2;
    if (value <= 15) return 3;
    return 4;
}

function renderHeatmap() {
    const heatmap = document.getElementById("heatmap");
    heatmap.innerHTML = "";

    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split("T")[0];

        const dayData = progressData[key];
        const amount = dayData ? dayData.completed || 0 : 0;
        const level = getLevel(amount);

        const block = document.createElement("div");
        block.classList.add("block", `level-${level}`);
        block.title = `${key} — ${amount} completed ${amount === 1 ? "task" : "tasks"}`;

        heatmap.appendChild(block);
    }
}

// Initial render
renderTodayTasks();
renderHeatmap();