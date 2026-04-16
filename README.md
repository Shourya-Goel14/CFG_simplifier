# CFG Simplifier & Visualizer - Project Submission

## 🎓 Student Information
- **Name:** Shourya Goel
- **Roll No:** 2024UCM2356
- **Project Type:** Frontend & Backend Logic Integration (Educational Tool for Formal Language Theory)

---

## 📝 Abstract
This project is an advanced interactive tool designed to simplify **Context-Free Grammars (CFG)** using formal computational algorithms. It provides a visual and logical trace of the simplification pipeline, making it an ideal resource for students and educators studying Automata and Formal Languages.

---

## 🖼️ Application Gallery

### 1. Landing Page & Hero Section
The application features a modern, "AI-first" developer aesthetic with glassmorphism and neon accents.
![Landing Page](./Screenshot%202026-04-16%20205346.png)
![Hero Section Detail](./Screenshot%202026-04-16%20205356.png)

### 2. Theory Dashboard
An integrated learning module explaining the mathematical concepts before users start simplifying.
![Theory Dashboard](./Screenshot%202026-04-16%20205403.png)

### 3. Grammar Input & Configuration
Users can define variables, terminals, and production rules in a structured Bento-style input panel.
![Input Panel](./Screenshot%202026-04-16%20205420.png)

### 4. Simplification Pipeline (Step-by-Step)
Each step shows the grammar transformation alongside a dynamic graph visualization.

**Phase 1: ε-Production Elimination**
![Step 1 - Null Elimination](./Screenshot%202026-04-16%20205436.png)
![Step 1 - Visualization](./Screenshot%202026-04-16%20205445.png)

**Phase 2: Unit Production Elimination**
![Step 2 - Unit Elimination](./Screenshot%202026-04-16%20205459.png)

**Phase 3: Useless Symbol Removal**
![Step 3 - Useless Symbols](./Screenshot%202026-04-16%20205520.png)
![Step 3 - Detailed Traces](./Screenshot%202026-04-16%20205526.png)

**Phase 4: Final Cleanup & Optimization**
![Step 4 - Final Cleanup](./Screenshot%202026-04-16%20205533.png)

### 5. String Recognition & Language Validation
After simplification, the tool provides a recognizer to test string membership (L(G)).
![String Recognition](./Screenshot%202026-04-16%20205540.png)
![Valid String Result](./Screenshot%202026-04-16%20205546.png)
![Invalid String Result](./Screenshot%202026-04-16%20205552.png)

### 6. Grammar Equivalence Checker (Extra Feature)
Compare two grammars to see if they generate the same set of strings.
![Equivalence Checker](./Screenshot%202026-04-16%20205607.png)

---

## ⚙️ Backend Logic (Compute Engine)

The "Backend" logic consists of 10+ custom-built JavaScript modules that handle formal grammar computations.

- **`cfgParser.js`**: A robust parser that converts raw string input into a structured mathematical model (Variables, Terminals, and Production Maps).
- **`eliminateNull.js`**: Implements the algorithm to find **Nullable Variables** and expand productions to remove ε-rules without changing the language.
- **`eliminateUnit.js`**: Computes the **Unit Closure** of each variable to eliminate rules like `A → B` while preserving reachability.
- **`eliminateUseless.js`**: A dual-phase algorithm:
    - **Generative Phase**: Marks variables that can eventually derive a string of terminals.
    - **Reachable Phase**: Marks symbols reachable from the start symbol.
- **`cfgPipeline.js`**: The orchestrator that coordinates these steps, ensuring data integrity and generating the "traces" (metadata) displayed in the UI.

---

## 🎨 Frontend Logic (Interactive UI)

The frontend is built with a focus on user experience and real-time feedback.

- **React 19 Hooks**: Utilizes `useCallback` and `useMemo` for highly efficient grammar processing without UI stutter.
- **Persistence Layer**: Implements a custom serialization engine that saves the current grammar state and simplification progress to `localStorage`, allowing users to resume their work after a reload.
- **Graph Engine (`Vis-network`)**: Dynamically transforms the production rules into a directed graph, where nodes are variables/terminals and edges are derivations.
- **Micro-Animations**: Uses CSS Custom Properties (e.g., `--mouse-x`, `--mouse-y`) to power background glow effects and interactive bento cards.

---

## 📦 Dependencies

| Dependency | Purpose |
| :--- | :--- |
| `react` | Component-based UI architecture. |
| `vite` | High-performance build tool and dev server. |
| `tailwindcss` | Modern styling and glassmorphic layouts. |
| `vis-network` | Advanced graph visualization engine. |
| `typescript` | Static typing for reliable logic implementation. |

---

## 🚀 How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Development Server**:
   ```bash
   npm run dev
   ```
3. **Build Target**:
   ```bash
   npm run build
   ```

---
*Created for the 2026 Project Submission Cycle.*
