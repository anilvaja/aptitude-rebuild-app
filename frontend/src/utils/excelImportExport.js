import * as XLSX from "xlsx";

/**
 * Parses an uploaded .xlsx, .xls, or .csv File into an array of JSON objects.
 */
export function parseExcelOrCsv(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(json);
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error("File reading error."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a dataset as an Excel (.xlsx) file.
 */
export function downloadExcel(data, fileName, sheetName = "Sheet1") {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Downloads a dataset as a CSV file.
 */
export function downloadCSV(data, fileName) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ------------------------------------------------------------------
// Sample Data Templates
// ------------------------------------------------------------------

export const SAMPLE_QUESTIONS = [
  {
    subject: "Claude Architecture",
    category: "Agentic Architecture & Orchestration",
    subCategory: "ReAct Loop Mechanics & State Transitions",
    type: "MCQ",
    text: "Based on the architectural diagram below, when building a production multi-turn agent with tool calling, why should intermediate tool execution errors be returned in the tool message rather than raising API exceptions?",
    choiceA: "To allow the agent model to observe the error message, reflect, and attempt a corrective tool call.",
    choiceB: "To bypass the need for context window management.",
    choiceC: "Because Claude cannot handle API exception status codes.",
    choiceD: "To force the conversation into an infinite retry loop.",
    choiceE: "",
    correctChoice: "A",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
    imageCaption: "Figure 1: Enterprise Multi-Turn Agent ReAct Feedback Cycle",
    solution: "Returning tool execution errors in the tool result message allows the LLM to inspect the failure output, diagnose the issue, and execute corrective action.",
    marks: 1,
    negativeMarks: 0.25,
    defaultTimeSeconds: 90,
    difficulty: "HARD",
  },
  {
    subject: "Mathematics",
    category: "Geometry & Shapes",
    subCategory: "2D Shapes Identification",
    type: "MCQ",
    text: "Look at the diagram illustration below. Which geometric shape has exactly 3 straight sides and 3 corners (vertices)?",
    choiceA: "Square",
    choiceB: "Triangle",
    choiceC: "Circle",
    choiceD: "Rectangle",
    choiceE: "",
    correctChoice: "B",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    imageCaption: "Figure 2: Basic 2D Geometric Shapes (Triangles and Polygons)",
    solution: "A triangle is a 2D closed polygon that has 3 straight sides and 3 corners (vertices).",
    marks: 1,
    negativeMarks: 0,
    defaultTimeSeconds: 45,
    difficulty: "EASY",
  },
  {
    subject: "English",
    category: "Grammar & Vocabulary",
    subCategory: "Nouns (Naming Words) & Opposites",
    type: "MCQ",
    text: "Select the naming word (Noun) in the following sentence: 'The happy dog ran across the green park.'",
    choiceA: "Happy",
    choiceB: "Ran",
    choiceC: "Dog",
    choiceD: "Green",
    choiceE: "",
    correctChoice: "C",
    imageUrl: "",
    imageCaption: "",
    solution: "'Dog' is a noun naming an animal. 'Happy' and 'green' are adjectives, and 'ran' is an action verb.",
    marks: 1,
    negativeMarks: 0,
    defaultTimeSeconds: 45,
    difficulty: "EASY",
  },
];

export const SAMPLE_STUDENTS = [
  {
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    password: "Student@123",
    grade: "Grade 2",
    age: 7,
    experienceYears: 0,
    education: "Primary School",
    schoolOrCompany: "Bright Day School",
  },
  {
    name: "Ananya Patel",
    email: "ananya.patel@example.com",
    password: "Student@123",
    grade: "Grade 1",
    age: 6,
    experienceYears: 0,
    education: "Primary School",
    schoolOrCompany: "Bright Day School",
  },
  {
    name: "Vikram Mehta",
    email: "vikram.mehta@example.com",
    password: "Admin@123",
    grade: "Masters",
    age: 32,
    experienceYears: 9,
    education: "Master of Science in Information Technology",
    schoolOrCompany: "Enterprise Cloud Solutions",
  },
];
