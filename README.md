# CYK Parsing Algorithm: Cocke–Younger–Kasami Dynamic Programming

> **Department:** Computer Science and Engineering with Artificial Intelligence and Machine Learning (CSE AIML)  
> **Course:** Theory of Computation (CM24034)  
> **Topic:** Formal Languages & Automata Theory / Dynamic Programming Parsing  
> **Technology Stack:** HTML5, CSS3, Vanilla JavaScript (Zero external dependencies, 100% offline & GitHub Pages compatible)

---

## 1. Project Title
**CYK Parsing Algorithm: Cocke–Younger–Kasami Dynamic Programming Parser**

An interactive, browser-based dynamic programming visualizer and parser that determines whether a target string can be derived from a Context-Free Grammar (CFG) in Chomsky Normal Form (CNF), generating the complete triangular DP table, boolean validation matrix, step-by-step split evaluations, and mathematical derivations.

---

## 2. Problem Statement
Given:
1. A Context-Free Grammar $G = (V, \Sigma, R, S)$ transformed into **Chomsky Normal Form (CNF)**, where all production rules are strictly of the form:
   - $A \to BC$ (Binary non-terminal production, where $A, B, C \in V$)
   - $A \to a$ (Terminal production, where $A \in V$ and $a \in \Sigma$)
2. An arbitrary input string $w = c_0 c_1 \dots c_{n-1}$ of length $n$ over the alphabet $\Sigma$.

**Goal:**  
Determine whether $w \in L(G)$ (i.e., whether the start symbol $S$ can generate string $w$). A naive recursive parsing approach requires exponential time $O(2^n)$ due to overlapping substring parses. The CYK algorithm applies **dynamic programming** to solve the membership problem in polynomial time $O(n^3 \cdot |P|)$.

---

## 3. Objective
- Provide a clean, robust, and mathematically accurate implementation of the Cocke–Younger–Kasami (CYK) dynamic programming algorithm.
- Dynamically compute all subproblem derivations for any user-provided CNF grammar and target string.
- Render the authentic dynamic programming **Triangular Table** ($V[i][j]$ pyramid) and coordinate matrix ($T[i][j]$).
- Render a **Boolean Validation Matrix** indicating substring derivability from the start symbol $S$.
- Provide an interactive **Cell Inspector** that reveals the exact split positions $k$, left and right subproblem variables, and production rules applied.
- Present a step-by-step execution trace explaining the algorithm progression from length $1$ to length $n$.
- Offer educational tools: flowchart visualization, formal algorithm definition, pseudocode, asymptotic complexity analysis, CSV export, and academic print-ready reports.

---

## 4. CYK Algorithm

### Theoretical Foundation
The CYK algorithm relies on two fundamental dynamic programming principles:
1. **Optimal Substructure:**  
   If a non-terminal $A$ derives substring $w[i..j]$ via rule $A \to BC$, there exists an integer partition index $k$ ($i \le k < j$) such that $B$ derives $w[i..k]$ and $C$ derives $w[k+1..j]$.
2. **Overlapping Subproblems:**  
   The same substring $w[i..k]$ is evaluated across multiple candidate derivations for larger substrings. Storing the set of generating variables in a memoization table eliminates redundant recalculations.

### Algorithm Steps: $\text{CYK}(G, w)$
1. **Table Construction:**  
   Initialize a 2D table $T[n][n]$, where each cell $T[i][j]$ stores a set of non-terminals capable of generating substring $w[i..j]$.
2. **Base Case (Substrings of Length 1):**  
   For each character $w[i]$ ($0 \le i < n$):
   $$T[i][i] = \{ A \in V \mid A \to w[i] \in R \}$$
3. **Inductive Step (Substrings of Length $l = 2$ to $n$):**  
   For each length $l \in [2 \dots n]$:
   - For each start index $i \in [0 \dots n-l]$, with end index $j = i + l - 1$:
     - For each split position $k \in [i \dots j-1]$:
       $$T[i][j] = T[i][j] \cup \{ A \in V \mid A \to BC \in R, B \in T[i][k], C \in T[k+1][j] \}$$
4. **Decision:**  
   The string $w$ is **ACCEPTED** if and only if:
   $$S \in T[0][n-1]$$
   Otherwise, the string is **REJECTED**.

---

## 5. Input Format

### Grammar Format (Chomsky Normal Form)
- One rule per line or pipe `|` separated for alternative productions.
- Arrow can be `->`, `→`, or `=>`.
- Non-terminals are uppercase letters: `S, A, B, C, ...`
- Terminals are lowercase characters, digits, or symbols: `a, b, 0, 1, +, ...`
- The **Start Symbol** is automatically inferred as the LHS non-terminal of the first rule.

**Valid Rule Examples:**
```
S -> AB
S -> BC
A -> BA
A -> a
B -> CC
B -> b
C -> AB
C -> a
```
*Or pipe syntax:*
```
S -> AB | BC
A -> BA | a
B -> CC | b
C -> AB | a
```

### String Format
- Arbitrary sequence of terminal characters matching the grammar's alphabet (e.g., `baaba`, `ab`, `a+a`).

---

## 6. Output Format

1. **Validation Status:** Checkmark indicators confirming CNF compliance, symbol integrity, and start variable assignment.
2. **Grammar Summary:** Start symbol $S$, Non-terminal set $V$, Terminal set $\Sigma$, rule count $|P|$, target string $w$, and string length $n$.
3. **Dynamic Result Banner:** Clear `✓ STRING ACCEPTED` or `✗ STRING REJECTED` decision with mathematical justification ($S \in T[0][n-1]$ or $S \notin T[0][n-1]$).
4. **CYK Triangular Table:**
   - Interactive pyramid with apex $T[0][n-1]$ at the top down to length 1 at the base.
   - Coordinate matrix view ($i \times j$).
   - Interactive Cell Inspector showing substrings, indices, variables, and split reasons.
5. **Boolean Validation Matrix:** Table displaying `TRUE`/`FALSE` states indicating whether each substring is derivable from $S$.
6. **Step-by-Step Execution Trace:** Complete chronological expansion showing splits, candidate variable pairs, and matching rules.
7. **CSV Export:** Downloadable spreadsheet with cell coordinates, substrings, and variable sets.

---

## 7. Example Walkthrough

### Grammar:
```
S -> AB | BC
A -> BA | a
B -> CC | b
C -> AB | a
```
### Input String:
`baaba` ($n = 5$)

### Triangular DP Table ($V[i][j]$):
```
Length 5 (w[0..4]):                     {A, C, S}
Length 4 (w[0..3], w[1..4]):       ∅              {A, C, S}
Length 3 (w[0..2]..):          ∅           {B}           {B}
Length 2 (w[0..1]..):      {A, S}         {B}         {C, S}        {A, S}
Length 1 (w[0..0]..):       {B}          {A, C}       {A, C}         {B}         {A, C}
Terminal base:               b             a            a             b            a
```

### Decision:
Since the start symbol $S \in V[0][4] = \{A, C, S\}$, the string `baaba` is **ACCEPTED**.

---

## 8. Complexity Analysis

### Time Complexity: $\mathcal{O}(n^3 \cdot |P|)$
- **Outer loop:** Substring length $l$ runs from $2$ to $n$ $\implies n$ iterations.
- **Middle loop:** Start position $i$ runs from $0$ to $n-l$ $\implies n$ iterations.
- **Inner loop:** Split partition $k$ runs from $i$ to $j-1$ $\implies n$ iterations.
- **Rule matching:** In the innermost step, checking whether Cartesian product combinations $B \in T[i][k]$ and $C \in T[k+1][j]$ form a valid rule $A \to BC$ takes at most $\mathcal{O}(|P|)$ operations.
- **Total Time:** $\mathcal{O}(n^3 \cdot |P|)$.

### Space Complexity: $\mathcal{O}(n^2 \cdot |V|)$
- The triangular table stores $n(n+1)/2$ cells.
- Each cell contains a subset of variables from $V$, bounded by $|V|$.
- **Total Space:** $\mathcal{O}(n^2 \cdot |V|)$.

---

## 9. How to Run Locally

Because the project is written in standard HTML5, CSS3, and Vanilla JavaScript with zero dependencies:

### Method 1: Direct File Open
Simply double-click `index.html` or open it in any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).

### Method 2: Local HTTP Server (Optional)
Using Python:
```bash
# Python 3
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

Using Node.js:
```bash
npx serve .
```

---

## 10. How to Deploy on GitHub Pages

1. **Initialize Git Repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit of CYK Parsing Algorithm DAA project"
   ```
2. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/<your-username>/cyk-parser.git
   git branch -M main
   git push -u origin main
   ```
3. **Enable GitHub Pages:**
   - In your GitHub repository, go to **Settings** $\to$ **Pages**.
   - Under **Build and deployment** $\to$ **Source**, choose **Deploy from a branch**.
   - Select branch `main` and folder `/ (root)`.
   - Click **Save**.
4. Your CYK parser website will be live at:
   `https://<your-username>.github.io/cyk-parser/`

---

## Project Structure
```
cyk-parser/
├── index.html       # Academic HTML5 UI with all 14 sections, flowchart, pseudocode, and controls
├── style.css        # Academic dark blue theme, responsive grid, badges, and @media print
├── script.js        # CNF validator, CYK DP engine, trace generator, and CSV exporter
└── README.md        # Comprehensive DAA project documentation
```
