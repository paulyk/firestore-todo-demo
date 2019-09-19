import { firebase } from "@firebase/app"
import "@firebase/firestore"
import "@firebase/auth"
import firebaseConfig from "./firebase.config"

const state = {
  db: null,
  dom: null,
  user: null,
  todos: null
}

init()

function init() {
  firebase.initializeApp(firebaseConfig)

  const db = firebase.firestore()

  state.todos = []
  state.db = {
    todoCollection: db.collection("todos")
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

  setEventListeners()
  observe()
  abserveAuth()
}

function abserveAuth() {
  firebase.auth().onAuthStateChanged(userInfo => {
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

function observe() {
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
    return state.db.todoCollection.doc(id).set({ text })
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

function resetClick(evt) {
  evt.preventDefault()
  clearForm()
}

function deleteClick(evt) {
  const id = evt.target.parentElement.getAttribute("data-id")
  state.db.todoCollection.doc(id).delete()
}

function editClick(evt) {
  const id = evt.target.parentElement.getAttribute("data-id")
  console.log("id", id)
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
    const todoEl = document.createElement("div")
    todoEl.className = "list-item"
    todoEl.setAttribute("data-id", todo.id)

    const contentEl = document.createElement("a")
    contentEl.textContent = todo.text
    contentEl.onclick = editClick

    const deleteLinkEl = document.createElement("a")
    deleteLinkEl.textContent = "delete"
    deleteLinkEl.onclick = deleteClick

    todoEl.appendChild(contentEl)
    todoEl.appendChild(deleteLinkEl)

    state.dom.todoList.appendChild(todoEl)
  }
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
      console.log(error)
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
  }, 3000)
}