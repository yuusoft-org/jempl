import { parseAndRender } from 'https://cdn.jsdelivr.net/npm/jempl@1.0.0-rc2/+esm'
import jsYaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm'

const templateInput = document.getElementById("input-template")
const dataInput = document.getElementById("input-data")
const outputContainer = document.getElementById("output")
const exampleSelect = document.getElementById("example-select")

const initDefaultExample = () =>{
    templateInput.textContent = `fullName: "\${fullName.firstName} \${fullName.lastName}"
age: "\${age}"
city: "I live in \${city}"
isAdult: \${isAdult}
firstHobby: "\${hobbies[0]}"
allHobbies: "\${hobbies}"`
    dataInput.textContent = `fullName:
   firstName: "John"
   lastName: "Doe"
age: 30
city: "New York"
isAdult: true
hobbies: ["reading", "writing", "coding"]
placeholderText: "Enter your name"
    `
}

const loadExample = ()=>{
    const selectedExample = exampleSelect.value
    if(!selectedExample) return
    let exampleData = {}
    try{
        exampleData = jsYaml.load(decodeURIComponent(selectedExample))
        console.log("Loaded example data:", exampleData)
    }catch(error){
        console.error("Error parsing example data:", error)
        return
    }
    templateInput.value = jsYaml.dump(exampleData.template)
    dataInput.value = jsYaml.dump(exampleData.data)
    handleTextChange()
}

const handleTextChange = ()=>{
    let template = {}
    let data = {}

    try {
        template = jsYaml.load(templateInput.value)
    } catch (error) {
        outputContainer.textContent = "Invalid YAML template"
        return
    }
    try{
        data = jsYaml.load(dataInput.value)
    }
    catch(error){
        outputContainer.textContent = "Invalid YAML data"
        return
    }
    outputContainer.textContent = ""
    let result = {}
    try{
        result = parseAndRender(template, data)
    }
    catch(error){
        outputContainer.textContent = "Error rendering template: " + error.message
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