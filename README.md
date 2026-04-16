# CFG Simplifier & Visualizer

A sophisticated, interactive tool designed to simplify **Context-Free Grammars (CFG)** step-by-step. Built with a modern tech stack, it provides both logical transformations and visual graph representations to help students and developers understand formal language theory algorithms.

## ✍️ Author Information
- **Name:** Shourya Goel
- **Roll No:** 2024UCM2356

---

## 🚀 Key Features

- **Sequential Simplification Pipeline**: Follows the formal 4-phase simplification process:
  1. **ε-Production Elimination**: Removes null productions while maintaining language equivalence.
  2. **Unit Production Elimination**: Systematically replaces unit rules (A -> B).
  3. **Useless Symbol Removal**: 
     - *Phase 1:* Identification of generating symbols.
     - *Phase 2:* Identification of reachable symbols from the start symbol.
  4. **Grammar Cleanup**: Final formatting and optimization.
- **Visual Graph Tracing**: Uses **Vis-network** to visualize the grammar structure as a graph at each step.
- **Trace Logs**: Detailed step-by-step explanation (traces) for every transformation.
- **Glassmorphic UI**: Premium "AI-first" developer aesthetic with deep dark mode and neon highlights.
- **State Persistence**: Progress is saved locally to ensure continuity across sessions.

## 🛠️ Tech Stack

- **Frontend Core**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Graph Visualization**: [Vis-network](https://visjs.org/)
- **Logic Engine**: Custom JavaScript implementations of formal grammar algorithms.

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Shourya-Goel14/CFG_simplifier.git
   ```
2. Navigate to the project directory:
   ```bash
   cd CFG_simplifier
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Development
Run the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build
To create a production-ready build:
```bash
npm run build
```

## 📄 License
This project is for educational purposes. All rights reserved.
