import { chromium } from 'playwright'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}/`

function todayISO() {
  // Chrome date input expects yyyy-mm-dd.
  return new Date().toISOString().slice(0, 10)
}

async function run() {
  const browser = await chromium.launch()
  const context = await browser.newContext()

  const page = await context.newPage()
  page.setDefaultTimeout(10000)

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.localStorage.clear())

  // --- Create task ---
  await page.locator('input[placeholder="e.g., Write project outline"]').fill('Test Task 1')
  await page.locator('textarea[placeholder="Add more context (optional)"]').fill('Desc 1')
  await page.locator('input[placeholder="comma, separated"]').fill('tag1, tag2')

  const formSelects = page.locator('form select')
  // Order in DOM: status select, priority select
  await formSelects.nth(0).selectOption({ value: 'todo' })
  await formSelects.nth(1).selectOption({ value: 'high' })

  await page.locator('input[type="date"]').fill(todayISO())
  await page.getByRole('button', { name: 'Create Task' }).click()

  // --- Verify card appears ---
  await page.getByText('Test Task 1', { exact: true }).waitFor({ state: 'visible' })

  // --- Open modal and edit ---
  await page.getByText('Test Task 1', { exact: true }).click()
  const modalTextarea = page.locator('[role="dialog"] textarea').first()
  await modalTextarea.fill('Desc 1 updated')

  const modalSelects = page.locator('[role="dialog"] select')
  // Modal order: status select, priority select
  await modalSelects.nth(0).selectOption({ value: 'inProgress' })

  await page.getByRole('button', { name: 'Save' }).click()

  // --- Verify moved + updated description persists in DOM ---
  await page.getByText('Desc 1 updated', { exact: false }).waitFor({ state: 'visible' })

  // --- Drag between columns (todo -> done) ---
  const draggable = page
    .locator('[data-rbd-draggable-id]')
    .filter({ has: page.getByText('Test Task 1', { exact: true }) })
    .first()

  const doneColumn = page.locator('[data-rbd-droppable-id="done"]').first()
  const dragHandle = draggable.locator('.cursor-grab').first()
  // react-beautiful-dnd relies on HTML5 drag/drop events. We emulate the mouse drag.
  const sourceBox = await dragHandle.boundingBox()
  const targetBox = await doneColumn.boundingBox()
  if (!sourceBox || !targetBox) throw new Error('Could not compute drag/drop bounding boxes')

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 15 })
  await page.mouse.up()

  // Give the DnD state a moment to settle.
  await page.waitForTimeout(500)

  const savedAfterDrag = await page.evaluate(() => {
    const raw = localStorage.getItem('kanbanTasksV1')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Object.values(parsed.tasksById || {})
  })
  const draggedTask = savedAfterDrag?.find((t) => t.title === 'Test Task 1')
  if (!draggedTask) throw new Error('drag target task not found in localStorage after drag')
  if (draggedTask.status !== 'done') throw new Error(`expected status "done" after drag, got "${draggedTask.status}"`)

  // --- Refresh persistence check ---
  await page.reload({ waitUntil: 'domcontentloaded' })
  const storageKeyValue = await page.evaluate(() => localStorage.getItem('kanbanTasksV1'))
  if (!storageKeyValue) throw new Error('localStorage key kanbanTasksV1 is missing after reload')

  const savedTasks = await page.evaluate(() => {
    const raw = localStorage.getItem('kanbanTasksV1')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Object.values(parsed.tasksById || {}).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      description: t.description,
      tags: t.tags,
      priority: t.priority,
      deadline: t.deadline,
    }))
  })

  console.log('After reload, savedTasks:', JSON.stringify(savedTasks))

  await page.getByText('Desc 1 updated').waitFor({ state: 'visible' })

  const titleCount = await page.getByText('Test Task 1').count()
  if (titleCount === 0) throw new Error('Task title not found in DOM after reload')
  await page.getByText('Test Task 1').first().waitFor({ state: 'visible' })

  await browser.close()
  return true
}

run()
  .then(() => {
    console.log('Kanban smoke test: PASS')
  })
  .catch((err) => {
    console.error('Kanban smoke test: FAIL')
    console.error(err)
    process.exit(1)
  })

