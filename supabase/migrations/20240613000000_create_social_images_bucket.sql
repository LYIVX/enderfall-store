-- Create social_images bucket for social post image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('social_images', 'social_images', true);

-- Allow public access for viewing images
CREATE POLICY "Social images are publicly accessible" 
ON storage.objects FOR SELECT
USING (bucket_id = 'social_images');

-- Allow authenticated users to insert their own images
CREATE POLICY "Users can upload their own social images" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'social_images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own social images" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'social_images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own social images" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'social_images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
); 