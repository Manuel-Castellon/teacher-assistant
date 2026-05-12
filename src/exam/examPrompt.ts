import {
  CUSTOM_CURRICULUM_TOPIC_ID,
  renderCurriculumExamScope,
  type CurriculumExamScope,
} from './curriculumContext';

export const EXAM_PROMPT_VERSION = 'exam-v0.1.0';

export const EXAM_SYSTEM_PROMPT = `אתה מחולל מבחנים למורה למתמטיקה בישראל (חטיבת ביניים + תיכון).
אתה יוצר מבחן אחד בעברית, בפורמט JSON תקני התואם את הסכמה שתינתן לך.

## עקרונות מחייבים (מבוססים על מבחנים אמיתיים שכתבה המורה)

### מבנה המבחן
1. כותרת: שם המבחן, שכבה, תאריך.
2. חלקים (parts): כל חלק מכיל נושא (למשל "אלגברה", "גיאומטריה").
3. שאלות ממוספרות עם ניקוד בסוגריים: "שאלה 1 (20 נק')".
4. תת-שאלות ממוספרות בספרות: 1. 2. 3.
5. סיום: "!בהצלחה"

### סגנון השאלות
- שאלות חישוביות: התלמיד חייב לפתור, לא רק לבחור תשובה. אין שאלות אמריקאיות בלבד.
- בעיות מילוליות: סיפור קצר ומציאותי, מנוסח בהיגיון, עם נתונים מספריים ברורים.
- הוכחות גיאומטריות: נתונים מפורשים, שרטוט מתואר, שאלות מדורגות (הוכח דמיון → מצא אורך צלע → חשב עוד ערך).
- קריאה וניתוח: פירוש נתונים מגרף, טבלה, מערכת צירים, ציר מספרים, דיאגרמה או שרטוט; השאלה יכולה לכלול חישוב קטן אך הדגש הוא הבנת הייצוג.
- הוראות ברורות: "פתרו", "הראו כי", "מצאו", "רשמו", "הוכיחו".
- כשצריך תחום הצבה: "זכרו לציין את תחום ההצבה".
- כשצריך ציר מספרים: "סמנו אותו על ציר המספרים".

### מתמטיקה
- כל ביטוי מתמטי בפורמט LaTeX inline: $\\frac{x-1}{2}$, $\\triangle ABC \\sim \\triangle DEF$.
- שברים תמיד ב-\\frac, לעולם לא בכתיב שטוח כמו (x-1)/2.
- סימנים: $\\leq$, $\\geq$, $\\perp$, $\\angle$, $\\sim$.
- אין לערבב כיווניות RTL/LTR בתוך ביטויי מתמטיקה.
- כל תרגיל חייב להיות פתיר ולהניב תשובה סופית חד-משמעית (למעט הוכחות שם הדרישה היא הנמקה).

### מה לא לעשות (לקוח מניסיון עם כלי AI אחרים)
- לא ליצור רק שאלות אמריקאיות / רב-ברירתיות.
- לא ליצור תרגילים חוזרים על עצמם.
- לא לייצר LaTeX שבור (סוגריים לא סגורים, פקודות חתוכות).
- לא לכתוב עברית קלוקלת או מנוסחת באופן גנרי.
- לא ליצור שאלות שאינן דורשות חישוב או עבודה ממשית מהתלמיד.
- לא לכלול גרפים בשאלות בלי לתאר מה השרטוט מראה (המורה תצייר בעצמה).

### מפתח תשובות
- פתרון מלא שלב-אחרי-שלב לכל תת-שאלה.
- תשובה סופית מסומנת בבירור.
- בהוכחות: ציון הקריטריון (משפט, הגדרה) שעליו מבוססת כל טענה.

### נתוני אימות (verificationItems)
לכל תת-שאלה חישובית, ספק אובייקט אימות עם:
- questionRef: מזהה כמו "Q1.1", "Q2.3"
- type: "equation" | "inequality" | "numeric" | "proof"
- sympyExpression: ביטוי SymPy-parseable (פייתון) של המשוואה/אי-שוויון. למשל: "Eq((x-1)/2 - (x-6)/3, 3)" או "2*x < 3*(x-2) - x"
- expectedAnswer: התשובה הצפויה בפורמט SymPy. למשל: "{25}" או "x > 6" או "4/3"

לשאלות מסוג proof, רשום type="proof" בלבד — אין צורך ב-sympyExpression.
לחישובים מספריים (כמו אורך צלע), השתמש ב-type="numeric".

החזר JSON תקני בלבד. ללא טקסט לפני או אחרי ה-JSON.`;

export function renderExamUserPrompt(request: {
  examNumber?: number;
  className: string;
  date: string;
  grade: string;
  durationMinutes: number;
  totalPoints: number;
  parts: {
    title: string;
    questionSpecs: {
      topic: string;
      curriculumTopicId?: string;
      questionType: string;
      points: number;
      subQuestionCount?: number;
      constraints?: string[];
    }[];
  }[];
  curriculumScope?: CurriculumExamScope;
  teacherNotes?: string;
}): string {
  const lines = [
    'צור מבחן במתמטיקה עבור הבקשה הבאה. החזר JSON בלבד התואם את הסכמה של GeneratedExam.',
    '',
    `כיתה: ${request.grade}`,
    `שכבה: ${request.className}`,
    `תאריך: ${request.date}`,
    `משך: ${request.durationMinutes} דקות`,
    `סה"כ ניקוד: ${request.totalPoints}`,
  ];

  if (request.examNumber != null) {
    lines.push(`מספר מבחן: ${request.examNumber}`);
  }

  if (request.curriculumScope) {
    lines.push('', renderCurriculumExamScope(request.curriculumScope));
  }

  lines.push('', '## חלקים ושאלות');

  for (const part of request.parts) {
    lines.push('', `### ${part.title}`);
    for (const q of part.questionSpecs) {
      const subCount = q.subQuestionCount ? `, ${q.subQuestionCount} תת-שאלות` : '';
      lines.push(`- ${renderQuestionTopic(q, request.curriculumScope)} (${q.questionType}, ${q.points} נק'${subCount})`);
      if (q.constraints?.length) {
        for (const c of q.constraints) {
          lines.push(`  * ${c}`);
        }
      }
    }
  }

  if (request.teacherNotes) {
    lines.push('', '## הערות מהמורה (לכבד בקפדנות)', request.teacherNotes);
  }

  lines.push('', '## סכמת JSON', EXAM_JSON_SCHEMA);

  return lines.join('\n');
}

function renderQuestionTopic(
  question: { topic: string; curriculumTopicId?: string },
  curriculumScope?: CurriculumExamScope,
): string {
  if (!question.curriculumTopicId) return question.topic;

  if (question.curriculumTopicId === CUSTOM_CURRICULUM_TOPIC_ID) {
    return `${question.topic} — מיקוד חופשי/אחר שנבחר במפורש על ידי המורה`;
  }

  const curriculumTopic = curriculumScope?.topics.find(topic => topic.id === question.curriculumTopicId);
  if (!curriculumTopic) {
    return `${question.topic} — עוגן סילבוס: ${question.curriculumTopicId}`;
  }

  if (question.topic.trim() && question.topic.trim() !== curriculumTopic.name) {
    return `${question.topic} — עוגן סילבוס: ${curriculumTopic.name}`;
  }

  return `${curriculumTopic.name} — עוגן סילבוס`;
}

const EXAM_JSON_SCHEMA = `
\`\`\`typescript
{
  header: {
    examNumber?: number,
    subject: "מתמטיקה",
    className: string,
    date: string
  },
  parts: [{
    title: string,   // e.g. "חלק א'- אלגברה"
    questions: [{
      questionNumber: number,
      points: number,
      instruction: string,  // e.g. "פתרו את המשוואות הבאות"
      subQuestions: [{
        label: string,  // "1." "2." etc.
        content: string // LaTeX math inline
      }],
      givenData?: string[],          // for geometry: each "נתון" line
      diagramDescription?: string    // text description of the figure
    }]
  }],
  totalPoints: number,
  answerKey: [{
    questionNumber: number,
    subAnswers: [{
      label: string,
      steps: string[],      // each step as a string (LaTeX ok)
      finalAnswer: string
    }]
  }],
  verificationItems: [{
    questionRef: string,         // "Q1.1", "Q2.3"
    type: "equation" | "inequality" | "numeric" | "proof",
    sympyExpression?: string,    // SymPy-parseable Python expression
    expectedAnswer?: string      // SymPy-parseable expected result
  }]
}
\`\`\``;
