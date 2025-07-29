-- =============================================
-- AI Question Analysis System
-- =============================================

-- AI 질문 분석 결과 저장 테이블
CREATE TABLE qa_ai_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES session_qa(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('categorize', 'follow_up', 'answer_suggestions', 'sentiment')),
  analysis_result JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 패턴 분석 결과 저장 테이블
CREATE TABLE qa_pattern_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  time_range VARCHAR(50) NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  analysis_result JSONB NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI 분석 사용 통계 테이블
CREATE TABLE ai_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL,
  session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 자동 타임스탬프 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ai_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qa_ai_analysis_updated_at
  BEFORE UPDATE ON qa_ai_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_analysis_updated_at();

CREATE TRIGGER update_qa_pattern_analysis_updated_at
  BEFORE UPDATE ON qa_pattern_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_analysis_updated_at();

-- 인덱스 생성
CREATE INDEX idx_qa_ai_analysis_question_id ON qa_ai_analysis(question_id);
CREATE INDEX idx_qa_ai_analysis_user_id ON qa_ai_analysis(user_id);
CREATE INDEX idx_qa_ai_analysis_type ON qa_ai_analysis(analysis_type);
CREATE INDEX idx_qa_ai_analysis_created_at ON qa_ai_analysis(created_at);

CREATE INDEX idx_qa_pattern_analysis_session_id ON qa_pattern_analysis(session_id);
CREATE INDEX idx_qa_pattern_analysis_class_id ON qa_pattern_analysis(class_id);
CREATE INDEX idx_qa_pattern_analysis_user_id ON qa_pattern_analysis(user_id);
CREATE INDEX idx_qa_pattern_analysis_created_at ON qa_pattern_analysis(created_at);

CREATE INDEX idx_ai_usage_stats_user_id ON ai_usage_stats(user_id);
CREATE INDEX idx_ai_usage_stats_feature_type ON ai_usage_stats(feature_type);
CREATE INDEX idx_ai_usage_stats_created_at ON ai_usage_stats(created_at);

-- =============================================
-- Row Level Security (RLS) 정책
-- =============================================

-- RLS 활성화
ALTER TABLE qa_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pattern_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;

-- qa_ai_analysis 정책
CREATE POLICY "교사는 자신의 분석 결과를 조회할 수 있습니다" ON qa_ai_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_qa sq
      JOIN class_sessions cs ON sq.session_id = cs.id
      WHERE sq.id = qa_ai_analysis.question_id
      AND cs.teacher_id = auth.uid()
    )
  );

CREATE POLICY "교사는 자신의 분석 결과를 생성할 수 있습니다" ON qa_ai_analysis
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_qa sq
      JOIN class_sessions cs ON sq.session_id = cs.id
      WHERE sq.id = qa_ai_analysis.question_id
      AND cs.teacher_id = auth.uid()
    )
  );

CREATE POLICY "교사는 자신의 분석 결과를 수정할 수 있습니다" ON qa_ai_analysis
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM session_qa sq
      JOIN class_sessions cs ON sq.session_id = cs.id
      WHERE sq.id = qa_ai_analysis.question_id
      AND cs.teacher_id = auth.uid()
    )
  );

CREATE POLICY "교사는 자신의 분석 결과를 삭제할 수 있습니다" ON qa_ai_analysis
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM session_qa sq
      JOIN class_sessions cs ON sq.session_id = cs.id
      WHERE sq.id = qa_ai_analysis.question_id
      AND cs.teacher_id = auth.uid()
    )
  );

-- qa_pattern_analysis 정책
CREATE POLICY "교사는 자신의 패턴 분석을 조회할 수 있습니다" ON qa_pattern_analysis
  FOR SELECT USING (
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM class_sessions
      WHERE id = qa_pattern_analysis.session_id
      AND teacher_id = auth.uid()
    )) OR
    (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classes
      WHERE id = qa_pattern_analysis.class_id
      AND teacher_id = auth.uid()
    ))
  );

CREATE POLICY "교사는 자신의 패턴 분석을 생성할 수 있습니다" ON qa_pattern_analysis
  FOR INSERT WITH CHECK (
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM class_sessions
      WHERE id = qa_pattern_analysis.session_id
      AND teacher_id = auth.uid()
    )) OR
    (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM classes
      WHERE id = qa_pattern_analysis.class_id
      AND teacher_id = auth.uid()
    ))
  );

-- ai_usage_stats 정책
CREATE POLICY "사용자는 자신의 AI 사용 통계를 조회할 수 있습니다" ON ai_usage_stats
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "사용자는 자신의 AI 사용 통계를 생성할 수 있습니다" ON ai_usage_stats
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "사용자는 자신의 AI 사용 통계를 수정할 수 있습니다" ON ai_usage_stats
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- 유틸리티 함수
-- =============================================

-- AI 분석 결과 조회 함수
CREATE OR REPLACE FUNCTION get_question_ai_analysis(
  p_question_id UUID,
  p_analysis_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  analysis_type VARCHAR,
  analysis_result JSONB,
  confidence_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id,
    qa.analysis_type,
    qa.analysis_result,
    qa.confidence_score,
    qa.created_at
  FROM qa_ai_analysis qa
  WHERE qa.question_id = p_question_id
    AND (p_analysis_type IS NULL OR qa.analysis_type = p_analysis_type)
  ORDER BY qa.created_at DESC;
END;
$$;

-- 패턴 분석 결과 조회 함수
CREATE OR REPLACE FUNCTION get_recent_pattern_analysis(
  p_session_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  time_range VARCHAR,
  question_count INTEGER,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.id,
    pa.time_range,
    pa.question_count,
    pa.analysis_result,
    pa.created_at
  FROM qa_pattern_analysis pa
  WHERE (p_session_id IS NULL OR pa.session_id = p_session_id)
    AND (p_class_id IS NULL OR pa.class_id = p_class_id)
  ORDER BY pa.created_at DESC
  LIMIT p_limit;
END;
$$;

-- AI 사용량 업데이트 함수
CREATE OR REPLACE FUNCTION update_ai_usage_stats(
  p_user_id UUID,
  p_feature_type VARCHAR,
  p_session_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_usage_stats (user_id, feature_type, session_id, class_id, usage_count, last_used_at)
  VALUES (p_user_id, p_feature_type, p_session_id, p_class_id, 1, NOW())
  ON CONFLICT (user_id, feature_type, COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(class_id, '00000000-0000-0000-0000-000000000000'::UUID))
  DO UPDATE SET 
    usage_count = ai_usage_stats.usage_count + 1,
    last_used_at = NOW();
END;
$$;

-- =============================================
-- 샘플 데이터 (개발용)
-- =============================================

-- 개발 환경에서만 실행 (필요시)
-- INSERT INTO qa_ai_analysis (question_id, analysis_type, analysis_result, user_id) VALUES
-- (gen_random_uuid(), 'categorize', '{"category": "개념이해", "confidence": 0.95, "reasoning": "기본 개념 질문", "keywords": ["정의", "개념"]}', auth.uid());

COMMENT ON TABLE qa_ai_analysis IS 'AI 질문 분석 결과 저장';
COMMENT ON TABLE qa_pattern_analysis IS 'AI 질문 패턴 분석 결과 저장';
COMMENT ON TABLE ai_usage_stats IS 'AI 기능 사용 통계';

COMMENT ON COLUMN qa_ai_analysis.analysis_type IS '분석 타입: categorize, follow_up, answer_suggestions, sentiment';
COMMENT ON COLUMN qa_ai_analysis.analysis_result IS 'AI 분석 결과 JSON 데이터';
COMMENT ON COLUMN qa_ai_analysis.confidence_score IS '분석 신뢰도 점수 (0.0 ~ 1.0)';

COMMENT ON COLUMN qa_pattern_analysis.time_range IS '분석 기간: 최근 1일, 최근 7일, 최근 30일 등';
COMMENT ON COLUMN qa_pattern_analysis.question_count IS '분석된 질문 개수';
COMMENT ON COLUMN qa_pattern_analysis.analysis_result IS 'AI 패턴 분석 결과 JSON 데이터';

COMMENT ON COLUMN ai_usage_stats.feature_type IS 'AI 기능 타입: question_analysis, pattern_analysis, answer_suggestions 등';
COMMENT ON COLUMN ai_usage_stats.usage_count IS '해당 기능 사용 횟수';