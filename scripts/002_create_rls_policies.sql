-- Profiles RLS policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Blog posts RLS policies
CREATE POLICY "blog_posts_select_published" ON public.blog_posts FOR SELECT USING (published = TRUE);
CREATE POLICY "blog_posts_select_own" ON public.blog_posts FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "blog_posts_insert_own" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "blog_posts_update_own" ON public.blog_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "blog_posts_delete_own" ON public.blog_posts FOR DELETE USING (auth.uid() = author_id);

-- Games RLS policies
CREATE POLICY "games_select_all" ON public.games FOR SELECT USING (TRUE);

-- User stats RLS policies
CREATE POLICY "user_stats_select_own" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_stats_select_public" ON public.user_stats FOR SELECT USING (TRUE);
CREATE POLICY "user_stats_insert_own" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_stats_update_own" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Achievements RLS policies
CREATE POLICY "achievements_select_all" ON public.achievements FOR SELECT USING (TRUE);

-- User achievements RLS policies
CREATE POLICY "user_achievements_select_own" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_select_public" ON public.user_achievements FOR SELECT USING (TRUE);
CREATE POLICY "user_achievements_insert_own" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blog comments RLS policies
CREATE POLICY "blog_comments_select_published_posts" ON public.blog_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM blog_posts WHERE blog_posts.id = post_id AND blog_posts.published = TRUE)
);
CREATE POLICY "blog_comments_insert_authenticated" ON public.blog_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "blog_comments_update_own" ON public.blog_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "blog_comments_delete_own" ON public.blog_comments FOR DELETE USING (auth.uid() = author_id);

-- Settings RLS policies
CREATE POLICY "settings_select_all" ON public.settings FOR SELECT USING (TRUE);
