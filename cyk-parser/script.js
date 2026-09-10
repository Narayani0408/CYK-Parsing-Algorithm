/**
 * CYK Parsing Algorithm (Cocke–Younger–Kasami)
 * Design and Analysis of Algorithms (DAA) Mini-Project
 * 
 * Dynamic Programming parser for Context-Free Grammars in Chomsky Normal Form (CNF)
 * Vanilla JavaScript - No external dependencies - Browser & GitHub Pages compatible
 */

// ============================================================================
// 1. PRESET EXAMPLES
// ============================================================================
const PRESETS = {
  example1: {
    name: "Example 1: Basic Accepted (ab)",
    grammar: `S -> AB\nA -> a\nB -> b`,
    string: "ab",
    description: "Simple CNF grammar deriving 'ab'. Length 2 string."
  },
  example2: {
    name: "Example 2: Basic Rejected (aa)",
    grammar: `S -> AB\nA -> a\nB -> b`,
    string: "aa",
    description: "Same grammar tested on 'aa'. Rejected because S cannot derive AA."
  },
  example3: {
    name: "Example 3: Classic DAA Textbook (baaba)",
    grammar: `S -> AB
S -> BC
A -> BA
A -> a
B -> CC
B -> b
C -> AB
C -> a`,
    string: "baaba",
    description: "Standard Hopcroft/Ullman textbook example. Length 5 string yielding apex {S, A}."
  },
  example4: {
    name: "Example 4: Arithmetic Expressions (a+a)",
    grammar: `E -> E A
E -> a
A -> P E
P -> +`,
    string: "a+a",
    description: "Binary addition expression grammar in CNF deriving 'a+a'."
  }
};

// ============================================================================
// 2. GRAMMAR PARSER & CNF VALIDATOR
// ============================================================================
class CNFValidator {
  /**
   * Parse and validate grammar text and input string
   * @param {string} grammarText 
   * @param {string} inputString 
   * @returns {Object} Validation report and parsed components
   */
  static validate(grammarText, inputString) {
    const report = {
      isValid: false,
      grammarEmpty: false,
      stringEmpty: false,
      formatValid: true,
      isCNF: true,
      symbolsValid: true,
      errors: [],
      warnings: [],
      startSymbol: null,
      nonTerminals: new Set(),
      terminals: new Set(),
      productions: [], // Array of { id, lhs, rhs: string[], isTerminal: boolean, raw: string, line: number }
      nonTerminalRules: new Map(), // LHS -> Array of RHS (array of tokens)
      terminalRules: new Map(),    // Terminal char -> Set of LHS variables
      binaryRules: new Map()       // "B C" -> Set of LHS variables (for O(1) lookup during DP)
    };

    // Check empty grammar
    if (!grammarText || grammarText.trim().length === 0) {
      report.grammarEmpty = true;
      report.errors.push("Grammar input cannot be empty.");
      return report;
    }

    // Check empty string
    const cleanString = inputString ? inputString.trim() : "";
    if (cleanString.length === 0) {
      report.stringEmpty = true;
      report.errors.push("Input string cannot be empty.");
    }

    const lines = grammarText.split(/\r?\n/);
    let ruleIndex = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      let line = lines[lineNum].trim();
      // Ignore empty lines and comments (# or //)
      if (!line || line.startsWith("#") || line.startsWith("//")) continue;

      // Handle arrow symbols -> or → or =>
      let arrow = null;
      if (line.includes("->")) arrow = "->";
      else if (line.includes("→")) arrow = "→";
      else if (line.includes("=>")) arrow = "=>";

      if (!arrow) {
        report.formatValid = false;
        report.errors.push(`Line ${lineNum + 1}: Missing production arrow '->' or '→'. Found: "${line}"`);
        continue;
      }

      const parts = line.split(arrow);
      if (parts.length !== 2) {
        report.formatValid = false;
        report.errors.push(`Line ${lineNum + 1}: Multiple arrows detected in rule: "${line}"`);
        continue;
      }

      const lhs = parts[0].trim();
      const rhsPart = parts[1].trim();

      // Validate LHS: single non-terminal variable (capital letter or letter+subscript)
      if (!/^[A-Z][0-9]*$/.test(lhs)) {
        report.formatValid = false;
        report.isCNF = false;
        report.errors.push(`Line ${lineNum + 1}: Invalid LHS non-terminal '${lhs}'. Variables must start with an uppercase letter (e.g. S, A, B, C).`);
        continue;
      }

      // Record first LHS variable as Start Symbol
      if (!report.startSymbol) {
        report.startSymbol = lhs;
      }
      report.nonTerminals.add(lhs);

      // Support pipe '|' separating multiple alternative productions on the same line
      const alternatives = rhsPart.split("|").map(alt => alt.trim()).filter(alt => alt.length > 0);

      if (alternatives.length === 0) {
        report.formatValid = false;
        report.isCNF = false;
        report.errors.push(`Line ${lineNum + 1}: Empty RHS for rule '${lhs} ->' (Epsilon / empty rules are not allowed in CNF).`);
        continue;
      }

      for (const alt of alternatives) {
        ruleIndex++;
        // Check for epsilon representations
        if (alt === "ε" || alt === "eps" || alt === "epsilon" || alt === "λ") {
          report.isCNF = false;
          report.errors.push(`Line ${lineNum + 1}: Epsilon production '${lhs} -> ${alt}' is not permitted in Chomsky Normal Form.`);
          continue;
        }

        // Determine if RHS is terminal or binary non-terminal
        let tokens = alt.split(/\s+/).filter(t => t.length > 0);

        // If user typed contiguous e.g. "AB" without spaces
        if (tokens.length === 1 && tokens[0].length === 2 && /^[A-Z]{2}$/.test(tokens[0])) {
          tokens = [tokens[0][0], tokens[0][1]];
        }

        // Case A: Terminal Production A -> a
        if (tokens.length === 1) {
          const sym = tokens[0];
          // Check if it's a single terminal character (lowercase letter, digit, or symbol, not an uppercase variable)
          if (sym.length === 1 && !/^[A-Z]$/.test(sym)) {
            report.terminals.add(sym);
            const prod = {
              id: ruleIndex,
              lhs,
              rhs: [sym],
              isTerminal: true,
              raw: `${lhs} -> ${sym}`,
              line: lineNum + 1
            };
            report.productions.push(prod);

            if (!report.terminalRules.has(sym)) {
              report.terminalRules.set(sym, new Set());
            }
            report.terminalRules.get(sym).add(lhs);
            continue;
          } else if (sym.length === 1 && /^[A-Z]$/.test(sym)) {
            // Unit production A -> B (Invalid in CNF)
            report.isCNF = false;
            report.errors.push(`Line ${lineNum + 1}: Unit production '${lhs} -> ${sym}' violates CNF. Unit productions (A → B) are not allowed.`);
            continue;
          } else {
            // Multiple characters or invalid terminal
            report.isCNF = false;
            report.errors.push(`Line ${lineNum + 1}: Production '${lhs} -> ${alt}' violates CNF. Must be exactly one terminal (e.g. 'a') or two variables (e.g. 'AB').`);
            continue;
          }
        }

        // Case B: Binary Variable Production A -> B C
        if (tokens.length === 2) {
          const [B, C] = tokens;
          const isBVar = /^[A-Z][0-9]*$/.test(B);
          const isCVar = /^[A-Z][0-9]*$/.test(C);

          if (isBVar && isCVar) {
            report.nonTerminals.add(B);
            report.nonTerminals.add(C);
            const prod = {
              id: ruleIndex,
              lhs,
              rhs: [B, C],
              isTerminal: false,
              raw: `${lhs} -> ${B}${C}`,
              line: lineNum + 1
            };
            report.productions.push(prod);

            const key = `${B} ${C}`;
            if (!report.binaryRules.has(key)) {
              report.binaryRules.set(key, new Set());
            }
            report.binaryRules.get(key).add(lhs);
            continue;
          } else {
            report.isCNF = false;
            report.errors.push(`Line ${lineNum + 1}: Production '${lhs} -> ${alt}' has non-variables. In CNF, binary rules must have two uppercase variables (e.g. A → BC).`);
            continue;
          }
        }

        // Case C: > 2 tokens (Ternary or larger)
        if (tokens.length > 2) {
          report.isCNF = false;
          report.errors.push(`Line ${lineNum + 1}: Production '${lhs} -> ${alt}' has ${tokens.length} RHS symbols. CNF requires strictly 2 variables or 1 terminal.`);
          continue;
        }
      }
    }

    // Validate input string characters against grammar terminals
    if (cleanString.length > 0) {
      for (let i = 0; i < cleanString.length; i++) {
        const char = cleanString[i];
        if (!report.terminals.has(char)) {
          report.symbolsValid = false;
          report.errors.push(`Input character '${char}' at index ${i + 1} does not appear as a terminal in any grammar production.`);
        }
      }
    }

    report.isValid = (
      !report.grammarEmpty &&
      !report.stringEmpty &&
      report.formatValid &&
      report.isCNF &&
      report.symbolsValid &&
      report.errors.length === 0
    );

    return report;
  }
}

// ============================================================================
// 3. CYK DYNAMIC PROGRAMMING ENGINE
// ============================================================================
class CYKEngine {
  /**
   * Run the Cocke-Younger-Kasami Dynamic Programming algorithm
   * @param {Object} grammarReport Validated grammar object from CNFValidator
   * @param {string} inputString The string to parse
   * @returns {Object} Complete CYK execution result with tables, derivations, and trace
   */
  static execute(grammarReport, inputString) {
    const w = inputString.trim();
    const n = w.length;
    const startSymbol = grammarReport.startSymbol;

    // 2D Array DP Table: table[i][j] holds Set of non-terminal symbols
    // 0 <= i <= j < n
    const table = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => new Set())
    );

    // Rich metadata structure for inspector and step explanations
    const metadata = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => null)
    );

    // Execution trace array grouped by substring length l
    const executionTrace = [];

    // ------------------------------------------------------------------------
    // STEP 1: Base Case — Substrings of Length 1 (Terminal Rules A -> a)
    // ------------------------------------------------------------------------
    const length1Steps = {
      length: 1,
      title: "Step 1: Base Case — Terminal Productions (Substrings of Length 1)",
      description: "For each single character w[i], find all variables A such that A → w[i].",
      cells: []
    };

    for (let i = 0; i < n; i++) {
      const char = w[i];
      const matchingVars = grammarReport.terminalRules.get(char) || new Set();
      const derivations = [];

      for (const A of matchingVars) {
        table[i][i].add(A);
        derivations.push({
          variable: A,
          rule: `${A} -> ${char}`,
          terminal: char,
          type: "terminal"
        });
      }

      const cellInfo = {
        i,
        j: i,
        length: 1,
        substring: char,
        variables: Array.from(table[i][i]).sort(),
        derivations,
        splits: [],
        containsStart: table[i][i].has(startSymbol)
      };

      metadata[i][i] = cellInfo;
      length1Steps.cells.push(cellInfo);
    }
    executionTrace.push(length1Steps);

    // ------------------------------------------------------------------------
    // STEP 2 to n: Inductive Step — Substrings of Length l (2 to n)
    // ------------------------------------------------------------------------
    for (let l = 2; l <= n; l++) {
      const lengthSteps = {
        length: l,
        title: `Step ${l}: Substrings of Length ${l}`,
        description: `Examine all substrings of length ${l}, evaluating all possible split points k.`,
        cells: []
      };

      for (let i = 0; i <= n - l; i++) {
        const j = i + l - 1;
        const subStr = w.substring(i, j + 1);
        const cellDerivations = [];
        const splitEvaluations = [];

        // Try every split position k from i to j-1
        for (let k = i; k < j; k++) {
          const leftCell = { i, j: k, substring: w.substring(i, k + 1), vars: Array.from(table[i][k]).sort() };
          const rightCell = { i: k + 1, j, substring: w.substring(k + 1, j + 1), vars: Array.from(table[k + 1][j]).sort() };
          const pairsChecked = [];
          const matchesInSplit = [];

          for (const B of table[i][k]) {
            for (const C of table[k + 1][j]) {
              const pairKey = `${B} ${C}`;
              const matchingVars = grammarReport.binaryRules.get(pairKey);

              if (matchingVars && matchingVars.size > 0) {
                for (const A of matchingVars) {
                  table[i][j].add(A);
                  const deriv = {
                    variable: A,
                    rule: `${A} -> ${B}${C}`,
                    splitK: k,
                    splitPosition1Based: `${i + 1}..${k + 1} | ${k + 2}..${j + 1}`,
                    leftVar: B,
                    rightVar: C,
                    leftSubstring: leftCell.substring,
                    rightSubstring: rightCell.substring,
                    leftCoords: `[${i}, ${k}]`,
                    rightCoords: `[${k + 1}, ${j}]`,
                    type: "binary"
                  };
                  cellDerivations.push(deriv);
                  matchesInSplit.push(deriv);
                  pairsChecked.push({ pair: `${B}${C}`, match: true, rule: `${A} -> ${B}${C}` });
                }
              } else {
                pairsChecked.push({ pair: `${B}${C}`, match: false });
              }
            }
          }

          splitEvaluations.push({
            splitIndex: k,
            splitOffset: k - i + 1,
            leftCell,
            rightCell,
            pairsChecked,
            matches: matchesInSplit
          });
        }

        const cellInfo = {
          i,
          j,
          length: l,
          substring: subStr,
          variables: Array.from(table[i][j]).sort(),
          derivations: cellDerivations,
          splits: splitEvaluations,
          containsStart: table[i][j].has(startSymbol)
        };

        metadata[i][j] = cellInfo;
        lengthSteps.cells.push(cellInfo);
      }
      executionTrace.push(lengthSteps);
    }

    // ------------------------------------------------------------------------
    // FINAL RESULT & BOOLEAN MATRIX
    // ------------------------------------------------------------------------
    const finalVariables = Array.from(table[0][n - 1]).sort();
    const isAccepted = table[0][n - 1].has(startSymbol);

    // Build Boolean Matrix: boolMatrix[i][j] = table[i][j].has(startSymbol)
    const boolMatrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (j >= i ? table[i][j].has(startSymbol) : null))
    );

    return {
      inputString: w,
      length: n,
      startSymbol,
      table,
      metadata,
      boolMatrix,
      isAccepted,
      finalVariables,
      executionTrace,
      grammarSummary: {
        startSymbol,
        nonTerminals: Array.from(grammarReport.nonTerminals).sort(),
        terminals: Array.from(grammarReport.terminals).sort(),
        productions: grammarReport.productions
      }
    };
  }
}

// ============================================================================
// 4. UI CONTROLLER & DOM RENDERING
// ============================================================================
class CYKApp {
  constructor() {
    this.currentResult = null;
    this.selectedCellCoords = null;

    // DOM Elements
    this.grammarInput = document.getElementById("grammarInput");
    this.stringInput = document.getElementById("stringInput");
    this.btnRun = document.getElementById("btnRun");
    this.btnReset = document.getElementById("btnReset");
    this.btnClear = document.getElementById("btnClear");
    this.validationCard = document.getElementById("validationCard");
    this.validationList = document.getElementById("validationList");

    // Output Sections
    this.outputSection = document.getElementById("outputSection");
    this.summaryCard = document.getElementById("summaryCard");
    this.resultBanner = document.getElementById("resultBanner");
    this.pyramidContainer = document.getElementById("pyramidContainer");
    this.matrixContainer = document.getElementById("matrixContainer");
    this.booleanMatrixContainer = document.getElementById("booleanMatrixContainer");
    this.cellInspector = document.getElementById("cellInspector");
    this.traceAccordion = document.getElementById("traceAccordion");

    // Buttons & Toggles
    this.viewPyramidBtn = document.getElementById("viewPyramidBtn");
    this.viewMatrixBtn = document.getElementById("viewMatrixBtn");
    this.btnPrint = document.getElementById("btnPrint");
    this.btnDownloadCSV = document.getElementById("btnDownloadCSV");
    this.presetSelect = document.getElementById("presetSelect");

    this.bindEvents();
  }

  bindEvents() {
    this.btnRun.addEventListener("click", () => this.handleRun());
    this.btnReset.addEventListener("click", () => this.handleReset());
    this.btnClear.addEventListener("click", () => this.handleClear());

    if (this.presetSelect) {
      this.presetSelect.addEventListener("change", (e) => {
        if (e.target.value && PRESETS[e.target.value]) {
          this.loadPreset(e.target.value);
        }
      });
    }

    // Quick Preset Buttons
    document.querySelectorAll("[data-preset]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const presetKey = e.currentTarget.getAttribute("data-preset");
        this.loadPreset(presetKey);
      });
    });

    // View Switchers (Pyramid vs Matrix)
    if (this.viewPyramidBtn && this.viewMatrixBtn) {
      this.viewPyramidBtn.addEventListener("click", () => {
        this.viewPyramidBtn.classList.add("active");
        this.viewMatrixBtn.classList.remove("active");
        this.pyramidContainer.classList.remove("hidden");
        this.matrixContainer.classList.add("hidden");
      });

      this.viewMatrixBtn.addEventListener("click", () => {
        this.viewMatrixBtn.classList.add("active");
        this.viewPyramidBtn.classList.remove("active");
        this.matrixContainer.classList.remove("hidden");
        this.pyramidContainer.classList.add("hidden");
      });
    }

    // Export buttons
    if (this.btnPrint) {
      this.btnPrint.addEventListener("click", () => window.print());
    }

    if (this.btnDownloadCSV) {
      this.btnDownloadCSV.addEventListener("click", () => this.exportCSV());
    }

    // Step-by-Step Expand/Collapse All
    const btnExpandAll = document.getElementById("btnExpandAll");
    const btnCollapseAll = document.getElementById("btnCollapseAll");
    if (btnExpandAll && btnCollapseAll) {
      btnExpandAll.addEventListener("click", () => {
        document.querySelectorAll(".step-accordion-item").forEach(el => el.classList.add("open"));
      });
      btnCollapseAll.addEventListener("click", () => {
        document.querySelectorAll(".step-accordion-item").forEach(el => el.classList.remove("open"));
      });
    }
  }

  loadPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    this.grammarInput.value = preset.grammar;
    this.stringInput.value = preset.string;
    if (this.presetSelect) this.presetSelect.value = presetKey;
    this.handleRun();
  }

  handleClear() {
    this.grammarInput.value = "";
    this.stringInput.value = "";
    this.validationCard.classList.add("hidden");
    this.outputSection.classList.add("hidden");
    this.currentResult = null;
    this.selectedCellCoords = null;
  }

  handleReset() {
    this.loadPreset("example3");
  }

  handleRun() {
    const grammarText = this.grammarInput.value;
    const inputString = this.stringInput.value.trim();

    // 1. Validate Grammar and Input String
    const validation = CNFValidator.validate(grammarText, inputString);
    this.renderValidation(validation);

    if (!validation.isValid) {
      this.outputSection.classList.add("hidden");
      this.currentResult = null;
      return;
    }

    // 2. Execute CYK Algorithm
    const result = CYKEngine.execute(validation, inputString);
    this.currentResult = result;

    // 3. Render all UI sections
    this.outputSection.classList.remove("hidden");
    this.renderGrammarSummary(result.grammarSummary, result.inputString);
    this.renderResultBanner(result);
    this.renderCYKPyramid(result);
    this.renderCYKMatrix(result);
    this.renderBooleanMatrix(result);
    this.renderStepByStep(result);

    // Auto-select apex cell (0, n-1) for initial inspection
    this.inspectCell(0, result.length - 1);

    // Scroll smoothly to result banner
    this.resultBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // --------------------------------------------------------------------------
  // VALIDATION RENDERING
  // --------------------------------------------------------------------------
  renderValidation(val) {
    this.validationCard.classList.remove("hidden");
    let html = "";

    if (val.isValid) {
      this.validationCard.className = "card validation-card valid-state";
      html += `
        <div class="validation-status-header">
          <span class="status-icon success-icon">✓</span>
          <strong>Grammar & String Validation Passed</strong>
        </div>
        <ul class="validation-checklist">
          <li><span class="check-mark">✓</span> Grammar format is well-formed</li>
          <li><span class="check-mark">✓</span> All productions adhere strictly to Chomsky Normal Form (CNF)</li>
          <li><span class="check-mark">✓</span> Start symbol identified: <code>${val.startSymbol}</code></li>
          <li><span class="check-mark">✓</span> Input characters exist in grammar terminals: <code>${Array.from(val.terminals).join(", ")}</code></li>
          <li><span class="check-mark">✓</span> Ready to execute Dynamic Programming CYK parser</li>
        </ul>
      `;
    } else {
      this.validationCard.className = "card validation-card invalid-state";
      html += `
        <div class="validation-status-header">
          <span class="status-icon error-icon">✗</span>
          <strong>Validation Failed — Unable to Execute CYK</strong>
        </div>
        <div class="validation-error-list">
          <p class="error-lead">Please correct the following errors before running the algorithm:</p>
          <ul>
            ${val.errors.map(err => `<li><span class="cross-mark">✗</span> ${escapeHTML(err)}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    this.validationList.innerHTML = html;
  }

  // --------------------------------------------------------------------------
  // GRAMMAR SUMMARY RENDERING
  // --------------------------------------------------------------------------
  renderGrammarSummary(summary, inputString) {
    const startSymbolEl = document.getElementById("summaryStartSymbol");
    const nonTerminalsEl = document.getElementById("summaryNonTerminals");
    const terminalsEl = document.getElementById("summaryTerminals");
    const productionsCountEl = document.getElementById("summaryProdCount");
    const stringEl = document.getElementById("summaryString");
    const stringLenEl = document.getElementById("summaryStringLen");
    const productionsListEl = document.getElementById("summaryProductionsList");

    if (startSymbolEl) startSymbolEl.textContent = summary.startSymbol;
    if (nonTerminalsEl) nonTerminalsEl.textContent = `{ ${summary.nonTerminals.join(", ")} }`;
    if (terminalsEl) terminalsEl.textContent = `{ ${summary.terminals.join(", ")} }`;
    if (productionsCountEl) productionsCountEl.textContent = `${summary.productions.length} rules`;
    if (stringEl) stringEl.textContent = `"${inputString}"`;
    if (stringLenEl) stringLenEl.textContent = inputString.length;

    if (productionsListEl) {
      productionsListEl.innerHTML = summary.productions.map(p => `
        <span class="prod-badge"><code>${p.lhs} → ${p.rhs.join("")}</code></span>
      `).join(" ");
    }
  }

  // --------------------------------------------------------------------------
  // RESULT BANNER RENDERING
  // --------------------------------------------------------------------------
  renderResultBanner(result) {
    const isAccepted = result.isAccepted;
    const finalSet = result.finalVariables.length > 0
      ? `{ ${result.finalVariables.join(", ")} }`
      : `∅ (Empty Set)`;

    const bannerClass = isAccepted ? "result-banner accepted" : "result-banner rejected";
    const statusIcon = isAccepted ? "✓" : "✗";
    const statusTitle = isAccepted ? "STRING ACCEPTED" : "STRING REJECTED";
    const statusSubtitle = isAccepted
      ? `The input string "${result.inputString}" can be generated by the Context-Free Grammar.`
      : `The input string "${result.inputString}" cannot be generated by the Context-Free Grammar.`;

    const mathExplanation = isAccepted
      ? `Start symbol <strong>${result.startSymbol}</strong> ∈ V[0][${result.length - 1}] = <code>${finalSet}</code>`
      : `Start symbol <strong>${result.startSymbol}</strong> ∉ V[0][${result.length - 1}] = <code>${finalSet}</code>`;

    this.resultBanner.className = bannerClass;
    this.resultBanner.innerHTML = `
      <div class="result-icon-container">
        <div class="result-status-icon">${statusIcon}</div>
      </div>
      <div class="result-content">
        <div class="result-badge-row">
          <span class="badge ${isAccepted ? 'badge-accepted' : 'badge-rejected'}">${statusTitle}</span>
          <span class="result-dp-cell">Apex Cell V[0][${result.length - 1}]: <code>${finalSet}</code></span>
        </div>
        <h2 class="result-title">${statusTitle}</h2>
        <p class="result-subtitle">${statusSubtitle}</p>
        <div class="result-math-reason">
          <span class="math-icon">ℹ</span>
          <span>Mathematical Conclusion: ${mathExplanation}.</span>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // CYK TRIANGULAR PYRAMID RENDERING
  // --------------------------------------------------------------------------
  renderCYKPyramid(result) {
    const n = result.length;
    const w = result.inputString;
    let html = `<div class="cyk-pyramid">`;

    // Row l goes from n down to 1 (Length n at apex, length 1 at base)
    for (let l = n; l >= 1; l--) {
      html += `<div class="pyramid-row" data-length="${l}">`;
      html += `<div class="pyramid-row-label">l = ${l}</div>`;
      html += `<div class="pyramid-cells-wrap">`;

      for (let i = 0; i <= n - l; i++) {
        const j = i + l - 1;
        const cellData = result.metadata[i][j];
        const vars = cellData.variables;
        const hasStart = cellData.containsStart;
        const isApex = (i === 0 && j === n - 1);
        const varsDisplay = vars.length > 0 ? `{${vars.join(", ")}}` : `∅`;

        let cellClasses = "cyk-cell";
        if (isApex) cellClasses += " apex-cell";
        if (hasStart) cellClasses += " has-start";
        if (vars.length === 0) cellClasses += " empty-cell";

        html += `
          <button type="button" class="${cellClasses}" data-i="${i}" data-j="${j}" title="Click to inspect cell V[${i}][${j}] (indices ${i + 1}..${j + 1})">
            <div class="cell-coords">V[${i}][${j}]</div>
            <div class="cell-vars">${varsDisplay}</div>
            <div class="cell-substr">"${escapeHTML(cellData.substring)}"</div>
          </button>
        `;
      }

      html += `</div></div>`;
    }

    // Terminal string base row below length 1
    html += `<div class="pyramid-row pyramid-base-row">`;
    html += `<div class="pyramid-row-label">w[i]</div>`;
    html += `<div class="pyramid-cells-wrap">`;
    for (let i = 0; i < n; i++) {
      html += `
        <div class="terminal-char-cell" title="Input character at position ${i + 1}">
          <div class="char-pos">i = ${i} (pos ${i + 1})</div>
          <div class="char-val"><strong>${escapeHTML(w[i])}</strong></div>
        </div>
      `;
    }
    html += `</div></div>`;

    html += `</div>`;
    this.pyramidContainer.innerHTML = html;

    // Attach click listeners to pyramid cells
    this.pyramidContainer.querySelectorAll(".cyk-cell").forEach(cellBtn => {
      cellBtn.addEventListener("click", (e) => {
        const i = parseInt(e.currentTarget.getAttribute("data-i"), 10);
        const j = parseInt(e.currentTarget.getAttribute("data-j"), 10);
        this.inspectCell(i, j);
      });
    });
  }

  // --------------------------------------------------------------------------
  // CYK MATRIX GRID RENDERING (Alternative view)
  // --------------------------------------------------------------------------
  renderCYKMatrix(result) {
    const n = result.length;
    let html = `
      <div class="matrix-table-responsive">
        <table class="academic-table cyk-matrix-table">
          <thead>
            <tr>
              <th class="matrix-corner">Start \\ End</th>
    `;

    for (let j = 0; j < n; j++) {
      html += `<th>j = ${j} <br><span class="table-sublabel">("${result.inputString[j]}")</span></th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let i = 0; i < n; i++) {
      html += `<tr><th>i = ${i} <br><span class="table-sublabel">("${result.inputString[i]}")</span></th>`;
      for (let j = 0; j < n; j++) {
        if (j < i) {
          html += `<td class="matrix-unused">—</td>`;
        } else {
          const cellData = result.metadata[i][j];
          const vars = cellData.variables;
          const varsDisplay = vars.length > 0 ? `{${vars.join(", ")}}` : `∅`;
          const isApex = (i === 0 && j === n - 1);
          let cellClass = "matrix-cell";
          if (cellData.containsStart) cellClass += " matrix-has-start";
          if (isApex) cellClass += " matrix-apex";

          html += `
            <td class="${cellClass}" data-i="${i}" data-j="${j}">
              <div class="m-cell-content">
                <span class="m-cell-vars">${varsDisplay}</span>
                <span class="m-cell-sub">"${escapeHTML(cellData.substring)}"</span>
              </div>
            </td>
          `;
        }
      }
      html += `</tr>`;
    }

    html += `</tbody></table></div>`;
    this.matrixContainer.innerHTML = html;

    // Attach click listeners to matrix cells
    this.matrixContainer.querySelectorAll(".matrix-cell").forEach(td => {
      td.addEventListener("click", (e) => {
        const i = parseInt(e.currentTarget.getAttribute("data-i"), 10);
        const j = parseInt(e.currentTarget.getAttribute("data-j"), 10);
        this.inspectCell(i, j);
      });
    });
  }

  // --------------------------------------------------------------------------
  // BOOLEAN VALIDATION MATRIX RENDERING
  // --------------------------------------------------------------------------
  renderBooleanMatrix(result) {
    const n = result.length;
    const startSym = result.startSymbol;

    let html = `
      <div class="bool-matrix-header">
        <p class="bool-info">
          Each cell indicates whether Context-Free Grammar start symbol <code>${startSym}</code> was derived:
          <span class="badge badge-success">TRUE</span> (derivable from ${startSym}) or
          <span class="badge badge-neutral">FALSE</span> (not derivable).
        </p>
      </div>
      <div class="matrix-table-responsive">
        <table class="academic-table boolean-table">
          <thead>
            <tr>
              <th class="matrix-corner">i \\ j</th>
    `;

    for (let j = 0; j < n; j++) {
      html += `<th>j = ${j}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let i = 0; i < n; i++) {
      html += `<tr><th>i = ${i}</th>`;
      for (let j = 0; j < n; j++) {
        if (j < i) {
          html += `<td class="matrix-unused">—</td>`;
        } else {
          const isTrue = result.boolMatrix[i][j];
          const isApex = (i === 0 && j === n - 1);
          const badgeClass = isTrue ? "bool-true" : "bool-false";
          const badgeText = isTrue ? "TRUE" : "FALSE";
          let specialClass = isApex ? "bool-apex" : "";

          html += `
            <td class="${specialClass}" data-i="${i}" data-j="${j}">
              <span class="bool-badge ${badgeClass}">${badgeText}</span>
              ${isApex ? `<div class="apex-verdict">${isTrue ? '✓ ACCEPTED' : '✗ REJECTED'}</div>` : ''}
            </td>
          `;
        }
      }
      html += `</tr>`;
    }

    html += `</tbody></table></div>`;
    this.booleanMatrixContainer.innerHTML = html;
  }

  // --------------------------------------------------------------------------
  // CELL INSPECTOR MODAL/PANEL RENDERING
  // --------------------------------------------------------------------------
  inspectCell(i, j) {
    if (!this.currentResult) return;
    const cellData = this.currentResult.metadata[i][j];
    if (!cellData) return;

    this.selectedCellCoords = { i, j };

    // Highlight cell across pyramid and matrix views
    document.querySelectorAll(".cyk-cell, .matrix-cell").forEach(el => {
      const ci = parseInt(el.getAttribute("data-i"), 10);
      const cj = parseInt(el.getAttribute("data-j"), 10);
      if (ci === i && cj === j) {
        el.classList.add("selected-cell");
      } else {
        el.classList.remove("selected-cell");
      }
    });

    const varsDisplay = cellData.variables.length > 0
      ? `{ ${cellData.variables.join(", ")} }`
      : `∅ (Empty Set)`;

    const isApex = (i === 0 && j === this.currentResult.length - 1);
    const startSym = this.currentResult.startSymbol;
    const hasStart = cellData.containsStart;

    let html = `
      <div class="inspector-card-inner">
        <div class="inspector-header">
          <div class="inspector-title-wrap">
            <span class="cell-tag">Cell V[${i}][${j}]</span>
            ${isApex ? '<span class="badge badge-accepted">Apex / Goal Cell</span>' : ''}
          </div>
          <div class="inspector-bool-status">
            ${hasStart
              ? `<span class="badge badge-success">TRUE (${startSym} ∈ V[${i}][${j}])</span>`
              : `<span class="badge badge-neutral">FALSE (${startSym} ∉ V[${i}][${j}])</span>`}
          </div>
        </div>

        <div class="inspector-grid">
          <div class="inspector-field">
            <span class="field-label">Substring</span>
            <span class="field-value highlight-substr">"${escapeHTML(cellData.substring)}"</span>
          </div>
          <div class="inspector-field">
            <span class="field-label">Position (0-based)</span>
            <span class="field-value">[${i}..${j}]</span>
          </div>
          <div class="inspector-field">
            <span class="field-label">Position (1-based)</span>
            <span class="field-value">${i + 1}–${j + 1}</span>
          </div>
          <div class="inspector-field">
            <span class="field-label">Substring Length</span>
            <span class="field-value">${cellData.length}</span>
          </div>
        </div>

        <div class="inspector-variables-box">
          <span class="field-label">Variables in V[${i}][${j}]:</span>
          <div class="variables-display">${varsDisplay}</div>
        </div>

        <div class="inspector-derivations">
          <h4 class="inspector-section-title">Production Rules Used & Derivation Reason</h4>
    `;

    if (cellData.length === 1) {
      // Terminal derivation
      html += `
        <div class="derivation-terminal-box">
          <p><strong>Base Case (Length 1):</strong> Character <code>'${escapeHTML(cellData.substring)}'</code> matches the following terminal production(s):</p>
          <ul class="derivation-rules-list">
            ${cellData.derivations.length > 0
              ? cellData.derivations.map(d => `
                  <li><span class="badge badge-match">MATCH</span> <code>${d.rule}</code> → Add <strong>${d.variable}</strong> to V[${i}][${i}]</li>
                `).join("")
              : `<li><span class="badge badge-nomatch">NO MATCH</span> No terminal rule produces '${escapeHTML(cellData.substring)}'</li>`}
          </ul>
        </div>
      `;
    } else {
      // Binary splits
      html += `
        <div class="derivation-splits-box">
          <p class="derivation-lead">Evaluated <strong>${cellData.splits.length}</strong> split position(s) k ∈ [${i}..${j - 1}]:</p>
          <div class="splits-table-responsive">
            <table class="academic-table splits-table">
              <thead>
                <tr>
                  <th>Split k</th>
                  <th>Partition (w[i..k] | w[k+1..j])</th>
                  <th>Left V[i][k]</th>
                  <th>Right V[k+1][j]</th>
                  <th>Valid CNF Productions (A → BC)</th>
                </tr>
              </thead>
              <tbody>
      `;

      cellData.splits.forEach(split => {
        const leftVars = split.leftCell.vars.length > 0 ? `{${split.leftCell.vars.join(", ")}}` : `∅`;
        const rightVars = split.rightCell.vars.length > 0 ? `{${split.rightCell.vars.join(", ")}}` : `∅`;
        const matchRules = split.matches.map(m => `<code>${m.rule}</code> (gives <strong>${m.variable}</strong>)`).join(", ");

        html += `
          <tr>
            <td><strong>k = ${split.splitIndex}</strong></td>
            <td>"${escapeHTML(split.leftCell.substring)}" | "${escapeHTML(split.rightCell.substring)}"</td>
            <td>V[${split.leftCell.i}][${split.leftCell.j}] = ${leftVars}</td>
            <td>V[${split.rightCell.i}][${split.rightCell.j}] = ${rightVars}</td>
            <td>
              ${split.matches.length > 0
                ? `<span class="badge badge-match">MATCH</span> ${matchRules}`
                : `<span class="badge badge-nomatch">NO MATCH</span>`}
            </td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    this.cellInspector.innerHTML = html;
  }

  // --------------------------------------------------------------------------
  // STEP-BY-STEP EXECUTION TRACE RENDERING
  // --------------------------------------------------------------------------
  renderStepByStep(result) {
    let html = "";

    result.executionTrace.forEach((stepGroup, groupIdx) => {
      const isFirst = (groupIdx === 0);
      html += `
        <div class="step-accordion-item ${isFirst ? 'open' : ''}">
          <button type="button" class="step-accordion-header">
            <div class="step-header-left">
              <span class="step-number-badge">Length ${stepGroup.length}</span>
              <strong class="step-group-title">${stepGroup.title}</strong>
            </div>
            <div class="step-header-right">
              <span class="cell-count-tag">${stepGroup.cells.length} substring(s)</span>
              <span class="accordion-chevron">▼</span>
            </div>
          </button>

          <div class="step-accordion-content">
            <p class="step-group-desc">${stepGroup.description}</p>
            <div class="step-cells-grid">
      `;

      stepGroup.cells.forEach(cell => {
        const varsDisplay = cell.variables.length > 0 ? `{${cell.variables.join(", ")}}` : `∅`;
        html += `
          <div class="step-cell-card">
            <div class="step-cell-header">
              <span class="step-cell-id">V[${cell.i}][${cell.j}]</span>
              <span class="step-cell-substr">Substring: <strong>"${escapeHTML(cell.substring)}"</strong> (indices ${cell.i + 1}..${cell.j + 1})</span>
              <span class="step-cell-result">Result: <code>${varsDisplay}</code></span>
            </div>
        `;

        if (cell.length === 1) {
          html += `
            <div class="step-detail-terminal">
              <span>Input character: <code>'${escapeHTML(cell.substring)}'</code></span>
              <span>Matching rules: ${cell.derivations.length > 0 ? cell.derivations.map(d => `<code>${d.rule}</code>`).join(", ") : "None"}</span>
            </div>
          `;
        } else {
          html += `<div class="step-splits-list">`;
          cell.splits.forEach(s => {
            const hasMatch = s.matches.length > 0;
            const leftV = s.leftCell.vars.length > 0 ? `{${s.leftCell.vars.join(", ")}}` : `∅`;
            const rightV = s.rightCell.vars.length > 0 ? `{${s.rightCell.vars.join(", ")}}` : `∅`;

            html += `
              <div class="step-split-row ${hasMatch ? 'split-matched' : ''}">
                <div class="split-info">
                  <span class="split-k">k = ${s.splitIndex}</span>:
                  <span>"${escapeHTML(s.leftCell.substring)}" | "${escapeHTML(s.rightCell.substring)}"</span>
                  <span class="split-cells-meta">(Left: V[${s.leftCell.i}][${s.leftCell.j}]=${leftV}, Right: V[${s.rightCell.i}][${s.rightCell.j}]=${rightV})</span>
                </div>
                <div class="split-result">
                  ${hasMatch
                    ? `<span class="badge badge-match">MATCH</span> ${s.matches.map(m => `<code>${m.rule}</code>`).join(", ")}`
                    : `<span class="badge badge-nomatch">NO MATCH</span>`}
                </div>
              </div>
            `;
          });
          html += `</div>`;
        }

        html += `</div>`;
      });

      html += `</div></div></div>`;
    });

    this.traceAccordion.innerHTML = html;

    // Accordion toggle click handlers
    this.traceAccordion.querySelectorAll(".step-accordion-header").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.parentElement;
        item.classList.toggle("open");
      });
    });
  }

  // --------------------------------------------------------------------------
  // CSV EXPORT
  // --------------------------------------------------------------------------
  exportCSV() {
    if (!this.currentResult) return;
    const r = this.currentResult;
    const n = r.length;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Row (Length),Start Index (0-based),End Index (0-based),Position (1-based),Substring,Variables,Contains Start Symbol (S)\n";

    for (let l = 1; l <= n; l++) {
      for (let i = 0; i <= n - l; i++) {
        const j = i + l - 1;
        const cell = r.metadata[i][j];
        const varsStr = cell.variables.length > 0 ? `"{${cell.variables.join(", ")}}"` : `"{}"`;
        const substr = `"${cell.substring}"`;
        const containsStart = cell.containsStart ? "TRUE" : "FALSE";
        const pos1Based = `"${i + 1}..${j + 1}"`;

        csvContent += `${l},${i},${j},${pos1Based},${substr},${varsStr},${containsStart}\n`;
      }
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CYK_table_${r.inputString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============================================================================
// 5. HELPER FUNCTIONS & INITIALIZATION
// ============================================================================
function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

// Initialize on DOM load in browser environment
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    window.cykApp = new CYKApp();
    // Automatically load Example 3 (classic baaba) on launch so user sees a working demonstration immediately
    window.cykApp.loadPreset("example3");
  });
}

// Export for Node.js automated testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CNFValidator, CYKEngine, PRESETS };
}
