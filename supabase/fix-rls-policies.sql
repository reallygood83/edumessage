-- Fix RLS policies to prevent infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view class members" ON class_members;
DROP POLICY IF EXISTS "Teachers can manage class members" ON class_members;

-- Create safer class_members policies without recursion
CREATE POLICY "Users can view their own class memberships" ON class_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Teachers can manage class members in their classes" ON class_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes c 
            WHERE c.id = class_members.class_id 
            AND c.teacher_id = auth.uid()
        )
    );

-- Also fix the users policy to prevent potential recursion
DROP POLICY IF EXISTS "Teachers can view users in their classes" ON users;

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Teachers can view users in their classes" ON users
    FOR SELECT USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM classes c 
            WHERE c.teacher_id = auth.uid() 
            AND EXISTS (
                SELECT 1 FROM class_members cm 
                WHERE cm.class_id = c.id 
                AND cm.user_id = users.id
            )
        )
    );

-- Fix messages policy to be more explicit
DROP POLICY IF EXISTS "Class members can view messages" ON messages;

CREATE POLICY "Users can view messages in their classes" ON messages
    FOR SELECT USING (
        -- Teachers can see messages in their classes
        EXISTS (
            SELECT 1 FROM classes c 
            WHERE c.id = messages.class_id 
            AND c.teacher_id = auth.uid()
        ) OR
        -- Students can see messages in classes they're members of
        EXISTS (
            SELECT 1 FROM class_members cm 
            WHERE cm.class_id = messages.class_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Fix sessions policies
DROP POLICY IF EXISTS "Students can view sessions" ON sessions;

CREATE POLICY "Users can view sessions in their classes" ON sessions
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM class_members cm 
            WHERE cm.class_id = sessions.class_id 
            AND cm.user_id = auth.uid()
        )
    );

-- Fix homework policies
DROP POLICY IF EXISTS "Students can view homework" ON homework;

CREATE POLICY "Users can view homework in their classes" ON homework
    FOR SELECT USING (
        teacher_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM class_members cm 
            WHERE cm.class_id = homework.class_id 
            AND cm.user_id = auth.uid()
        )
    );