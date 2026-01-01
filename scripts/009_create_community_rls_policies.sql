-- RLS Policies for Community Features

-- Blog Comments: Public read, authenticated write
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published post comments"
  ON blog_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts 
      WHERE id = blog_comments.blog_post_id AND published = true
    )
  );

CREATE POLICY "Users can create comments"
  ON blog_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comments"
  ON blog_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments"
  ON blog_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Game Reviews: Public read, users write their own
ALTER TABLE game_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON game_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON game_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their reviews"
  ON game_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- User Guides: Public read published guides
ALTER TABLE user_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published guides"
  ON user_guides FOR SELECT
  TO authenticated
  USING (published = true OR auth.uid() = author_id);

CREATE POLICY "Users can create guides"
  ON user_guides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their guides"
  ON user_guides FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Tournaments: Public read, creators manage
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tournaments"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update tournaments"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Tournament Participants: Public read, users join
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants"
  ON tournament_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join tournaments"
  ON tournament_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Polls: Public read and vote
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls"
  ON polls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create polls"
  ON polls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll options"
  ON poll_options FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can vote"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
