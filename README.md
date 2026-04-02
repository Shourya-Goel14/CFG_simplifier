# ⚙️ Context-Free Grammar (CFG) Simplifier

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://cfg-simplifier-kappa.vercel.app/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)]()

A robust web application that parses and systematically simplifies Context-Free Grammars (CFGs) using standard Automata Theory algorithms. Built with a custom parsing engine and a mathematically rigorous transformation pipeline, this tool guarantees language equivalence at every step.

**Live Demo:** [https://cfg-simplifier-kappa.vercel.app/](https://cfg-simplifier-kappa.vercel.app/)

## ✨ Algorithmic Pipeline

The core logic operates as a pure-function middleware pipeline, taking a raw grammar and passing it through four sequential transformation steps:

### 1. Eliminate ε-Productions
Removes rules that derive the empty string (A → ε) without altering the generated language.
* **Implementation:** Iteratively computes the set of all *nullable* variables. Uses a **bitmasking algorithm** to generate all $2^n$ possible subset combinations for rules containing nullable variables on their right-hand side, filtering out empty subsets.

### 2. Eliminate Unit Productions
Removes "middleman" rules where a single variable points to another single variable (A → B).
* **Implementation:** Utilizes **Breadth-First Search (BFS)** to compute the unit-closure graph for every non-terminal. It then directly links the origin variable to the "real work" (non-unit productions) of all variables in its closure, bypassing the unit edges entirely.

### 3. Eliminate Useless Symbols
Cleans up the grammar by removing variables that either fail to generate terminal strings or are entirely disconnected from the starting state.
* **Implementation:** Executes a strict two-phase fixed-point algorithm:
  * **Phase A (Generative - Bottom-Up):** Iteratively works backward from known terminals to identify variables capable of producing finite strings. Purges infinite loops.
  * **Phase B (Reachable - Top-Down):** Acts as a graph traversal starting exclusively from the Start symbol, deleting isolated "island" variables that were disconnected.

### 4. Final Cleanup & Deduplication
* **Implementation:** Aggregates all surviving rules, mathematically deduplicates them, recalculates the final absolute sets of Terminals and Non-Terminals, and sorts the grammar alphabetically (enforcing the Start symbol at the top) for clean UI presentation.

## 🏗️ Architecture

The codebase separates parsing logic from transformation logic for modularity and testability:
* `cfgParser.js`: Handles regex-based tokenization, smart symbol splitting (distinguishing explicit multi-char variables like `S1` from concatenated variables like `AB`), and precise state management.
* `cfgPipeline.js`: The orchestrator that wraps the synchronous mathematical transformations in asynchronous wrappers (Promises) to prevent blocking the main browser thread during heavy combinatoric steps.

## 🚀 Running Locally

To run this project on your local machine:

1. **Clone the repository**
   ```bash
   git clone <your-repo-url-here>
   cd cfg-simplifier
