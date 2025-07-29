-- Notifications (알림장) table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'urgent', 'event', 'homework', 'reminder')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification read status tracking
CREATE TABLE notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_class_id ON notifications(class_id);
CREATE INDEX idx_notifications_teacher_id ON notifications(teacher_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification_id ON notification_reads(notification_id);

-- Updated at trigger for notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
-- Teachers can create, read, update, delete notifications for their classes
CREATE POLICY "Teachers can manage notifications for their classes" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = notifications.class_id 
      AND classes.teacher_id = auth.uid()
    )
  );

-- Students and parents can read notifications for their classes
CREATE POLICY "Students and parents can read class notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_members 
      WHERE class_members.class_id = notifications.class_id 
      AND class_members.user_id = auth.uid()
    )
  );

-- RLS policies for notification_reads
-- Users can only access their own read status
CREATE POLICY "Users can manage their own read status" ON notification_reads
  FOR ALL USING (auth.uid() = user_id);