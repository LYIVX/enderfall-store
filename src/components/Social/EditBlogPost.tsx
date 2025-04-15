"use client";

import { useState } from 'react';
import CreateBlogPost from './CreateBlogPost';

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  thumbnail_url: string | null;
  is_published: boolean;
  is_pinned: boolean;
  is_markdown?: boolean;
}

interface EditBlogPostProps {
  post: BlogPost;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditBlogPost({ post, isOpen, onClose }: EditBlogPostProps) {
  return (
    <CreateBlogPost
      post={post}
      isOpen={isOpen}
      onClose={onClose}
      isEditing={true}
    />
  );
} 