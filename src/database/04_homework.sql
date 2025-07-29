-- Homework assignments table
CREATE TABLE homework_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR(100),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  points_possible INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT FALSE,
  late_penalty_percent INTEGER DEFAULT 0 CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100),
  submission_format VARCHAR(50) DEFAULT 'text' CHECK (submission_format IN ('text', 'file', 'both')),
  instructions TEXT,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homework submissions table
CREATE TABLE homework_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES homework_assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Homework grades table
CREATE TABLE homework_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES homework_submissions(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homework comments (for teacher-student communication)
CREATE TABLE homework_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES homework_submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE, -- For teacher-only notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_homework_assignments_class_id ON homework_assignments(class_id);
CREATE INDEX idx_homework_assignments_teacher_id ON homework_assignments(teacher_id);
CREATE INDEX idx_homework_assignments_due_date ON homework_assignments(due_date);
CREATE INDEX idx_homework_submissions_assignment_id ON homework_submissions(assignment_id);
CREATE INDEX idx_homework_submissions_student_id ON homework_submissions(student_id);
CREATE INDEX idx_homework_submissions_status ON homework_submissions(status);
CREATE INDEX idx_homework_grades_submission_id ON homework_grades(submission_id);
CREATE INDEX idx_homework_comments_submission_id ON homework_comments(submission_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_homework_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_homework_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_homework_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER homework_assignments_updated_at
  BEFORE UPDATE ON homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_assignments_updated_at();

CREATE TRIGGER homework_submissions_updated_at
  BEFORE UPDATE ON homework_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_submissions_updated_at();

CREATE TRIGGER homework_grades_updated_at
  BEFORE UPDATE ON homework_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_grades_updated_at();

-- Row Level Security (RLS)
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for homework_assignments
-- Teachers can manage assignments for their classes
CREATE POLICY "Teachers can manage homework for their classes" ON homework_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = homework_assignments.class_id 
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can read published assignments for their classes
CREATE POLICY "Students can read published assignments for their classes" ON homework_assignments
  FOR SELECT USING (
    is_published = TRUE AND
    EXISTS (
      SELECT 1 FROM class_members 
      WHERE class_members.class_id = homework_assignments.class_id 
      AND class_members.user_id = auth.uid()
    )
  );

-- RLS policies for homework_submissions
-- Students can manage their own submissions
CREATE POLICY "Students can manage their own submissions" ON homework_submissions
  FOR ALL USING (auth.uid() = student_id);

-- Teachers can read all submissions for their assignments
CREATE POLICY "Teachers can read submissions for their assignments" ON homework_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM homework_assignments ha
      WHERE ha.id = homework_submissions.assignment_id
      AND EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = ha.class_id
        AND c.teacher_id = auth.uid()
      )
    )
  );

-- RLS policies for homework_grades
-- Teachers can manage grades for their assignments
CREATE POLICY "Teachers can manage grades for their assignments" ON homework_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      JOIN homework_assignments ha ON ha.id = hs.assignment_id
      JOIN classes c ON c.id = ha.class_id
      WHERE hs.id = homework_grades.submission_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can read their own grades
CREATE POLICY "Students can read their own grades" ON homework_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.id = homework_grades.submission_id
      AND hs.student_id = auth.uid()
    )
  );

-- RLS policies for homework_comments
-- Users can read comments on submissions they're involved with
CREATE POLICY "Users can read relevant homework comments" ON homework_comments
  FOR SELECT USING (
    -- Comment author can read their own comments
    auth.uid() = user_id OR
    -- Student can read non-private comments on their submission
    (
      NOT is_private AND
      EXISTS (
        SELECT 1 FROM homework_submissions hs
        WHERE hs.id = homework_comments.submission_id
        AND hs.student_id = auth.uid()
      )
    ) OR
    -- Teacher can read all comments on submissions for their assignments
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      JOIN homework_assignments ha ON ha.id = hs.assignment_id
      JOIN classes c ON c.id = ha.class_id
      WHERE hs.id = homework_comments.submission_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Users can create comments on submissions they're involved with
CREATE POLICY "Users can create relevant homework comments" ON homework_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      -- Student can comment on their own submission
      EXISTS (
        SELECT 1 FROM homework_submissions hs
        WHERE hs.id = homework_comments.submission_id
        AND hs.student_id = auth.uid()
      ) OR
      -- Teacher can comment on submissions for their assignments
      EXISTS (
        SELECT 1 FROM homework_submissions hs
        JOIN homework_assignments ha ON ha.id = hs.assignment_id
        JOIN classes c ON c.id = ha.class_id
        WHERE hs.id = homework_comments.submission_id
        AND c.teacher_id = auth.uid()
      )
    )
  );