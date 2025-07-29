-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'parent');
CREATE TYPE message_type AS ENUM ('text', 'announcement', 'homework', 'question');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    grade TEXT,
    subject TEXT,
    class_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class members table
CREATE TABLE class_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'student',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type message_type DEFAULT 'text',
    is_approved BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    tags TEXT[] DEFAULT '{}',
    embeds JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework table
CREATE TABLE homework (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework submissions table
CREATE TABLE homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    attachments JSONB DEFAULT '[]'::jsonb,
    grade NUMERIC(5,2),
    feedback TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    UNIQUE(homework_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_class_members_class_id ON class_members(class_id);
CREATE INDEX idx_class_members_user_id ON class_members(user_id);
CREATE INDEX idx_messages_class_id ON messages(class_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_sessions_class_id ON sessions(class_id);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_homework_class_id ON homework(class_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);
CREATE INDEX idx_homework_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX idx_homework_submissions_student_id ON homework_submissions(student_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Teachers can see all users in their classes
CREATE POLICY "Teachers can view users in their classes" ON users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT cm.user_id 
            FROM class_members cm
            JOIN classes c ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
        OR id = auth.uid()
    );

-- Teachers can manage their own classes
CREATE POLICY "Teachers can manage their classes" ON classes
    FOR ALL USING (teacher_id = auth.uid());

-- Students can view classes they belong to
CREATE POLICY "Students can view their classes" ON classes
    FOR SELECT USING (
        id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
    );

-- Class members policies
CREATE POLICY "Teachers can manage class members" ON class_members
    FOR ALL USING (
        class_id IN (
            SELECT id FROM classes WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view class members" ON class_members
    FOR SELECT USING (
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Teachers can create messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        class_id IN (
            SELECT id FROM classes WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can create messages when allowed" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
        -- Additional logic for permission check will be handled in application
    );

CREATE POLICY "Class members can view messages" ON messages
    FOR SELECT USING (
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        ) OR
        class_id IN (
            SELECT id FROM classes WHERE teacher_id = auth.uid()
        )
    );

-- Sessions policies
CREATE POLICY "Teachers can manage sessions" ON sessions
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view sessions" ON sessions
    FOR SELECT USING (
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
    );

-- Homework policies
CREATE POLICY "Teachers can manage homework" ON homework
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view homework" ON homework
    FOR SELECT USING (
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
    );

-- Homework submissions policies
CREATE POLICY "Students can manage their submissions" ON homework_submissions
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view and grade submissions" ON homework_submissions
    FOR ALL USING (
        homework_id IN (
            SELECT id FROM homework WHERE teacher_id = auth.uid()
        )
    );

-- Create functions for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON homework
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();