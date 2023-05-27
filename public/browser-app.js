const authSection = document.querySelector('#auth-section')
const authForm = document.querySelector('#auth-form')
const authTitle = document.querySelector('#auth-title')
const authSubmit = document.querySelector('#auth-submit')
const authToggle = document.querySelector('#auth-toggle')
const authAlert = document.querySelector('#auth-alert')
const nameRow = document.querySelector('#name-row')
const dashboard = document.querySelector('#dashboard')
const userName = document.querySelector('#user-name')
const logoutBtn = document.querySelector('#logout')
const jobsList = document.querySelector('#jobs-list')
const jobsCount = document.querySelector('#jobs-count')
const jobForm = document.querySelector('#job-form')
const jobAlert = document.querySelector('#job-alert')
const jobSubmit = document.querySelector('#job-submit')
const jobCancel = document.querySelector('#job-cancel')
const jobFormTitle = document.querySelector('#job-form-title')
const filtersForm = document.querySelector('#filters')
const pagination = document.querySelector('#pagination')
const pageInfo = document.querySelector('#page-info')
const prevPage = document.querySelector('#prev-page')
const nextPage = document.querySelector('#next-page')
const monthly = document.querySelector('#monthly')

let token = localStorage.getItem('token')
let isRegister = false
let currentJobs = []
let editingJobId = null
let page = 1

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
  // an expired or invalid token sends the user back to the login form
  if (res.status === 401 && token) logout()
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

const formatSalary = ({ salaryMin: min, salaryMax: max }) => {
  const format = (value) => value.toLocaleString('en-US')
  if (min != null && max != null) return `salary ${format(min)}–${format(max)}`
  if (min != null) return `salary from ${format(min)}`
  if (max != null) return `salary up to ${format(max)}`
}

const jobItem = (job) => {
  const li = el('li', 'job')
  const header = el('div', 'job-header')
  header.append(
    el('h5', 'job-position', job.position),
    el('span', `status status-${job.status}`, job.status)
  )
  const details = [job.company, job.jobLocation, job.jobType, formatSalary(job), formatDate(job.createdAt)]
  const actions = el('div', 'job-actions')
  for (const action of ['edit', 'delete']) {
    const button = el('button', `btn ${action === 'delete' ? 'btn-danger' : 'btn-hipster'}`, action)
    button.type = 'button'
    button.dataset.action = action
    button.dataset.id = job._id
    actions.append(button)
  }
  li.append(header, el('p', 'job-meta', details.filter(Boolean).join(' · ')))
  if (job.notes) li.append(el('p', 'job-notes', job.notes))
  // the API only stores http(s) links; check again before making it clickable
  if (/^https?:\/\//i.test(job.link || '')) {
    const link = el('a', 'job-link', 'job posting')
    link.href = job.link
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    li.append(link)
  }
  li.append(actions)
  return li
}

const loadJobs = async () => {
  try {
    const params = new URLSearchParams(new FormData(filtersForm))
    params.set('page', page)
    const { jobs, totalJobs, numOfPages } = await api(`/jobs?${params}`)
    if (page > numOfPages && numOfPages > 0) {
      page = numOfPages
      return loadJobs()
    }
    currentJobs = jobs
    pagination.hidden = numOfPages < 2
    pageInfo.textContent = `page ${page} of ${numOfPages}`
    prevPage.disabled = page <= 1
    nextPage.disabled = page >= numOfPages
    jobsCount.textContent = `${totalJobs} job${totalJobs === 1 ? '' : 's'} found`
    jobsList.replaceChildren(...jobs.map(jobItem))
  } catch (error) {
    jobsCount.textContent = error.message
  }
}

const loadStats = async () => {
  try {
    const { defaultStats, monthlyApplications } = await api('/jobs/stats')
    for (const [status, count] of Object.entries(defaultStats)) {
      document.querySelector(`#stat-${status}`).textContent = count
    }
    const max = Math.max(1, ...monthlyApplications.map(({ count }) => count))
    monthly.replaceChildren(
      ...monthlyApplications.map(({ date, count }) => {
        const li = el('li', 'month')
        const bar = el('span', 'month-bar')
        bar.style.width = `${(count / max) * 100}%`
        li.append(el('span', 'month-label', date), bar, el('span', 'month-count', count))
        return li
      })
    )
  } catch (error) {
    monthly.replaceChildren()
  }
}

const jobFields = [
  'position',
  'company',
  'jobLocation',
  'status',
  'jobType',
  'salaryMin',
  'salaryMax',
  'link',
  'notes',
]

const setEditing = (job) => {
  editingJobId = job ? job._id : null
  jobFormTitle.textContent = job ? 'edit job' : 'add job'
  jobSubmit.textContent = job ? 'save' : 'add job'
  jobCancel.hidden = !job
  jobForm.reset()
  if (job) {
    for (const field of jobFields) jobForm.elements[field].value = job[field] ?? ''
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
  loadStats()
}

const showAuth = () => {
  authSection.hidden = false
  dashboard.hidden = true
}

const logout = () => {
  localStorage.removeItem('token')
  token = null
  currentJobs = []
  page = 1
  setEditing(null)
  filtersForm.reset()
  showAuth()
}

logoutBtn.addEventListener('click', logout)

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
    loadStats()
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
    loadStats()
  } catch (error) {
    showAlert(jobAlert, error.message)
  }
})

let searchTimeout
filtersForm.addEventListener('input', () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page = 1
    loadJobs()
  }, 300)
})
filtersForm.addEventListener('reset', () => {
  page = 1
  // logout also resets the filters; only reload when logged in
  if (token) setTimeout(loadJobs)
})

prevPage.addEventListener('click', () => {
  page -= 1
  loadJobs()
})
nextPage.addEventListener('click', () => {
  page += 1
  loadJobs()
})
filtersForm.addEventListener('submit', (e) => e.preventDefault())

const init = async () => {
  if (!token) return showAuth()
  try {
    const { user } = await api('/auth/me')
    showDashboard(user)
  } catch (error) {
    logout()
  }
}

init()
