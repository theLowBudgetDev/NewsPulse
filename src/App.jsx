import { useState, useEffect, useCallback } from 'react'
import './App.css'

// API Configuration
const API_KEY = "d761f420c6b24daf9d15fd5f6bd98517"
const BASE_URL = 'https://newsapi.org/v2'

// News Categories Configuration
const categories = [
  { id: 'general', name: 'General' },
  { id: 'technology', name: 'Technology' },
  { id: 'business', name: 'Business' },
  { id: 'sports', name: 'Sports' },
  { id: 'health', name: 'Health' },
  { id: 'science', name: 'Science' },
  { id: 'entertainment', name: 'Entertainment' }
]

function App() {
  // ===== STATE MANAGEMENT =====
  
  // Core news data state
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('general')
  
  // UI state
  const [darkMode, setDarkMode] = useState(() => 
    localStorage.getItem('darkMode') === 'true'
  )
  const [showScrollTop, setShowScrollTop] = useState(false)
  
  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('')
  
  // Bookmarks state (persisted in localStorage)
  const [bookmarks, setBookmarks] = useState(() => 
    JSON.parse(localStorage.getItem('bookmarks') || '[]')
  )
  
  // Pagination state for infinite scroll
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ===== EFFECTS =====
  
  // Theme management effect
  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light'
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Reset pagination and fetch news when category or search changes
  useEffect(() => {
    setPage(1)
    setArticles([])
    setHasMore(true)
    fetchNews(activeCategory, 1, true)
  }, [activeCategory, searchQuery])

  // Scroll event handler for scroll-to-top button and infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll-to-top button when scrolled down 300px
      setShowScrollTop(window.scrollY > 300)
      
      // Infinite scroll: Load more when near bottom (500px from bottom)
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      
      if (docHeight - scrollTop < 500 && hasMore && !loading && !loadingMore && activeCategory !== 'bookmarks') {
        console.log('Triggering infinite scroll load more')
        loadMore()
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, loadingMore, activeCategory])

  // ===== API FUNCTIONS =====
  
  // Fetch news articles from NewsAPI
  const fetchNews = useCallback(async (category, pageNum = 1, reset = false) => {
    console.log(`Fetching news: category=${category}, page=${pageNum}, reset=${reset}`)
    
    if (reset) setLoading(true)
    setError(null)
    
    try {
      // Build API endpoint based on search query or category
      const endpoint = searchQuery 
        ? `${BASE_URL}/everything?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&pageSize=18&apiKey=${API_KEY}`
        : `${BASE_URL}/top-headlines?country=us&category=${category}&page=${pageNum}&pageSize=18&apiKey=${API_KEY}`
      
      console.log('API Endpoint:', endpoint)
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Failed to fetch news')
      }
      
      const data = await response.json()
      const newArticles = data.articles || []
      console.log(`Received ${newArticles.length} articles`)
      
      // Update articles state (reset or append)
      if (reset) {
        setArticles(newArticles)
      } else {
        setArticles(prev => [...prev, ...newArticles])
      }
      
      // Update pagination state
      setHasMore(newArticles.length === 18) // Has more if we got full page
      setPage(pageNum)
      
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Unable to load news. Please try again later.')
      if (reset) setArticles([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // Load more articles for infinite scroll
  const loadMore = useCallback(async () => {
    if (!loading && hasMore && !loadingMore) {
      console.log('Loading more articles, current page:', page)
      setLoadingMore(true)
      await fetchNews(activeCategory, page + 1, false)
      setLoadingMore(false)
    }
  }, [loading, hasMore, loadingMore, activeCategory, page, fetchNews])

  // ===== UTILITY FUNCTIONS =====
  
  // Scroll to top of page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Toggle bookmark status for an article
  const toggleBookmark = (article) => {
    const articleId = article.url
    const newBookmarks = bookmarks.some(b => b.url === articleId)
      ? bookmarks.filter(b => b.url !== articleId) // Remove bookmark
      : [...bookmarks, article] // Add bookmark
    
    setBookmarks(newBookmarks)
    localStorage.setItem('bookmarks', JSON.stringify(newBookmarks))
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

  // Share article using Web Share API or clipboard
  const shareArticle = (article) => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: article.url
      })
    } else {
      navigator.clipboard.writeText(article.url)
    }
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

  // Filter articles based on search query
  const filteredArticles = articles.filter(article => 
    !searchQuery || 
    article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ===== RENDER =====
  
  return (
    <div className="app">
      {/* Header with title and theme toggle */}
      <header className="header">
        <h1>NewsPulse</h1>
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
      </header>

      {/* Search section with input and bookmarks button */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button
          className={`category-btn ${activeCategory === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveCategory('bookmarks')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem'}}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
          Bookmarks ({bookmarks.length})
        </button>
      </div>

      {/* Category navigation */}
      <nav className="categories">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </nav>

      {/* Main content area */}
      <main className="main">
        {/* Loading state */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading news...</p>
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
              <article key={index} className="article-card">
                {/* Article image */}
                {article.urlToImage && (
                  <img 
                    src={article.urlToImage} 
                    alt={article.title}
                    className="article-image"
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
                  
                  {/* Read more link */}
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more-btn"
                  >
                    Read More
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
        
        {/* Loading more indicator for infinite scroll */}
        {loadingMore && (
          <div className="loading-more">
            <div className="spinner-small"></div>
            <p>Loading more articles...</p>
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
    </div>
  )
}

export default App