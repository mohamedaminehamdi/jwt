const authSection = document.querySelector('#auth-section')
const authForm = document.querySelector('#auth-form')
const authTitle = document.querySelector('#auth-title')
const authSubmit = document.querySelector('#auth-submit')
const authToggle = document.querySelector('#auth-toggle')
const authAlert = document.querySelector('#auth-alert')
const nameRow = document.querySelector('#name-row')
const dashboard = document.querySelector('#dashboard')
const userName = document.querySelector('#user-name')
const jobsList = document.querySelector('#jobs-list')
const jobsCount = document.querySelector('#jobs-count')
const jobForm = document.querySelector('#job-form')
const jobAlert = document.querySelector('#job-alert')
const jobSubmit = document.querySelector('#job-submit')
const jobCancel = document.querySelector('#job-cancel')
const jobFormTitle = document.querySelector('#job-form-title')

let token = localStorage.getItem('token')
let isRegister = false
let currentJobs = []
let editingJobId = null

const api = async (path, { method = 'GET', body } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: body && JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.msg || 'Something went wrong')
  return data
}

const showAlert = (element, msg, type = 'danger') => {
  element.textContent = msg
  element.className = `alert alert-${type}`
  element.hidden = false
  setTimeout(() => {
    element.hidden = true
  }, 3000)
}

const el = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const jobItem = (job) => {
  const li = el('li', 'job')
  const header = el('div', 'job-header')
  header.append(
    el('h5', 'job-position', job.position),
    el('span', `status status-${job.status}`, job.status)
  )
  const details = [job.company, job.jobLocation, job.jobType, formatDate(job.createdAt)]
  const actions = el('div', 'job-actions')
  for (const action of ['edit', 'delete']) {
    const button = el('button', `btn ${action === 'delete' ? 'btn-danger' : 'btn-hipster'}`, action)
    button.type = 'button'
    button.dataset.action = action
    button.dataset.id = job._id
    actions.append(button)
  }
  li.append(header, el('p', 'job-meta', details.filter(Boolean).join(' · ')), actions)
  return li
}

const loadJobs = async () => {
  try {
    const { jobs, totalJobs } = await api('/jobs')
    currentJobs = jobs
    jobsCount.textContent = `${totalJobs} job${totalJobs === 1 ? '' : 's'} found`
    jobsList.replaceChildren(...jobs.map(jobItem))
  } catch (error) {
    jobsCount.textContent = error.message
  }
}

const jobFields = ['position', 'company', 'jobLocation', 'status', 'jobType']

const setEditing = (job) => {
  editingJobId = job ? job._id : null
  jobFormTitle.textContent = job ? 'edit job' : 'add job'
  jobSubmit.textContent = job ? 'save' : 'add job'
  jobCancel.hidden = !job
  jobForm.reset()
  if (job) {
    for (const field of jobFields) jobForm.elements[field].value = job[field] || ''
  }
}

const setAuthMode = (register) => {
  isRegister = register
  nameRow.hidden = !register
  authForm.elements.name.required = register
  authTitle.textContent = register ? 'register' : 'login'
  authSubmit.textContent = register ? 'register' : 'login'
  authToggle.textContent = register ? 'login instead' : 'create an account'
}

const showDashboard = (user) => {
  userName.textContent = user.name
  authSection.hidden = true
  dashboard.hidden = false
  loadJobs()
}

const showAuth = () => {
  authSection.hidden = false
  dashboard.hidden = true
}

authToggle.addEventListener('click', () => setAuthMode(!isRegister))

authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const { name, email, password } = authForm.elements
  const body = { email: email.value, password: password.value }
  if (isRegister) body.name = name.value
  authSubmit.disabled = true
  try {
    const data = await api(isRegister ? '/auth/register' : '/auth/login', {
      method: 'POST',
      body,
    })
    token = data.token
    localStorage.setItem('token', token)
    authForm.reset()
    showDashboard(data.user)
  } catch (error) {
    showAlert(authAlert, error.message)
  } finally {
    authSubmit.disabled = false
  }
})

jobForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const body = Object.fromEntries(new FormData(jobForm))
  jobSubmit.disabled = true
  try {
    if (editingJobId) {
      await api(`/jobs/${editingJobId}`, { method: 'PATCH', body })
    } else {
      await api('/jobs', { method: 'POST', body })
    }
    showAlert(jobAlert, editingJobId ? 'Job updated' : 'Job added', 'success')
    setEditing(null)
    loadJobs()
  } catch (error) {
    showAlert(jobAlert, error.message)
  } finally {
    jobSubmit.disabled = false
  }
})

jobCancel.addEventListener('click', () => setEditing(null))

jobsList.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]')
  if (!button) return
  const job = currentJobs.find((item) => item._id === button.dataset.id)
  if (button.dataset.action === 'edit') {
    setEditing(job)
    jobForm.scrollIntoView({ behavior: 'smooth' })
    return
  }
  if (!confirm(`Delete ${job.position} at ${job.company}?`)) return
  try {
    await api(`/jobs/${job._id}`, { method: 'DELETE' })
    if (editingJobId === job._id) setEditing(null)
    loadJobs()
  } catch (error) {
    showAlert(jobAlert, error.message)
  }
})

const init = async () => {
  if (!token) return showAuth()
  try {
    const { user } = await api('/auth/me')
    showDashboard(user)
  } catch (error) {
    localStorage.removeItem('token')
    token = null
    showAuth()
  }
}

init()
