#!/usr/bin/env npx ts-node
/**
 * End-to-end exam generation script.
 *
 * Usage:
 *   GEMINI_API_KEY=... npx ts-node scripts/generate-exam.ts
 *
 * Produces:
 *   output/exam.md          - exam document (markdown)
 *   output/answer-key.md    - answer key (markdown)
 *   output/exam.docx        - exam document (Word)
 *   output/answer-key.docx  - answer key (Word)
 *   output/verification.json - SymPy verification results
 */

import { ExamGenerator } from '../src/exam/ExamGenerator';
import { renderExamMarkdown, renderAnswerKeyMarkdown } from '../src/exam/renderExam';
import { SympyMathVerifier } from '../src/providers/impl/SympyMathVerifier';
import type { ExamRequest } from '../src/exam/types';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const OUTPUT_DIR = resolve(__dirname, '../output');

const request: ExamRequest = {
  examNumber: 3,
  className: "שכבה ב' מואצת",
  date: '15.05.26',
  grade: 'חי',
  durationMinutes: 90,
  totalPoints: 100,
  parts: [
    {
      title: 'אלגברה',
      questionSpecs: [
        {
          topic: 'אי-שוויונות',
          questionType: 'חישובי',
          points: 20,
          subQuestionCount: 2,
          constraints: [
            'כל תת-שאלה: פתרון אלגברי + סימון על ציר המספרים',
            'אי-שוויון אחד פשוט ואחד עם שברים או סוגריים',
          ],
        },
        {
          topic: 'משוואות עם שברים אלגבריים',
          questionType: 'חישובי',
          points: 30,
          subQuestionCount: 3,
          constraints: [
            'כל סעיף: לציין תחום הצבה',
            'סעיף אחד פשוט, אחד עם נעלם במכנה, אחד שלישי עם צמצום או ללא פתרון',
          ],
        },
        {
          topic: 'בעיה מילולית עם אחוזים',
          questionType: 'בעיה_מילולית',
          points: 15,
          subQuestionCount: 2,
          constraints: [
            'סיפור מציאותי עם הקשר לחיי יומיום (כסף, עבודה, קניות)',
            'סעיף ראשון: הקמת משוואה ופתרון',
            'סעיף שני: חישוב אחוזים',
          ],
        },
      ],
    },
    {
      title: 'גיאומטריה',
      questionSpecs: [
        {
          topic: 'דמיון משולשים',
          questionType: 'הוכחה',
          points: 35,
          subQuestionCount: 3,
          constraints: [
            'משולש ישר זווית עם נתונים מספריים (אורכי צלעות)',
            'סעיף א: הוכחת דמיון בין שני משולשים',
            'סעיף ב: מציאת אורך צלע בעזרת יחס הדמיון',
            'סעיף ג: מציאת אורך צלע נוספת או חישוב שטח',
            'לתאר את השרטוט במילים (המורה תצייר בעצמה)',
          ],
        },
      ],
    },
  ],
  teacherNotes:
    'המבחן מיועד לכיתה ח\' מואצת. ' +
    'הנושאים תואמים את מה שנלמד עד כה: אי-שוויונות, משוואות עם שברים אלגבריים (כולל תחום הצבה), ' +
    'בעיות מילוליות עם אחוזים, ודמיון משולשים עם הוכחה. ' +
    'שאלות ברמה מעט מאתגרת מהרגיל בגלל שזו שכבה מואצת.',
};

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating exam...');
  const generator = new ExamGenerator();
  const exam = await generator.generate(request);

  writeFileSync(resolve(OUTPUT_DIR, 'exam-raw.json'), JSON.stringify(exam, null, 2), 'utf-8');
  console.log(`Exam generated: ${exam.parts.length} parts, ${exam.totalPoints} points`);

  const examMd = renderExamMarkdown(exam);
  const answerKeyMd = renderAnswerKeyMarkdown(exam);
  writeFileSync(resolve(OUTPUT_DIR, 'exam.md'), examMd, 'utf-8');
  writeFileSync(resolve(OUTPUT_DIR, 'answer-key.md'), answerKeyMd, 'utf-8');
  console.log('Markdown rendered');

  console.log(`Verifying ${exam.verificationItems.length} math items via SymPy...`);
  const verifier = new SympyMathVerifier();
  const results = await verifier.verifyExamItems(exam.verificationItems);
  writeFileSync(resolve(OUTPUT_DIR, 'verification.json'), JSON.stringify(results, null, 2), 'utf-8');

  const passed = results.filter(r => r.isValid).length;
  const failed = results.filter(r => !r.isValid).length;
  const proofs = results.filter(r => r.message.startsWith('Proof:')).length;
  console.log(`Verification: ${passed} passed, ${failed} failed, ${proofs} proofs (human review)`);

  if (failed > 0) {
    console.log('\nFAILED VERIFICATIONS:');
    for (const r of results.filter(r => !r.isValid)) {
      console.log(`  ${r.questionRef}: ${r.message}`);
    }
  }

  try {
    const examMdPath = resolve(OUTPUT_DIR, 'exam.md');
    const examDocxPath = resolve(OUTPUT_DIR, 'exam.docx');
    const answerMdPath = resolve(OUTPUT_DIR, 'answer-key.md');
    const answerDocxPath = resolve(OUTPUT_DIR, 'answer-key.docx');

    execFileSync('pandoc', [examMdPath, '-o', examDocxPath, '--from=markdown', '--to=docx']);
    execFileSync('pandoc', [answerMdPath, '-o', answerDocxPath, '--from=markdown', '--to=docx']);
    console.log('Word documents created: output/exam.docx, output/answer-key.docx');
  } catch {
    console.log('pandoc conversion failed (markdown files still available)');
  }

  console.log('\nDone. Files in output/');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
