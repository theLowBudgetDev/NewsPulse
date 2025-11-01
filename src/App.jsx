import { useState, useEffect, useCallback } from 'react'
import './App.css'

// API configuration
const API_KEY = import.meta.env.VITE_NEWS_API_KEY || 'demo'
const BASE_URL = 'https://newsapi.org/v2'

// Available news categories
const categories = [
  { id: 'general', name: 'Top Headlines' },
  { id: 'technology', name: 'Technology' },
  { id: 'business', name: 'Business' },
  { id: 'sports', name: 'Sports' },
  { id: 'health', name: 'Health' },
  { id: 'science', name: 'Science' },
  { id: 'entertainment', name: 'Entertainment' }
]

function App() {
  // Core state management
  const [articles, setArticles] = useState([]) // Current articles list
  const [loading, setLoading] = useState(true) // Initial loading state
  const [error, setError] = useState(null) // Error messages
  const [activeCategory, setActiveCategory] = useState('general') // Selected news category
  
  // UI state
  const [darkMode, setDarkMode] = useState(() => 
    localStorage.getItem('darkMode') === 'true' // Persist theme preference
  )
  const [showScrollTop, setShowScrollTop] = useState(false) // Show scroll to top button
  const [searchQuery, setSearchQuery] = useState('') // Search input value
  
  // Bookmarks state with localStorage persistence
  const [bookmarks, setBookmarks] = useState(() => 
    JSON.parse(localStorage.getItem('bookmarks') || '[]')
  )
  
  // Pagination state
  const [page, setPage] = useState(1) // Current page number
  const [hasMore, setHasMore] = useState(true) // Whether more articles are available
  const [loadingMore, setLoadingMore] = useState(false) // Loading state for pagination
  
  // Article reader state
  const [selectedArticle, setSelectedArticle] = useState(null) // Currently selected article for reading
  
  // UI enhancement state
  const [toast, setToast] = useState(null) // Toast notification
  const [isRefreshing, setIsRefreshing] = useState(false) // Pull to refresh state
  const [showInstallPrompt, setShowInstallPrompt] = useState(false) // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null) // PWA install event
  const [touchStart, setTouchStart] = useState(0) // Swipe navigation
  const [showHeaderBookmark, setShowHeaderBookmark] = useState(false) // Header bookmark visibility

  // Apply theme changes to document body and persist to localStorage
  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light'
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // PWA install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  // Pull to refresh and swipe navigation
  useEffect(() => {
    let startY = 0
    let currentY = 0
    let startX = 0
    let currentX = 0
    let isPulling = false

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
      isPulling = false
    }

    const handleTouchMove = (e) => {
      currentY = e.touches[0].clientY
      currentX = e.touches[0].clientX
      const diffY = currentY - startY
      const diffX = currentX - startX
      
      // Pull to refresh - only when at top of page
      if (window.scrollY <= 10 && diffY > 50 && Math.abs(diffX) < 30 && !isPulling && !isRefreshing) {
        isPulling = true
        if (diffY > 120) {
          handlePullToRefresh()
        }
      }
    }

    const handleTouchEnd = (e) => {
      const diffX = currentX - startX
      const diffY = Math.abs(currentY - startY)
      
      // Swipe navigation (only if vertical movement is minimal)
      if (Math.abs(diffX) > 100 && diffY < 50) {
        const currentIndex = categories.findIndex(cat => cat.id === activeCategory)
        
        if (diffX > 0 && currentIndex > 0) {
          // Swipe right - previous category
          setActiveCategory(categories[currentIndex - 1].id)
        } else if (diffX < 0 && currentIndex < categories.length - 1) {
          // Swipe left - next category
          setActiveCategory(categories[currentIndex + 1].id)
        }
      }
      
      isPulling = false
    }

    const mainElement = document.querySelector('.main')
    if (mainElement) {
      mainElement.addEventListener('touchstart', handleTouchStart, { passive: true })
      mainElement.addEventListener('touchmove', handleTouchMove, { passive: true })
      mainElement.addEventListener('touchend', handleTouchEnd, { passive: true })
      
      return () => {
        mainElement.removeEventListener('touchstart', handleTouchStart)
        mainElement.removeEventListener('touchmove', handleTouchMove)
        mainElement.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [])

  // Fetch news articles from API with pagination and search support
  const fetchNews = useCallback(async (category, pageNum = 1, reset = false) => {
    if (reset) setLoading(true)
    setError(null)
    
    try {
      // Build API endpoint based on search query or category (English only)
      const endpoint = searchQuery 
        ? `${BASE_URL}/everything?q=${encodeURIComponent(searchQuery)}&language=en&page=${pageNum}&pageSize=12&apiKey=${API_KEY}`
        : category === 'general'
        ? `${BASE_URL}/top-headlines?country=us&language=en&page=${pageNum}&pageSize=12&apiKey=${API_KEY}`
        : `${BASE_URL}/everything?q=${category}&language=en&sortBy=publishedAt&page=${pageNum}&pageSize=12&apiKey=${API_KEY}`
      
      // Use CORS proxy in production to avoid CORS issues
      const proxyUrl = import.meta.env.PROD 
        ? `https://api.allorigins.win/get?url=${encodeURIComponent(endpoint)}`
        : endpoint
      
      const response = await fetch(proxyUrl)
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.')
        }
        throw new Error('Failed to fetch news')
      }
      
      let data = await response.json()
      
      // Parse proxy response in production
      if (import.meta.env.PROD && data.contents) {
        data = JSON.parse(data.contents)
      }
      
      const newArticles = data.articles || []
      
      if (reset) {
        // Replace all articles (new category/search)
        setArticles(newArticles)
      } else {
        // Append new articles, filtering out duplicates by URL
        const uniqueArticles = newArticles.filter(newArticle => 
          !articles.some(existingArticle => existingArticle.url === newArticle.url)
        )
        setArticles(prev => [...prev, ...uniqueArticles])
      }
      
      // Check if more articles are available (full page = more available)
      setHasMore(newArticles.length >= 12)
      setPage(pageNum)
      
    } catch (err) {
      setError(err.message || 'Unable to load news. Please try again later.')
      if (reset) setArticles([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // Reset and fetch news when category or search changes
  useEffect(() => {
    setPage(1)
    setArticles([])
    setHasMore(true)
    fetchNews(activeCategory, 1, true)
  }, [activeCategory, searchQuery, fetchNews])

  // Show/hide scroll to top button and header bookmark based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
      // Show header bookmark when scrolled past search section (approximately 200px)
      setShowHeaderBookmark(window.scrollY > 200)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle manual "Load More" button click
  const handleLoadMore = async () => {
    if (!loading && hasMore && !loadingMore) {
      setLoadingMore(true)
      
      try {
        // Build endpoint for next page (English only)
        const endpoint = searchQuery 
          ? `${BASE_URL}/everything?q=${encodeURIComponent(searchQuery)}&language=en&page=${page + 1}&pageSize=12&apiKey=${API_KEY}`
          : activeCategory === 'general'
          ? `${BASE_URL}/top-headlines?country=us&language=en&page=${page + 1}&pageSize=12&apiKey=${API_KEY}`
          : `${BASE_URL}/everything?q=${activeCategory}&language=en&sortBy=publishedAt&page=${page + 1}&pageSize=12&apiKey=${API_KEY}`
        
        // Use CORS proxy in production
        const proxyUrl = import.meta.env.PROD 
          ? `https://api.allorigins.win/get?url=${encodeURIComponent(endpoint)}`
          : endpoint
        
        const response = await fetch(proxyUrl)
        
        if (response.ok) {
          let data = await response.json()
          
          // Parse proxy response in production
          if (import.meta.env.PROD && data.contents) {
            data = JSON.parse(data.contents)
          }
          
          const newArticles = data.articles || []
          // Filter out duplicates by URL to prevent repeated articles
          const uniqueArticles = newArticles.filter(newArticle => 
            !articles.some(existingArticle => existingArticle.url === newArticle.url)
          )
          setArticles(prev => [...prev, ...uniqueArticles])
          setHasMore(newArticles.length >= 12)
          setPage(prev => prev + 1)
        }
      } catch (err) {
        console.error('Load more error:', err)
      } finally {
        setLoadingMore(false)
      }
    }
  }

  // Smooth scroll to top of page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Pull to refresh handler
  const handlePullToRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    await fetchNews(activeCategory, 1, true)
    setIsRefreshing(false)
    showToast('News refreshed!')
  }

  // Install PWA
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        showToast('App installed successfully!')
      }
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  // Toggle bookmark status and persist to localStorage
  const toggleBookmark = (article) => {
    const articleId = article.url
    const isCurrentlyBookmarked = bookmarks.some(b => b.url === articleId)
    const newBookmarks = isCurrentlyBookmarked
      ? bookmarks.filter(b => b.url !== articleId) // Remove bookmark
      : [...bookmarks, article] // Add bookmark
    
    setBookmarks(newBookmarks)
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
    showToast(isCurrentlyBookmarked ? 'Bookmark removed' : 'Article bookmarked!')
  }

  // Check if article is bookmarked
  const isBookmarked = (article) => {
    return bookmarks.some(b => b.url === article.url)
  }

  // Estimate reading time based on word count (200 words per minute)
  const estimateReadingTime = (text) => {
    const words = (text || '').split(' ').length
    return Math.max(1, Math.ceil(words / 200))
  }

  // Share article using Web Share API or clipboard fallback
  const shareArticle = async (article) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          url: article.url
        })
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(article.url)
        showToast('Link copied to clipboard!')
      }
    } catch (err) {
      console.error('Share failed:', err)
    }
  }

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className="article-card skeleton">
      <div className="skeleton-image"></div>
      <div className="article-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text short"></div>
        <div className="skeleton-meta"></div>
      </div>
    </div>
  )

  // Category icons for navigation
  const getCategoryIcon = (categoryId) => {
    const icons = {
      general: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>,
      technology: <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>,
      business: <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
      sports: <><path d="M7 21h10"/><path d="M12 21v-8"/><path d="M16 16l4-4-4-4"/><path d="M8 16l-4-4 4-4"/><path d="M12 13V8"/><circle cx="12" cy="5" r="2"/></>,
      health: <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>,
      science: <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>,
      entertainment: <path d="M7 4a4 4 0 016.23 3.36l.77-.77a4 4 0 016.23 3.36L12 18 3.77 9.64A4 4 0 017 4zm0 0v12l5-5.5L17 16V4a4 4 0 00-4-4H7a4 4 0 00-4 4z"/>,
      bookmarks: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    }
    return icons[categoryId] || icons.general
  }

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Open article in reader view
  const openArticleReader = (article) => {
    setSelectedArticle(article)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Close article reader and return to main view
  const closeArticleReader = () => {
    setSelectedArticle(null)
  }

  // Filter articles based on search query (title and description)
  const filteredArticles = articles.filter(article => 
    !searchQuery || 
    article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Article reader view
  if (selectedArticle) {
    return (
      <div className="app">
        {/* Header with back button */}
        <header className="header">
          <button 
            className="back-btn"
            onClick={closeArticleReader}
            aria-label="Back to articles"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 12H5m7-7l-7 7 7 7"/>
            </svg>
            Back
          </button>
          <h1>NewsPulse</h1>
          <button 
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              {darkMode ? (
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
              ) : (
                <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
              )}
            </svg>
          </button>
        </header>

        {/* Article reader content */}
        <main className="main">
          <article className="reader-article">
            <div className="reader-layout">
              {/* Article image */}
              <div className="reader-image-section">
                {selectedArticle.urlToImage && (
                  <img 
                    src={selectedArticle.urlToImage} 
                    alt={selectedArticle.title}
                    className="reader-image"
                  />
                )}
              </div>
              
              {/* Article content */}
              <div className="reader-content-section">
                {/* Article header */}
                <header className="reader-header">
                  <h1 className="reader-title">{selectedArticle.title}</h1>
                  
                  <div className="reader-meta">
                    <span className="reader-source">{selectedArticle.source?.name}</span>
                    <span className="reader-date">{formatDate(selectedArticle.publishedAt)}</span>
                    <span className="reader-author">{selectedArticle.author && `By ${selectedArticle.author}`}</span>
                  </div>
                </header>
                
                {/* Article content */}
                <div className="reader-content">
                  <p className="reader-description">{selectedArticle.description}</p>
                  {selectedArticle.content && (
                    <div className="reader-text">
                      {selectedArticle.content.replace(/\[\+\d+ chars\]$/, '')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Source attribution and actions */}
            <footer className="reader-footer">
              <div className="source-attribution">
                <p><strong>Source:</strong> {selectedArticle.source?.name}</p>
                <p><strong>Published:</strong> {formatDate(selectedArticle.publishedAt)}</p>
                <p className="disclaimer">This article is provided for informational purposes. All rights belong to the original publisher.</p>
              </div>
              
              <div className="reader-actions">
                <button 
                  className={`bookmark-btn ${isBookmarked(selectedArticle) ? 'bookmarked' : ''}`}
                  onClick={() => toggleBookmark(selectedArticle)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked(selectedArticle) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                  </svg>
                  {isBookmarked(selectedArticle) ? 'Bookmarked' : 'Bookmark'}
                </button>
                
                <button 
                  className="share-btn"
                  onClick={() => shareArticle(selectedArticle)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                  </svg>
                  Share
                </button>
                
                <a 
                  href={selectedArticle.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="original-link-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3"/>
                  </svg>
                  Read Original
                </a>
              </div>
            </footer>
          </article>
        </main>

        {/* Bottom Navigation - Mobile */}
        <nav className="bottom-nav">
          {categories.map(category => (
            <button
              key={category.id}
              className={`bottom-nav-btn ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
              aria-label={category.name}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {getCategoryIcon(category.id)}
              </svg>
              <span>
                {category.name === 'Top Headlines' ? 'Home' : 
                 category.name === 'Technology' ? 'Tech' :
                 category.name === 'Business' ? 'Business' :
                 category.name === 'Sports' ? 'Sports' :
                 category.name === 'Health' ? 'Health' :
                 category.name === 'Science' ? 'Science' :
                 category.name === 'Entertainment' ? 'Entert...' : category.name}
              </span>
            </button>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header with app title and theme toggle */}
      <header className="header">
        <h1>NewsPulse</h1>
        <div className="header-actions">
          {/* Header bookmark button - shows when scrolled */}
          <button
            className={`header-bookmark ${showHeaderBookmark ? 'visible' : ''} ${activeCategory === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setActiveCategory('bookmarks')}
            title={`Bookmarks (${bookmarks.length})`}
            aria-label="Bookmarks"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
            <span className="bookmark-count">{bookmarks.length}</span>
          </button>
          
          <button 
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle dark mode"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              {darkMode ? (
                // Sun icon for light mode
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
              ) : (
                // Moon icon for dark mode
                <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Search input and bookmarks button */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button
          className={`category-btn bookmark-toggle ${activeCategory === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveCategory('bookmarks')}
          title={`Bookmarks (${bookmarks.length})`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
          <span className="bookmark-text">Bookmarks ({bookmarks.length})</span>
        </button>
      </div>

      {/* Category navigation buttons - Desktop */}
      <nav className="categories desktop-nav">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {getCategoryIcon(category.id)}
            </svg>
            <span>{category.name}</span>
          </button>
        ))}
      </nav>

      {/* Main content area */}
      <main className="main">
        {/* Pull to refresh indicator */}
        {isRefreshing && (
          <div className="refresh-indicator">
            <div className="refresh-spinner"></div>
            <p>Refreshing...</p>
          </div>
        )}

        {/* Loading state with skeleton */}
        {loading && (
          <div className="articles-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={() => fetchNews(activeCategory, 1, true)}>Try Again</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && (activeCategory === 'bookmarks' ? bookmarks : filteredArticles).length === 0 && (
          <div className="empty">
            <p>{activeCategory === 'bookmarks' ? 'No bookmarked articles yet.' : 'No articles found.'}</p>
          </div>
        )}

        {/* Articles grid */}
        {!loading && !error && (activeCategory === 'bookmarks' ? bookmarks : filteredArticles).length > 0 && (
          <div className="articles-grid">
            {(activeCategory === 'bookmarks' ? bookmarks : filteredArticles).map((article, index) => (
              <article key={index} className="article-card animate-in">
                {/* Article image with lazy loading */}
                {article.urlToImage && (
                  <img 
                    src={article.urlToImage} 
                    alt={article.title}
                    className="article-image"
                    loading="lazy"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                
                <div className="article-content">
                  {/* Article header with title and action buttons */}
                  <div className="article-header">
                    <h2 className="article-title">{article.title}</h2>
                    <div className="article-actions">
                      {/* Bookmark button */}
                      <button 
                        className={`bookmark-btn ${isBookmarked(article) ? 'bookmarked' : ''}`}
                        onClick={() => toggleBookmark(article)}
                        aria-label="Bookmark article"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked(article) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                        </svg>
                      </button>
                      
                      {/* Share button */}
                      <button 
                        className="share-btn"
                        onClick={() => shareArticle(article)}
                        aria-label="Share article"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Article description */}
                  <p className="article-description">{article.description}</p>
                  
                  {/* Article metadata */}
                  <div className="article-meta">
                    <span className="article-source">{article.source?.name}</span>
                    <span className="article-date">{formatDate(article.publishedAt)}</span>
                    <span className="reading-time">{estimateReadingTime(article.title + ' ' + article.description)} min read</span>
                  </div>
                  
                  {/* Read more button */}
                  <button 
                    onClick={() => openArticleReader(article)}
                    className="read-more-btn"
                  >
                    Read Article
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        
        {/* Load more button (only for non-bookmark categories) */}
        {hasMore && !loading && activeCategory !== 'bookmarks' && (
          <div className="load-more">
            <button 
              onClick={handleLoadMore} 
              disabled={loadingMore}
              className="load-more-btn"
            >
              {loadingMore ? (
                <>
                  <div className="spinner-small"></div>
                  Loading...
                </>
              ) : (
                'Load More Articles'
              )}
            </button>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="footer">
        <p>© 2024 NewsPulse. Powered by NewsAPI.org</p>
      </footer>
      
      {/* Scroll to top button */}
      {showScrollTop && (
        <button className="scroll-top" onClick={scrollToTop} aria-label="Scroll to top">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l8 8h-6v8h-4v-8H4l8-8z"/>
          </svg>
        </button>
      )}

      {/* Bottom Navigation - Mobile */}
      <nav className="bottom-nav">
        {categories.map(category => (
          <button
            key={category.id}
            className={`bottom-nav-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
            aria-label={category.name}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {getCategoryIcon(category.id)}
            </svg>
            <span>
              {category.name === 'Top Headlines' ? 'Home' : 
               category.name === 'Technology' ? 'Tech' :
               category.name === 'Business' ? 'Business' :
               category.name === 'Sports' ? 'Sports' :
               category.name === 'Health' ? 'Health' :
               category.name === 'Science' ? 'Science' :
               category.name === 'Entertainment' ? 'Entert...' : category.name}
            </span>
          </button>
        ))}
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="install-prompt">
          <div className="install-content">
            <h3>Install NewsPulse</h3>
            <p>Get the full app experience with offline reading and notifications!</p>
            <div className="install-actions">
              <button onClick={handleInstallApp} className="install-btn">
                Install App
              </button>
              <button onClick={() => setShowInstallPrompt(false)} className="dismiss-btn">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App