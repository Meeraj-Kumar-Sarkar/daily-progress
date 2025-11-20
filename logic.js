let progressData = JSON.parse(localStorage.getItem("progressData")) || {};

const todoList = document.getElementById("todoList");
const newTodoInput = document.getElementById("newTodo");
const addBtn = document.getElementById("addBtn");
const completedCountEl = document.getElementById("completedCount");
const todayDateEl = document.querySelector(".today-date");

// Add task
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
    saveData();
    newTodoInput.value = "";
    renderToday();
}

// Render today's tasks and date
function renderToday() {
    const today = new Date().toISOString().split("T")[0];
    const dayData = progressData[today] || { tasks: [], completed: 0 };

    // Update date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayDateEl.textContent = new Date().toLocaleDateString(undefined, options);

    // Render tasks
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
        deleteBtn.innerHTML = "&times;";
        deleteBtn.addEventListener("click", () => deleteTask(index));

        li.append(checkbox, span, deleteBtn);
        todoList.appendChild(li);

        if (task.done) completed++;
    });

    dayData.completed = completed;
    progressData[today] = dayData;
    saveData();
    completedCountEl.textContent = completed;
    renderHeatmap();
}

function toggleTask(index, done) {
    const today = new Date().toISOString().split("T")[0];
    progressData[today].tasks[index].done = done;
    saveData();
    renderToday();
}

function deleteTask(index) {
    const today = new Date().toISOString().split("T")[0];
    progressData[today].tasks.splice(index, 1);
    if (progressData[today].tasks.length === 0) delete progressData[today];
    saveData();
    renderToday();
}

function saveData() {
    localStorage.setItem("progressData", JSON.stringify(progressData));
}

// Heatmap
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

    // Group days by week columns
    const weeks = [];
    let currentWeek = [];
    
    for (let i = 0; i < daysToShow; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        currentWeek.push(date);
        
        // Start new week on Sunday or when we hit 7 days
        if (date.getDay() === 6 || i === daysToShow - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Track month labels
    let lastMonth = -1;
    const monthPositions = [];

    weeks.forEach((week, weekIndex) => {
        const column = document.createElement("div");
        column.className = "heatmap-column";

        // Add 7 blocks per column (one for each day of week)
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const dateInWeek = week.find(d => d.getDay() === dayOfWeek);
            
            if (dateInWeek) {
                const key = dateInWeek.toISOString().split("T")[0];
                const dayData = progressData[key];
                const amount = dayData ? (dayData.completed || 0) : 0;
                const level = getLevel(amount);

                const block = document.createElement("div");
                block.classList.add("block", `level-${level}`);
                block.title = `${key} — ${amount} completed ${amount === 1 ? "task" : "tasks"}`;
                column.appendChild(block);

                // Track month labels
                if (dateInWeek.getMonth() !== lastMonth) {
                    lastMonth = dateInWeek.getMonth();
                    monthPositions.push({
                        weekIndex,
                        name: dateInWeek.toLocaleDateString(undefined, { month: 'short' })
                    });
                }
            } else {
                // Empty placeholder for alignment
                const block = document.createElement("div");
                block.classList.add("block", "level-0");
                block.style.opacity = "0.3";
                column.appendChild(block);
            }
        }

        heatmap.appendChild(column);
    });

    // Add month labels
    let labelIndex = 0;
    for (let i = 0; i < weeks.length; i++) {
        const label = document.createElement("div");
        label.className = "month-label";
        
        if (labelIndex < monthPositions.length && monthPositions[labelIndex].weekIndex === i) {
            label.textContent = monthPositions[labelIndex].name;
            labelIndex++;
        }
        
        monthLabels.appendChild(label);
    }
}

// Initial render
renderToday();
renderHeatmap();