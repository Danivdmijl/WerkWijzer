document.addEventListener("DOMContentLoaded", async () => {
  const todoForm = document.getElementById("todoForm");
  const todoInput = document.getElementById("todoInput");
  const todoList = document.getElementById("todoList");
  const medewerker = window.medewerker;

  // Haalt de taken op uit de database die getoond worden
  console.log("Fetching existing tasks for:", medewerker);
  const { data: todos, error: fetchError } = await window.supabase
      .from("todos")
      .select("*")
      .eq("user", medewerker)
      .order("position", { ascending: true });

  if (fetchError) {
      console.error("Error fetching todos:", fetchError);
  } else {
      console.log("Fetched tasks:", todos);
      todos.forEach((todo, index) => {
          const li = createTodoItem(todo.task, todo.id, todo.completed);
          li.dataset.position = todo.position || index;
          li.setAttribute("draggable", "true");
          todoList.appendChild(li);
      });
  }

  // De functie zodra je een taak toevoegt aan het formulier
  todoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const task = todoInput.value.trim();
      if (task) {
          console.log("Adding new task:", task);
          const { data: insertData, error: insertError } = await window.supabase
              .from("todos")
              .insert([{ user: medewerker, task, completed: false, position: todoList.children.length }])
              .select();

          if (insertError) {
              console.error("Error adding todo:", insertError);
          } else if (insertData && insertData.length > 0) {
              console.log("Task added:", insertData[0]);
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

      // Maak de knop
      const button = document.createElement("button");
      button.classList.add("complete");
      if (completed) {
          button.textContent = "Undo";
          button.style.backgroundColor = "orange";
          button.style.color = "white";
      } else {
          button.textContent = "Voltooid";
      }

      button.addEventListener("click", async () => {
          if (!li.classList.contains("completed")) {
              // Markeer als voltooid
              const { error } = await window.supabase
                  .from("todos")
                  .update({ completed: true })
                  .eq("id", id);

              if (!error) {
                  li.classList.add("completed");
                  button.textContent = "Undo";
                  button.style.backgroundColor = "orange";
                  button.style.color = "white";
              } else {
                  console.error("Error marking as completed:", error);
              }
          } else {
              // Maak voltooid ongedaan (Undo)
              const { error } = await window.supabase
                  .from("todos")
                  .update({ completed: false })
                  .eq("id", id);

              if (!error) {
                  li.classList.remove("completed");
                  button.textContent = "Voltooid";
                  button.style.backgroundColor = "";
                  button.style.color = "";
              } else {
                  console.error("Error undoing completed:", error);
              }
          }
      });

      // Verwijder knop
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("delete");
      deleteButton.textContent = "Verwijder";
      deleteButton.addEventListener("click", async () => {
          const { error } = await window.supabase
              .from("todos")
              .delete()
              .eq("id", id);

          if (!error) {
              li.remove();
              updateTaskPositions();
          } else {
              console.error("Error deleting task:", error);
          }
      });

      // Voeg elementen toe aan li
      li.innerHTML = `<span>${task}</span>`;
      li.appendChild(button);
      li.appendChild(deleteButton);
      return li;
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

  const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
              mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1 && node.classList.contains("todo-item")) {
                      node.setAttribute("draggable", "true");
                  }
              });
          }
      });
  });

  observer.observe(todoList, { childList: true });
});