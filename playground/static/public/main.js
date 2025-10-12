import { parseAndRender } from 'https://cdn.jsdelivr.net/npm/jempl@1.0.0-rc2/+esm'
import jsYaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm'

const templateInput = document.getElementById("input-template")
const dataInput = document.getElementById("input-data")
const outputContainer = document.getElementById("output")
const exampleSelect = document.getElementById("example-select")

const initDefaultExample = () => {
  // Set the select to the first option and load it
  if (exampleSelect.options.length > 0) {
    exampleSelect.selectedIndex = 0
    loadExample()
  }
}

const loadExample = () => {
  const selectedExample = exampleSelect.value
  if (!selectedExample) return
  let exampleData = {}
  try {
    exampleData = jsYaml.load(decodeURIComponent(selectedExample))
    console.log("Loaded example data:", exampleData)
  } catch (error) {
    console.error("Error parsing example data:", error)
    return
  }
  templateInput.value = jsYaml.dump(exampleData.template)
  dataInput.value = jsYaml.dump(exampleData.data)
  handleTextChange()
}

// Custom functions for the playground
const customFunctions = {
  createUser: (name, age) => ({
    name: String(name),
    age: Number(age),
    isAdult: Number(age) >= 18,
    metadata: {
      createdAt: Date.now(),
      version: 1,
    },
  }),

  getStats: (items) => ({
    count: Array.isArray(items) ? items.length : 0,
    isEmpty: !Array.isArray(items) || items.length === 0,
    summary: `${Array.isArray(items) ? items.length : 0} items`,
  }),
}

const handleTextChange = () => {
  let template = {}
  let data = {}

  try {
    template = jsYaml.load(templateInput.value)
  } catch (error) {
    outputContainer.textContent = `Invalid YAML template: ${error.message}`
    return
  }
  try {
    data = jsYaml.load(dataInput.value)
  }
  catch (error) {
    outputContainer.textContent = `Invalid YAML data ${error.message}`
    return
  }
  outputContainer.textContent = ""
  let result = {}
  try {
    result = parseAndRender(template, data, { functions: customFunctions })
  }
  catch (error) {
    outputContainer.textContent = `Error rendering template: ${error.message}`
    return
  }

  outputContainer.textContent = jsYaml.dump(result)
}

const injectRenderButtonListener = () => {
  templateInput.addEventListener("input", handleTextChange)
  dataInput.addEventListener("input", handleTextChange)
}

const injectExampleSelectListener = () => {
  exampleSelect.addEventListener("change", loadExample)
}

const injectEventListener = () => {
  injectRenderButtonListener()
  injectExampleSelectListener()
}

injectEventListener()
initDefaultExample()
handleTextChange()
