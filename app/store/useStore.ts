import { create } from 'zustand'
import { Post, User } from '../types'
import { mockPosts, mockUsers } from '../lib/mockData'

interface AppState {
  posts: Post[]
  currentUser: User | null
  likedPosts: Set<string>
  repostedPosts: Set<string>
  following: Set<string>
  
  // Actions
  addPost: (post: Post) => void
  likePost: (postId: string) => void
  unlikePost: (postId: string) => void
  repost: (postId: string) => void
  followUser: (userId: string) => void
  unfollowUser: (userId: string) => void
  setCurrentUser: (user: User | null) => void
}

export const useStore = create<AppState>((set) => ({
  posts: mockPosts,
  currentUser: mockUsers[2], // Default user
  likedPosts: new Set(),
  repostedPosts: new Set(),
  following: new Set(),
  
  addPost: (post) => set((state) => ({
    posts: [post, ...state.posts]
  })),
  
  likePost: (postId) => set((state) => {
    const newLiked = new Set(state.likedPosts)
    newLiked.add(postId)
    return {
      likedPosts: newLiked,
      posts: state.posts.map(p => 
        p.id === postId 
          ? { ...p, stats: { ...p.stats, likes: p.stats.likes + 1 } }
          : p
      )
    }
  }),
  
  unlikePost: (postId) => set((state) => {
    const newLiked = new Set(state.likedPosts)
    newLiked.delete(postId)
    return {
      likedPosts: newLiked,
      posts: state.posts.map(p => 
        p.id === postId 
          ? { ...p, stats: { ...p.stats, likes: Math.max(0, p.stats.likes - 1) } }
          : p
      )
    }
  }),
  
  repost: (postId) => set((state) => {
    const newReposted = new Set(state.repostedPosts)
    if (newReposted.has(postId)) {
      newReposted.delete(postId)
      return {
        repostedPosts: newReposted,
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, stats: { ...p.stats, reposts: Math.max(0, p.stats.reposts - 1) } }
            : p
        )
      }
    } else {
      newReposted.add(postId)
      return {
        repostedPosts: newReposted,
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, stats: { ...p.stats, reposts: p.stats.reposts + 1 } }
            : p
        )
      }
    }
  }),
  
  followUser: (userId) => set((state) => {
    const newFollowing = new Set(state.following)
    newFollowing.add(userId)
    return { following: newFollowing }
  }),
  
  unfollowUser: (userId) => set((state) => {
    const newFollowing = new Set(state.following)
    newFollowing.delete(userId)
    return { following: newFollowing }
  }),
  
  setCurrentUser: (user) => set({ currentUser: user }),
}))
