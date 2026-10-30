import React from 'react';
import Badge from './Badge';
import Button from './Button';

export default function InterviewQuestion({
  question,
  questionIndex = 0,
  totalQuestions = 1,
  onSpeak,
  onToggleBookmark,
}) {
  if (!question) return null;
  return (
    <div className="obsidian-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gray">SCENARIO {String(questionIndex + 1).padStart(2, '0')}</Badge>
          <span className="label-caps text-[#42C6D9]">
            {question.category} • {question.topic}
          </span>
          {question.is_follow_up && <Badge variant="violet">FOLLOW-UP PROBE</Badge>}
        </div>
        <Badge variant="emerald">{question.difficulty} Probe</Badge>
      </div>

      <h2 className="text-[22px] sm:text-[24px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight">
        {question.question_text}
      </h2>

      {question.expected_key_points && question.expected_key_points.length > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          Specifically address{' '}
          <strong className="text-[var(--text-primary)]">
            {question.expected_key_points.slice(0, 2).join(' and ')}
          </strong>
          {question.expected_key_points[2] ? `, and explain ${question.expected_key_points[2].toLowerCase()}.` : '.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" variant="secondary" size="xs" materialIcon="volume_up" onClick={onSpeak}>
          Listen to Question (TTS)
        </Button>
        <Button
          type="button"
          variant={question.is_bookmarked ? 'primary' : 'secondary'}
          size="xs"
          materialIcon={question.is_bookmarked ? 'bookmark_added' : 'bookmark_add'}
          onClick={onToggleBookmark}
        >
          {question.is_bookmarked ? 'Saved in Bank' : 'Save to Bank'}
        </Button>
      </div>
    </div>
  );
}
