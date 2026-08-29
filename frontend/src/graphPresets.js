/** Preset đồ thị hàm — GeoGebra graphing (Hướng A). */

export const GRAPH_PRESETS = [
  {
    id: 'linear',
    name: 'Bậc nhất y = ax + b',
    description: 'Đường thẳng, giao trục, hệ PT',
    commands: `# Đồ thị bậc nhất
f(x) = 2x - 1
A = Intersect(f, xAxis)
B = Intersect(f, yAxis)
SetCaption(A, "A")
SetCaption(B, "B")`,
  },
  {
    id: 'quadratic',
    name: 'Bậc hai y = ax² + bx + c',
    description: 'Parabol, đỉnh, nghiệm',
    commands: `# Parabol
f(x) = x^2 - 4x + 3
V = Vertex(f)
SetCaption(V, "V")
SetVisible(Vertex(f), true)`,
  },
  {
    id: 'cubic',
    name: 'Bậc ba y = ax³ + …',
    description: 'Cực trị, điểm uốn',
    commands: `# Bậc ba
f(x) = x^3 - 3x
A = Extremum(f, 1)
B = Extremum(f, 2)
SetCaption(A, "CĐ")
SetCaption(B, "CT")`,
  },
  {
    id: 'rational',
    name: 'Hàm phân thức',
    description: 'Tiệm cận đứng / ngang',
    commands: `# Phân thức
f(x) = (2x + 1) / (x - 2)
Asymptote(f, 1)
Asymptote(f, 2)`,
  },
  {
    id: 'trig',
    name: 'Lượng giác sin/cos',
    description: 'Chu kỳ, biên độ',
    commands: `# Lượng giác
f(x) = sin(x)
g(x) = cos(x)
SetColor(f, "blue")
SetColor(g, "red")`,
  },
  {
    id: 'extreme',
    name: 'Cực trị — khảo sát',
    description: 'Max/min trên đoạn',
    commands: `# Cực trị trên [a,b]
f(x) = -x^2 + 4x + 1
a = 0
b = 5
M = Max(f, a, b)
m = Min(f, a, b)
SetCaption(M, "Max")
SetCaption(m, "Min")`,
  },
]

export function getGraphPreset(id) {
  return GRAPH_PRESETS.find((p) => p.id === id) || null
}
