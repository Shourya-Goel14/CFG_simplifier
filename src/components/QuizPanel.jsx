import { useState, useMemo, useCallback } from 'react';
import { generateQuiz } from '../logic/quizGenerator';
import { parseGrammar } from '../logic/cfgParser';
import GRAMMAR_LIBRARY from '../data/grammarLibrary';

export default function QuizPanel() {
  const [selectedGrammarIdx, setSelectedGrammarIdx] = useState(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizComplete, setQuizComplete] = useState(false);

  // Parse the selected grammar and generate quiz
  const questions = useMemo(() => {
    if (selectedGrammarIdx === null) return [];
    const preset = GRAMMAR_LIBRARY[selectedGrammarIdx];
    const grammar = parseGrammar(
      preset.rows.map((r) => ({ ...r })),
      preset.start
    );
    return generateQuiz(grammar);
  }, [selectedGrammarIdx]);

  const currentQ = questions[currentQIdx] || null;

  const grammarText = useMemo(() => {
    if (selectedGrammarIdx === null) return '';
    const preset = GRAMMAR_LIBRARY[selectedGrammarIdx];
    return preset.rows
      .map((r) => `${r.lhs} → ${r.rhs}`)
      .join('\n');
  }, [selectedGrammarIdx]);

  function handleSelectGrammar(idx) {
    setSelectedGrammarIdx(idx);
    setCurrentQIdx(0);
    setSelectedAnswers(new Set());
    setSubmitted(false);
    setScore({ correct: 0, total: 0 });
    setQuizComplete(false);
  }

  function toggleAnswer(option) {
    if (submitted) return;
    setSelectedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  }

  function handleSubmitAnswer() {
    if (!currentQ || submitted) return;
    setSubmitted(true);

    // Check correctness
    const correct = currentQ.correctAnswers;
    const selected = [...selectedAnswers];
    const isCorrect =
      correct.length === selected.length &&
      correct.every((c) => selectedAnswers.has(c));

    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  function handleNext() {
    if (currentQIdx + 1 >= questions.length) {
      setQuizComplete(true);
      return;
    }
    setCurrentQIdx(currentQIdx + 1);
    setSelectedAnswers(new Set());
    setSubmitted(false);
  }

  function handleRestart() {
    setCurrentQIdx(0);
    setSelectedAnswers(new Set());
    setSubmitted(false);
    setScore({ correct: 0, total: 0 });
    setQuizComplete(false);
  }

  // Grammar selection screen
  if (selectedGrammarIdx === null) {
    return (
      <div className="quiz-panel">
        <div className="quiz-header">
          <div className="quiz-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Quiz Mode — Practice CFG Concepts</span>
          </div>
        </div>
        <p className="quiz-instruction">Select a grammar to begin the quiz:</p>
        <div className="quiz-grammar-grid">
          {GRAMMAR_LIBRARY.map((g, i) => (
            <button
              key={i}
              className="quiz-grammar-card"
              onClick={() => handleSelectGrammar(i)}
              type="button"
            >
              <span className="quiz-grammar-name">{g.name}</span>
              <span className="quiz-grammar-desc">{g.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Quiz complete screen
  if (quizComplete) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="quiz-panel">
        <div className="quiz-header">
          <div className="quiz-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Quiz Complete!</span>
          </div>
        </div>
        <div className="quiz-complete">
          <div className={`quiz-score-circle ${pct >= 70 ? 'quiz-score-good' : 'quiz-score-bad'}`}>
            <span className="quiz-score-number">{pct}%</span>
            <span className="quiz-score-label">{score.correct}/{score.total} correct</span>
          </div>
          <p className="quiz-score-message">
            {pct === 100 ? '🎉 Perfect score! You\'ve mastered these concepts!' :
             pct >= 70 ? '👏 Great job! You have a solid understanding.' :
             pct >= 40 ? '📚 Good effort! Review the explanations to improve.' :
             '💪 Keep practicing! Review the theory section for more context.'}
          </p>
          <div className="quiz-complete-actions">
            <button className="btn-primary" onClick={handleRestart} type="button">
              Retry Quiz
            </button>
            <button className="btn-secondary" onClick={() => setSelectedGrammarIdx(null)} type="button">
              Choose Another Grammar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active quiz screen
  return (
    <div className="quiz-panel">
      <div className="quiz-header">
        <div className="quiz-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Quiz — {GRAMMAR_LIBRARY[selectedGrammarIdx].name}</span>
        </div>
        <div className="quiz-progress">
          Q{currentQIdx + 1} / {questions.length}
          <span className="quiz-score-inline">Score: {score.correct}/{score.total}</span>
        </div>
      </div>

      {/* Grammar display */}
      <div className="quiz-grammar-display">
        <div className="quiz-grammar-display-label">Grammar:</div>
        <pre className="quiz-grammar-pre">{grammarText}</pre>
      </div>

      {/* Question */}
      {currentQ && (
        <div className="quiz-question-area">
          <h3 className="quiz-question-text">{currentQ.question}</h3>
          <p className="quiz-question-hint">{currentQ.hint}</p>

          <div className="quiz-options">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedAnswers.has(opt);
              const isCorrect = currentQ.correctAnswers.includes(opt);
              let optionClass = 'quiz-option';
              if (submitted) {
                if (isCorrect) optionClass += ' quiz-option-correct';
                else if (isSelected && !isCorrect) optionClass += ' quiz-option-wrong';
              } else if (isSelected) {
                optionClass += ' quiz-option-selected';
              }

              return (
                <button
                  key={i}
                  className={optionClass}
                  onClick={() => toggleAnswer(opt)}
                  type="button"
                  disabled={submitted}
                >
                  <span className="quiz-option-indicator">
                    {submitted ? (isCorrect ? '✓' : isSelected ? '✗' : '') : (isSelected ? '●' : '○')}
                  </span>
                  <span className="quiz-option-text">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Hint: select none if answer is "none" */}
          {currentQ.correctAnswers.length === 0 && !submitted && (
            <p className="quiz-none-hint">💡 If none apply, submit with nothing selected.</p>
          )}

          {/* Explanation after submit */}
          {submitted && (
            <div className="quiz-explanation">
              <div className="quiz-explanation-label">Explanation:</div>
              <p>{currentQ.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="quiz-actions">
            {!submitted ? (
              <button className="btn-primary" onClick={handleSubmitAnswer} type="button">
                Submit Answer
              </button>
            ) : (
              <button className="btn-primary" onClick={handleNext} type="button">
                {currentQIdx + 1 >= questions.length ? 'See Results' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
