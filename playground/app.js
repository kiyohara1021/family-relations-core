import {
  describeRelationship,
  getBirthOrder,
  layoutFamilyGraph,
  validateFamilyGraph,
} from "./lib/index.js";

const svgNamespace = "http://www.w3.org/2000/svg";
const input = document.querySelector("#json-input");
const origin = document.querySelector("#origin");
const target = document.querySelector("#target");
const locale = document.querySelector("#locale");
const graphElement = document.querySelector("#graph");
let exampleText = "";

function element(name, attributes = {}) {
  const node = document.createElementNS(svgNamespace, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function parseGraph() {
  const value = JSON.parse(input.value);
  if (!value || !Array.isArray(value.people)) throw new TypeError("people must be an array");
  return value;
}

function personName(graph, id) {
  const person = graph.people.find((candidate) => candidate.id === id);
  return person?.label || id;
}

function updatePeopleSelectors(graph) {
  const selectedOrigin = origin.value;
  const selectedTarget = target.value;
  for (const select of [origin, target]) select.replaceChildren();
  for (const person of graph.people) {
    for (const select of [origin, target]) {
      const option = document.createElement("option");
      option.value = person.id;
      option.textContent = person.label ? `${person.label} (${person.id})` : person.id;
      select.append(option);
    }
  }
  origin.value = graph.people.some((person) => person.id === selectedOrigin) ? selectedOrigin : graph.people[0]?.id || "";
  target.value = graph.people.some((person) => person.id === selectedTarget) ? selectedTarget : graph.people.at(-1)?.id || "";
}

function drawGraph(graph, layout) {
  graphElement.replaceChildren();
  graphElement.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  graphElement.setAttribute("width", layout.width);
  graphElement.setAttribute("height", layout.height);
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));

  for (const edge of layout.edges) {
    const from = nodes.get(edge.fromId);
    const to = nodes.get(edge.toId);
    if (!from || !to) continue;
    const partnership = edge.kind === "partnership";
    const line = element("line", {
      x1: from.x + from.width / 2,
      y1: partnership ? from.y + from.height / 2 : from.y + from.height,
      x2: to.x + to.width / 2,
      y2: partnership ? to.y + to.height / 2 : to.y,
      stroke: partnership ? "#b6f36a" : "#62d8cc",
      "stroke-width": 3,
      opacity: .72,
    });
    graphElement.append(line);
  }

  for (const node of layout.nodes) {
    const selected = node.id === origin.value || node.id === target.value;
    const group = element("g", { transform: `translate(${node.x} ${node.y})` });
    const card = element("rect", {
      width: node.width,
      height: node.height,
      rx: 12,
      fill: selected ? "#23342c" : "#141b19",
      stroke: selected ? "#b6f36a" : "#33423d",
      "stroke-width": selected ? 2 : 1,
    });
    const name = element("text", { x: 14, y: 36, fill: "#eef8f3", "font-size": 16, "font-weight": 700 });
    name.textContent = personName(graph, node.id);
    const id = element("text", { x: 14, y: 64, fill: "#94a69f", "font-size": 11, "font-family": "monospace" });
    id.textContent = node.id;
    const generation = element("text", { x: 14, y: 86, fill: "#62d8cc", "font-size": 10, "font-family": "monospace" });
    generation.textContent = `GEN ${node.generation}`;
    group.append(card, name, id, generation);
    graphElement.append(group);
  }
}

function renderIssues(issues) {
  const list = document.querySelector("#issues");
  list.replaceChildren();
  if (!issues.length) {
    const item = document.createElement("li");
    item.textContent = "構造上の問題は見つかりませんでした。";
    list.append(item);
    return;
  }
  for (const issue of issues) {
    const item = document.createElement("li");
    item.className = "error";
    item.textContent = `[${issue.code}] ${issue.message}`;
    list.append(item);
  }
}

function run() {
  try {
    const graph = parseGraph();
    updatePeopleSelectors(graph);
    const issues = validateFamilyGraph(graph);
    renderIssues(issues);
    document.querySelector("#validation-result").textContent = issues.length ? `${issues.length} issues` : "Valid";
    document.querySelector("#validation-detail").textContent = `${graph.people.length} people · ${graph.partnerships?.length || 0} partnerships`;

    const relation = describeRelationship(graph, origin.value, target.value, { locale: locale.value });
    document.querySelector("#relation-result").textContent = relation.label;
    document.querySelector("#relation-path").textContent = `${personName(graph, origin.value)} → ${personName(graph, target.value)} · up ${relation.up} / down ${relation.down}`;
    const order = getBirthOrder(target.value, graph.people, { locale: locale.value });
    document.querySelector("#birth-order-result").textContent = order?.label || "—";
    drawGraph(graph, layoutFamilyGraph(graph));
  } catch (error) {
    renderIssues([{ code: "invalid-json", message: error instanceof Error ? error.message : String(error) }]);
    document.querySelector("#validation-result").textContent = "Invalid";
    document.querySelector("#validation-detail").textContent = "JSONを確認してください";
    graphElement.replaceChildren();
  }
}

async function loadExample() {
  if (!exampleText) exampleText = await fetch("./example.json").then((response) => response.text());
  input.value = exampleText;
  const graph = parseGraph();
  updatePeopleSelectors(graph);
  run();
}

document.querySelector("#run").addEventListener("click", run);
document.querySelector("#load-example").addEventListener("click", loadExample);
origin.addEventListener("change", run);
target.addEventListener("change", run);
locale.addEventListener("change", run);
await loadExample();
