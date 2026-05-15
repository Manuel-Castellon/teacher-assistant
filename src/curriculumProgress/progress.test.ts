import {
  buildClassProgressSummary,
  buildExamFromTaughtMaterial,
  buildLessonSuggestion,
  createClassProgressProfile,
  emptyTopicProgress,
  getCurriculumUnitForGrade,
  getExamTopicWarning,
  renderClassContext,
  updateTopicProgress,
} from './progress';

describe('curriculum progress helpers', () => {
  const now = '2026-05-15T08:00:00.000Z';
  const later = '2026-05-15T09:00:00.000Z';
  const unit = getCurriculumUnitForGrade('זי');
  const firstTopic = unit.topics[0]!;
  const secondTopic = unit.topics[1]!;
  const thirdTopic = unit.topics[2]!;

  it('creates an empty class profile and summarizes untouched curriculum', () => {
    const profile = createClassProgressProfile({
      id: 'class-7a',
      name: "ז' 1",
      grade: 'זי',
      now,
    });

    expect(profile).toEqual({
      id: 'class-7a',
      name: "ז' 1",
      grade: 'זי',
      createdAt: now,
      updatedAt: now,
      topics: {},
    });
    expect(emptyTopicProgress(firstTopic.id)).toEqual({
      topicId: firstTopic.id,
      status: 'not_started',
      hoursSpent: 0,
    });

    const summary = buildClassProgressSummary(profile);
    expect(summary.completedCount).toBe(0);
    expect(summary.inProgressCount).toBe(0);
    expect(summary.needsReviewCount).toBe(0);
    expect(summary.notStartedCount).toBe(unit.topics.length);
    expect(summary.totalHoursSpent).toBe(0);
    expect(summary.nextLessonTopic?.topic.id).toBe(firstTopic.id);
    expect(summary.reviewTopics).toHaveLength(0);
    expect(summary.examReadyTopics).toHaveLength(0);
  });

  it('updates topic progress, clamps invalid hours, and builds lesson context', () => {
    let profile = createClassProgressProfile({
      id: 'class-7a',
      name: "ז' 1",
      grade: 'זי',
      now,
    });

    profile = updateTopicProgress(profile, firstTopic.id, {
      status: 'completed',
      hoursSpent: 4,
      lastTaughtDate: '2026-05-14',
      notes: 'נדרש עוד תרגול מילולי',
    }, later);
    profile = updateTopicProgress(profile, secondTopic.id, {
      status: 'needs_review',
      hoursSpent: -2,
      notes: 'צריך חזרה ממוקדת.',
    }, later);
    profile = updateTopicProgress(profile, thirdTopic.id, {
      status: 'in_progress',
      hoursSpent: 1.5,
    }, later);

    expect(profile.updatedAt).toBe(later);
    expect(profile.topics[secondTopic.id]).toEqual({
      topicId: secondTopic.id,
      status: 'needs_review',
      hoursSpent: 0,
      notes: 'צריך חזרה ממוקדת.',
    });

    const summary = buildClassProgressSummary(profile);
    expect(summary.completedCount).toBe(1);
    expect(summary.inProgressCount).toBe(1);
    expect(summary.needsReviewCount).toBe(1);
    expect(summary.totalHoursSpent).toBe(5.5);
    expect(summary.nextLessonTopic?.topic.id).toBe(thirdTopic.id);
    expect(summary.reviewTopics.map(item => item.topic.id)).toEqual([secondTopic.id]);
    expect(summary.examReadyTopics.map(item => item.topic.id)).toEqual([firstTopic.id, secondTopic.id]);

    const suggestion = buildLessonSuggestion(profile);
    expect(suggestion).toEqual({
      topicId: thirdTopic.id,
      topic: thirdTopic.name,
      subTopic: thirdTopic.subTopics[0]!.name,
      lessonType: 'תרגול',
      teacherRequest: suggestion?.teacherRequest,
      previousLessonContext: renderClassContext(profile, summary),
    });
    expect(suggestion?.teacherRequest).toContain(`שיעור המשך ותרגול לכיתה ז' 1 בנושא ${thirdTopic.name}.`);
    expect(suggestion?.teacherRequest).toContain('מתחיל במשימת פתיחה עצמאית');
    expect(suggestion?.previousLessonContext).toContain("כיתה: ז' 1");
    expect(suggestion?.previousLessonContext).toContain('דורשים חזרה: 1');
    expect(suggestion?.previousLessonContext).toContain('הערה: נדרש עוד תרגול מילולי');

    const reviewSuggestion = buildLessonSuggestion(profile, secondTopic.id);
    expect(reviewSuggestion?.lessonType).toBe('תרגול');
    expect(reviewSuggestion?.teacherRequest).toContain(`שיעור חזרה ממוקד לכיתה ז' 1 בנושא ${secondTopic.name}.`);
    expect(reviewSuggestion?.teacherRequest).toContain('להתייחס להערת המעקב: צריך חזרה ממוקדת.');
    expect(reviewSuggestion?.teacherRequest).not.toContain('..');
  });

  it('builds editable exam defaults and warnings from taught material', () => {
    let profile = createClassProgressProfile({
      id: 'class-7a',
      name: "ז' 1",
      grade: 'זי',
      now,
    });
    profile = updateTopicProgress(profile, firstTopic.id, { status: 'completed', hoursSpent: 4 }, later);
    profile = updateTopicProgress(profile, secondTopic.id, { status: 'needs_review', hoursSpent: 2 }, later);
    profile = updateTopicProgress(profile, thirdTopic.id, { status: 'in_progress', hoursSpent: 1 }, later);

    expect(buildExamFromTaughtMaterial(profile, 1)).toEqual([
      { topicId: firstTopic.id, topic: firstTopic.name },
    ]);
    expect(buildExamFromTaughtMaterial(profile)).toEqual([
      { topicId: firstTopic.id, topic: firstTopic.name },
      { topicId: secondTopic.id, topic: secondTopic.name },
    ]);

    expect(getExamTopicWarning(profile)).toBeUndefined();
    expect(getExamTopicWarning(profile, 'missing-topic')).toBe('הנושא לא נמצא בתכנית של הכיתה שנבחרה.');
    expect(getExamTopicWarning(profile, unit.topics[3]!.id)).toBe('הנושא עדיין לא סומן כנלמד בכיתה הזו.');
    expect(getExamTopicWarning(profile, thirdTopic.id)).toBe('הנושא עדיין בתהליך, כדאי לוודא שהמבחן לא מתקדם מדי.');
    expect(getExamTopicWarning(profile, firstTopic.id)).toBeUndefined();
  });
});
