-- Class sessions table
CREATE TABLE class_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  session_type VARCHAR(50) DEFAULT 'lecture' CHECK (session_type IN ('lecture', 'discussion', 'workshop', 'presentation', 'quiz', 'review')),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER,
  allow_late_join BOOLEAN DEFAULT TRUE,
  recording_enabled BOOLEAN DEFAULT FALSE,
  chat_enabled BOOLEAN DEFAULT TRUE,
  qa_enabled BOOLEAN DEFAULT TRUE,
  screen_sharing_enabled BOOLEAN DEFAULT TRUE,
  attendance_tracking BOOLEAN DEFAULT TRUE,
  session_url TEXT, -- For external meeting platforms
  meeting_id VARCHAR(100), -- Platform-specific meeting ID
  passcode VARCHAR(50), -- Meeting passcode if required
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session multimedia content
CREATE TABLE session_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'audio', 'document', 'presentation', 'image', 'link', 'embed')),
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER, -- in bytes
  duration INTEGER, -- in seconds for media
  order_index INTEGER DEFAULT 0,
  is_downloadable BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participants (attendance tracking)
CREATE TABLE session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- calculated field
  participation_score INTEGER DEFAULT 0 CHECK (participation_score >= 0 AND participation_score <= 100),
  notes TEXT, -- Teacher notes about student participation
  status VARCHAR(20) DEFAULT 'joined' CHECK (status IN ('joined', 'left', 'kicked', 'reconnected')),
  UNIQUE(session_id, user_id)
);

-- Session chat messages
CREATE TABLE session_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'emoji', 'system')),
  reply_to_id UUID REFERENCES session_chat(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Q&A
CREATE TABLE session_qa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who answered
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'dismissed')),
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  votes INTEGER DEFAULT 0, -- Student votes for question importance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE
);

-- Session recordings
CREATE TABLE session_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  recording_url TEXT NOT NULL,
  duration_minutes INTEGER,
  file_size INTEGER,
  thumbnail_url TEXT,
  is_processed BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  access_level VARCHAR(20) DEFAULT 'class' CHECK (access_level IN ('public', 'class', 'teacher_only')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX idx_class_sessions_teacher_id ON class_sessions(teacher_id);
CREATE INDEX idx_class_sessions_scheduled_start ON class_sessions(scheduled_start);
CREATE INDEX idx_class_sessions_status ON class_sessions(status);
CREATE INDEX idx_session_content_session_id ON session_content(session_id);
CREATE INDEX idx_session_content_order ON session_content(session_id, order_index);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_chat_session_id ON session_chat(session_id);
CREATE INDEX idx_session_chat_created_at ON session_chat(created_at);
CREATE INDEX idx_session_qa_session_id ON session_qa(session_id);
CREATE INDEX idx_session_qa_status ON session_qa(status);
CREATE INDEX idx_session_recordings_session_id ON session_recordings(session_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_class_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER class_sessions_updated_at
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_class_sessions_updated_at();

-- Function to calculate participation duration
CREATE OR REPLACE FUNCTION calculate_participation_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND NEW.joined_at IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_participants_duration
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION calculate_participation_duration();

-- Row Level Security (RLS)
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for class_sessions
-- Teachers can manage sessions for their classes
CREATE POLICY "Teachers can manage sessions for their classes" ON class_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = class_sessions.class_id 
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students can read sessions for their classes
CREATE POLICY "Students can read sessions for their classes" ON class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_members 
      WHERE class_members.class_id = class_sessions.class_id 
      AND class_members.user_id = auth.uid()
    )
  );

-- RLS policies for session_content
-- Teachers can manage content for their sessions
CREATE POLICY "Teachers can manage session content" ON session_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_content.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can read content for sessions they can access
CREATE POLICY "Students can read session content" ON session_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN class_members cm ON cm.class_id = cs.class_id
      WHERE cs.id = session_content.session_id
      AND cm.user_id = auth.uid()
    )
  );

-- RLS policies for session_participants
-- Users can read their own participation records
CREATE POLICY "Users can read their own participation" ON session_participants
  FOR SELECT USING (auth.uid() = user_id);

-- Teachers can manage participation for their sessions
CREATE POLICY "Teachers can manage session participation" ON session_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_participants.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Users can create their own participation records
CREATE POLICY "Users can join sessions" ON session_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for session_chat
-- Users can read chat for sessions they can access
CREATE POLICY "Users can read session chat" ON session_chat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN class_members cm ON cm.class_id = cs.class_id
      WHERE cs.id = session_chat.session_id
      AND cm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_chat.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Users can create chat messages in sessions they can access
CREATE POLICY "Users can create session chat" ON session_chat
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM class_sessions cs
        JOIN class_members cm ON cm.class_id = cs.class_id
        WHERE cs.id = session_chat.session_id
        AND cm.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM class_sessions cs
        JOIN classes c ON c.id = cs.class_id
        WHERE cs.id = session_chat.session_id
        AND c.teacher_id = auth.uid()
      )
    )
  );

-- RLS policies for session_qa
-- Similar policies for Q&A
CREATE POLICY "Users can read session QA" ON session_qa
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN class_members cm ON cm.class_id = cs.class_id
      WHERE cs.id = session_qa.session_id
      AND cm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_qa.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can create questions, teachers can answer
CREATE POLICY "Students can ask questions" ON session_qa
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teachers can update Q&A for their sessions
CREATE POLICY "Teachers can manage session QA" ON session_qa
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_qa.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS policies for session_recordings
-- Similar to session content policies
CREATE POLICY "Teachers can manage session recordings" ON session_recordings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = session_recordings.session_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read available recordings" ON session_recordings
  FOR SELECT USING (
    is_available = TRUE AND (
      access_level = 'public' OR
      (access_level = 'class' AND EXISTS (
        SELECT 1 FROM class_sessions cs
        JOIN class_members cm ON cm.class_id = cs.class_id
        WHERE cs.id = session_recordings.session_id
        AND cm.user_id = auth.uid()
      ))
    )
  );