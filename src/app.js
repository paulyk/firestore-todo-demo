
import { Auth, Db} from './firebase'

const state = {
  db: null,
  dom: null,
  user: null,
  todos: null
}

init()

function init() {
  initState() 
  setEventListeners()
  subscribeToDbChanges()
  subscribeToAuthChanges()
}

function initState() {
  state.db = {
    todoCollection: Db.collection("todos")
  }
  
  state.dom = {
    signInButton: document.getElementById("sign-in-btn"),
    signOutButton: document.getElementById("sign-out-btn"),
    username: document.getElementById("username"),
    addTodoButton: document.getElementById("add-btn"),
    resetTodoButton: document.getElementById("reset-btn"),
    form: document.querySelector("form"),
    todoList: document.getElementById("todo-list"),
    globalErrorWrap: document.querySelector('.global-error-wrap')
  }
  
  state.user = {
    userInfo: null,
    isAuthenticated: false
  }

  state.todos = []
}

function subscribeToAuthChanges() {
  Auth.onAuthStateChanged(userInfo => {
    const { user } = state
    if (userInfo) {
      user.userInfo = userInfo
      user.isAuthenticated = true
    } else {
      user.userInfo = undefined
      user.isAuthenticated = false
    }
    renderAuthState()
  })
}

function subscribeToDbChanges() {
  state.db.todoCollection.onSnapshot(snap => {
    snap.docChanges().forEach(change => {
      updateTodos(change)
    })
    renderTodos()
  })
}

function saveTodo() {
  _saveTodo()
    .catch(err => showGlobalError(err.message))
    .finally(clearForm)
}

function _saveTodo() {
  const { form } = state.dom
  const id = form.getAttribute("data-id")
  const text = form.todo.value
  if (id) {
    return state.db.todoCollection.doc(id).update({ text })
  } else {
    return state.db.todoCollection.add({ text })
  }
}

function saveClick(evt) {
  evt.preventDefault()
  const { form } = state.dom

  if (!form.todo.value || form.todo.value.trim().length === 0) {
    return
  }
  saveTodo()
}

function updateDoneStatus(evt) {
  const { todoCollection } = state.db
  const id = evt.target.closest('[data-id]').getAttribute('data-id')

  const done = evt.target.checked 
  todoCollection.doc(id).update({ done })
}

function resetClick(evt) {
  evt.preventDefault()
  clearForm()
}

function deleteClick(evt) {
  const id = evt.target.closest('[data-id]').getAttribute('data-id')
  state.db.todoCollection.doc(id).delete()
}

function editClick(evt) {
  const id = evt.target.closest('[data-id]').getAttribute('data-id')
  populateForm(id)
}

function setEventListeners() {
  state.dom.addTodoButton.addEventListener("click", saveClick)
  state.dom.resetTodoButton.addEventListener("click", resetClick)
  state.dom.signInButton.addEventListener("click", signInClick)
  state.dom.signOutButton.addEventListener("click", signOutClick)
  window.onerror = handleGlobalError
}

function populateForm(id) {
  const { form, addTodoButton } = state.dom

  if (id) {
    const todo = state.todos.find(x => x.id === id)
    form.setAttribute("data-id", todo.id)
    form.todo.value = todo.text
    addTodoButton.textContent = "Update"
  } 
}

function clearForm() {
  const { form, addTodoButton } = state.dom
  form.removeAttribute("data-id")
  form.todo.value = ""
  addTodoButton.textContent = "Add"
}


function updateTodos(change) {
  const { todos } = state
  const {
    type,
    doc,
    doc: { id }
  } = change
  switch (type) {
    case "added": {
      todos.push({ id, ...doc.data() })
      return
    }
    case "modified": {
      const index = todos.findIndex(x => x.id === id)
      todos[index] = { id, ...doc.data() }
      return
    }
    case "removed": {
      const index = todos.findIndex(x => x.id === id)
      todos.splice(index, 1)
      return
    }
    default:
      return
  }
}

function renderAuthState() {
  const {
    user: { isAuthenticated, userInfo }
  } = state
  if (isAuthenticated) {
    state.dom.username.textContent = userInfo.displayName
    state.dom.signInButton.classList.add("hide")
    state.dom.signOutButton.classList.remove("hide")
  } else {
    state.dom.username.textContent = ""
    state.dom.signInButton.classList.remove("hide")
    state.dom.signOutButton.classList.add("hide")
  }
}

function renderTodos() {
  const { todos } = state

  state.dom.todoList.innerHTML = ""

  for (let todo of todos) {
    const todoEl = createTodoElement(todo)

    state.dom.todoList.appendChild(todoEl)
  }
}

function createTodoElement(todo) {
  const todoEl = document.createElement("div")
    todoEl.className = "list-item"
    todoEl.setAttribute("data-id", todo.id)

    const todoText = document.createElement("a")
    todoText.textContent = todo.text
    todoText.onclick = editClick

    // actions
    const actionGroup = document.createElement('div')
    actionGroup.className = "actions"

    
    const doneCheckbox = createCheckBox(todo)

    const deleteLink = document.createElement("a")
    deleteLink.textContent = "delete"
    deleteLink.onclick = deleteClick

    actionGroup.appendChild(doneCheckbox)
    actionGroup.appendChild(deleteLink)

    todoEl.appendChild(todoText)
    todoEl.appendChild(actionGroup)
    return todoEl
}

function createCheckBox(todo) {
  const wrap = document.createElement('div')
  wrap.className = "checkbox-wrap"

  const cb_id = `cb-${todo.id}`

  const checkbox = document.createElement('input')
  checkbox.setAttribute('type', "checkbox")
  checkbox.setAttribute('id', cb_id)
  checkbox.checked = todo.done
  checkbox.oninput = updateDoneStatus

  const label = document.createElement('label')
  label.setAttribute("for", cb_id)

  wrap.appendChild(checkbox)
  wrap.appendChild(label)

  return wrap
}

async function signInClick(evt) {
  evt.preventDefault()
  const provider = new firebase.auth.GoogleAuthProvider()
  return firebase
    .auth()
    .signInWithPopup(provider)
    .then(function(result) {
      state.user = result.user
    })
    .catch(function(error) {
      showGlobalError(error.message)
    })
}

function signOutClick(evt) {
  evt.preventDefault()
  firebase.auth().signOut()
}


function handleGlobalError(message, source, lineno, colno, error) {  
  showGlobalError(message)
}

function showGlobalError(msg) {
  const { globalErrorWrap } = state.dom
  globalErrorWrap.style.display = 'block'
  const contentEl = globalErrorWrap.querySelector("*")
  contentEl.textContent = msg
  setTimeout(() => {
    globalErrorWrap.style.display = 'none'
  }, 5000)
}