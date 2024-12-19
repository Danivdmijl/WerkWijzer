document.addEventListener("DOMContentLoaded", async () => {
    const todoForm = document.getElementById("todoForm");
    const todoInput = document.getElementById("todoInput");
    const todoList = document.getElementById("todoList");
    const medewerker = window.medewerker;

    // Haal taken op uit de database
    const { data: todos, error: fetchError } = await window.supabase
        .from("todos")
        .select("*")
        .eq("user", medewerker)
        .order("position", { ascending: true });

    if (fetchError) {
        console.error("Error fetching todos:", fetchError);
    } else {
        todos.forEach((todo, index) => {
            const li = createTodoItem(todo.task, todo.id, todo.completed);
            li.dataset.position = todo.position || index;
            li.setAttribute("draggable", "true");
            todoList.appendChild(li);
        });
    }

    // Toevoeg functie voor taken
    todoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const task = todoInput.value.trim();
        if (task) {
            const { data: insertData, error: insertError } = await window.supabase
                .from("todos")
                .insert([{ user: medewerker, task, completed: false, position: todoList.children.length }])
                .select();

            if (insertError) {
                console.error("Error adding todo:", insertError);
            } else if (insertData && insertData.length > 0) {
                const li = createTodoItem(task, insertData[0].id);
                li.dataset.position = insertData[0].position;
                li.setAttribute("draggable", "true");
                todoList.appendChild(li);
            }
            todoInput.value = "";
        }
    });

    function createTodoItem(task, id, completed = false) {
        const li = document.createElement("li");
        li.dataset.id = id;
        li.classList.add("todo-item");
        if (completed) li.classList.add("completed");

        // Container voor pijlen
        const arrowContainer = document.createElement("div");
        arrowContainer.classList.add("arrow-container");

        // Pijlen voor touch apparaten
        const upArrow = document.createElement("button");
        upArrow.classList.add("touch-only");
        upArrow.textContent = "▲";
        upArrow.addEventListener("click", moveTaskUp);

        const downArrow = document.createElement("button");
        downArrow.classList.add("touch-only");
        downArrow.textContent = "▼";
        downArrow.addEventListener("click", moveTaskDown);

        // Voeg pijlen toe aan container
        arrowContainer.appendChild(upArrow);
        arrowContainer.appendChild(downArrow);

        const span = document.createElement("span");
        span.textContent = task;

        const completeButton = document.createElement("button");
        completeButton.classList.add("complete");
        completeButton.textContent = completed ? "Undo" : "Voltooid";
        completeButton.style.backgroundColor = completed ? "orange" : "";
        completeButton.addEventListener("click", toggleComplete);

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete");
        deleteButton.textContent = "Verwijder";
        deleteButton.addEventListener("click", deleteTask);

        li.appendChild(arrowContainer);
        li.appendChild(span);
        li.appendChild(completeButton);
        li.appendChild(deleteButton);

        return li;
    }

    async function moveTaskUp(event) {
        const li = event.target.parentElement.parentElement;
        const previous = li.previousElementSibling;
        if (previous) {
            todoList.insertBefore(li, previous);
            await updateTaskPositions();
        }
    }

    async function moveTaskDown(event) {
        const li = event.target.parentElement.parentElement;
        const next = li.nextElementSibling;
        if (next) {
            todoList.insertBefore(next, li);
            await updateTaskPositions();
        }
    }

    async function toggleComplete(event) {
        const li = event.target.parentElement;
        const id = li.dataset.id;
        const isCompleted = li.classList.toggle("completed");
        const { error } = await window.supabase
            .from("todos")
            .update({ completed: isCompleted })
            .eq("id", id);
    
        if (error) {
            console.error("Error updating task:", error);
        } else {
            event.target.textContent = isCompleted ? "Undo" : "Voltooid";
            event.target.style.backgroundColor = isCompleted ? "orange" : "";
            // Voeg deze regel toe om de kleur van de pijlknoppen aan te passen
            li.querySelectorAll(".touch-only").forEach(button => {
                button.style.color = isCompleted ? "#bccacc" : "";
            });
        }
    }    

    async function deleteTask(event) {
        const li = event.target.parentElement;
        const id = li.dataset.id;
        const { error } = await window.supabase
            .from("todos")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting task:", error);
        } else {
            li.remove();
            await updateTaskPositions();
        }
    }

    todoList.addEventListener("dragstart", (e) => {
        if (e.target && e.target.classList.contains("todo-item")) {
            e.target.classList.add("dragging");
        }
    });

    todoList.addEventListener("dragend", async (e) => {
        if (e.target && e.target.classList.contains("todo-item")) {
            e.target.classList.remove("dragging");
            await updateTaskPositions();
        }
    });

    todoList.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector(".dragging");
        const afterElement = getDragAfterElement(todoList, e.clientY);
        if (afterElement == null) {
            todoList.appendChild(draggingItem);
        } else {
            todoList.insertBefore(draggingItem, afterElement);
        }
    });

    async function updateTaskPositions() {
        const todoItems = todoList.querySelectorAll(".todo-item");
        todoItems.forEach(async (item, index) => {
            const taskId = item.dataset.id;
            const { error } = await window.supabase
                .from("todos")
                .update({ position: index })
                .eq("id", taskId);

            if (error) {
                console.error("Error updating task position:", error);
            }
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".todo-item:not(.dragging)")];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY }
        ).element;
    }
});