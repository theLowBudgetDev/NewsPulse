# NewsPulse Dashboard

A modern, responsive news dashboard built with React and Vite that aggregates top headlines from various categories using the NewsAPI.

## Features

- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile
- 🌙 **Dark/Light Mode** - Toggle between themes with persistent preference
- 📰 **Category Navigation** - Browse news by General, Technology, Business, Sports, Health, Science, Entertainment
- 🔄 **Real-time Updates** - Fresh news content with loading states
- 🎨 **Modern UI** - Clean, minimalistic design with smooth animations
- ⚡ **Fast Performance** - Built with Vite for optimal loading speeds

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd NewsPulse
   npm install
   ```

2. **Get NewsAPI Key**
   - Visit [NewsAPI.org](https://newsapi.org/)
   - Sign up for a free account
   - Copy your API key

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API key:
   VITE_NEWS_API_KEY=your_actual_api_key_here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **NewsAPI** - News data source
- **CSS Grid/Flexbox** - Responsive layouts
- **CSS Variables** - Theme system

## Deployment

The app is ready to deploy to:
- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use GitHub Actions

## API Usage

The app uses NewsAPI.org which provides:
- 1000 free requests per day
- Top headlines by category
- Global news coverage
- Real-time updates

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - feel free to use this project for learning or commercial purposes.