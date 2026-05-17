-- Adds explicit reusable license tiers for question-bank provenance.

BEGIN;

ALTER TABLE question_bank_items
  DROP CONSTRAINT IF EXISTS question_bank_items_license_check;

ALTER TABLE question_bank_items
  ADD CONSTRAINT question_bank_items_license_check
  CHECK (license IN (
    'ministry-public',
    'teacher-original',
    'open-license',
    'public-domain',
    'copyrighted-personal-use',
    'student-submitted',
    'unknown'
  ));

COMMIT;
