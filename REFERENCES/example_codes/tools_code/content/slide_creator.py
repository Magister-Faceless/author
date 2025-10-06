"""
Slide Creator Tool for Agents

This tool allows agents to create beautiful HTML slide presentations
similar to those created by Qwen platform and Manus AI.
"""

from langchain_core.tools import tool
from typing import List, Dict, Any, Optional
import json
import uuid
from datetime import datetime

from core.storage.folder_manager import get_folder_manager


def get_thread_id_from_context() -> str:
    """Get thread ID from current context or generate a default one.
    
    In the DeepAgents framework, we'll use a default thread ID for now.
    This can be enhanced later to extract from the actual agent context.
    """
    # For now, use a consistent default thread ID
    # This ensures all files go to the same thread
    return "default-thread"


# Modern slide template with reveal.js-like styling
SLIDE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Inline fallback styles */
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; }}
        .presentation {{ width: 100vw; height: 100vh; overflow: hidden; }}
        .slide {{ display: none; width: 100%; height: 100%; padding: 60px; box-sizing: border-box; }}
        .slide.active {{ display: flex; flex-direction: column; justify-content: center; align-items: center; }}
        .slide h1 {{ font-size: 3em; margin-bottom: 0.5em; text-align: center; }}
        .slide h2 {{ font-size: 2.5em; margin-bottom: 0.5em; text-align: center; }}
        .slide p {{ font-size: 1.5em; line-height: 1.6; text-align: center; max-width: 800px; }}
        .controls {{ position: fixed; bottom: 20px; right: 20px; z-index: 1000; }}
        .controls button {{ margin: 0 5px; padding: 10px 15px; font-size: 16px; cursor: pointer; }}
    </style>
</head>
<body>
    <div class="presentation">
        {slides_html}
    </div>
    
    <div class="controls">
        <button onclick="previousSlide()">← Previous</button>
        <button onclick="nextSlide()">Next →</button>
        <span id="slideCounter">1 / {total_slides}</span>
    </div>
    
    <script src="script.js"></script>
    <script>
        // Inline fallback JavaScript
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        
        function showSlide(n) {{
            slides[currentSlide].classList.remove('active');
            currentSlide = (n + totalSlides) % totalSlides;
            slides[currentSlide].classList.add('active');
            document.getElementById('slideCounter').textContent = `${{currentSlide + 1}} / ${{totalSlides}}`;
        }}
        
        function nextSlide() {{ showSlide(currentSlide + 1); }}
        function previousSlide() {{ showSlide(currentSlide - 1); }}
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {{
            if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') previousSlide();
        }});
        
        // Initialize
        if (slides.length > 0) slides[0].classList.add('active');
    </script>
</body>
</html>"""

# Modern CSS styles
SLIDE_CSS = """/* Modern Slide Presentation Styles */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    overflow: hidden;
}

.presentation {
    width: 100vw;
    height: 100vh;
    position: relative;
}

.slide {
    display: none;
    width: 100%;
    height: 100%;
    padding: 60px;
    position: absolute;
    top: 0;
    left: 0;
    background: inherit;
    transition: all 0.5s ease-in-out;
}

.slide.active {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}

/* Typography */
.slide h1 {
    font-size: 3.5em;
    font-weight: 700;
    margin-bottom: 0.5em;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    animation: fadeInUp 1s ease-out;
}

.slide h2 {
    font-size: 2.8em;
    font-weight: 600;
    margin-bottom: 0.5em;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    animation: fadeInUp 1s ease-out 0.2s both;
}

.slide h3 {
    font-size: 2.2em;
    font-weight: 500;
    margin-bottom: 0.5em;
    animation: fadeInUp 1s ease-out 0.3s both;
}

.slide p {
    font-size: 1.6em;
    line-height: 1.6;
    max-width: 900px;
    margin: 0 auto 1em;
    animation: fadeInUp 1s ease-out 0.4s both;
}

.slide ul, .slide ol {
    font-size: 1.4em;
    line-height: 1.8;
    max-width: 800px;
    text-align: left;
    animation: fadeInUp 1s ease-out 0.5s both;
}

.slide li {
    margin-bottom: 0.5em;
    padding-left: 0.5em;
}

/* Special slide types */
.slide.title-slide {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.slide.content-slide {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.slide.conclusion-slide {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* Controls */
.controls {
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 15px;
}

.controls button {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.controls button:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
}

#slideCounter {
    background: rgba(0, 0, 0, 0.3);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    backdrop-filter: blur(10px);
}

/* Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Progress bar */
.progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: rgba(255, 255, 255, 0.8);
    transition: width 0.3s ease;
    z-index: 1001;
}

/* Responsive design */
@media (max-width: 768px) {
    .slide {
        padding: 40px 20px;
    }
    
    .slide h1 { font-size: 2.5em; }
    .slide h2 { font-size: 2em; }
    .slide h3 { font-size: 1.8em; }
    .slide p { font-size: 1.3em; }
    .slide ul, .slide ol { font-size: 1.2em; }
    
    .controls {
        bottom: 20px;
        right: 20px;
    }
    
    .controls button {
        padding: 10px 15px;
        font-size: 14px;
    }
}"""

# JavaScript for slide functionality
SLIDE_JS = """// Modern Slide Presentation JavaScript

class SlidePresentation {
    constructor() {
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.slide');
        this.totalSlides = this.slides.length;
        this.progressBar = this.createProgressBar();
        
        this.init();
    }
    
    init() {
        if (this.slides.length > 0) {
            this.slides[0].classList.add('active');
            this.updateCounter();
            this.updateProgressBar();
        }
        
        this.bindEvents();
    }
    
    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        document.body.appendChild(progressBar);
        return progressBar;
    }
    
    bindEvents() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowRight':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.previousSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.totalSlides - 1);
                    break;
            }
        });
        
        // Touch/swipe support
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Only trigger if horizontal swipe is dominant
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > 50) { // Minimum swipe distance
                    if (diffX > 0) {
                        this.nextSlide();
                    } else {
                        this.previousSlide();
                    }
                }
            }
            
            startX = 0;
            startY = 0;
        });
    }
    
    showSlide(n) {
        if (n < 0 || n >= this.totalSlides) return;
        
        this.slides[this.currentSlide].classList.remove('active');
        this.currentSlide = n;
        this.slides[this.currentSlide].classList.add('active');
        
        this.updateCounter();
        this.updateProgressBar();
    }
    
    nextSlide() {
        const next = (this.currentSlide + 1) % this.totalSlides;
        this.showSlide(next);
    }
    
    previousSlide() {
        const prev = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.showSlide(prev);
    }
    
    goToSlide(n) {
        this.showSlide(n);
    }
    
    updateCounter() {
        const counter = document.getElementById('slideCounter');
        if (counter) {
            counter.textContent = `${this.currentSlide + 1} / ${this.totalSlides}`;
        }
    }
    
    updateProgressBar() {
        const progress = ((this.currentSlide + 1) / this.totalSlides) * 100;
        this.progressBar.style.width = `${progress}%`;
    }
}

// Global functions for button controls
function nextSlide() {
    if (window.slidePresentation) {
        window.slidePresentation.nextSlide();
    }
}

function previousSlide() {
    if (window.slidePresentation) {
        window.slidePresentation.previousSlide();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.slidePresentation = new SlidePresentation();
});"""


@tool
def create_slide_presentation(
    title: str,
    slides_data: List[Dict[str, Any]],
    folder_path: str = "/slides",
    theme: str = "modern"
) -> str:
    """Create a beautiful HTML slide presentation.
    
    Args:
        title: Presentation title
        slides_data: List of slide dictionaries with 'type', 'title', 'content', etc.
        folder_path: Folder to save the presentation (default: /slides)
        theme: Theme name (default: modern)
    
    Slide data format:
        {
            "type": "title|content|conclusion",
            "title": "Slide Title",
            "content": "Slide content or HTML",
            "background": "gradient-class (optional)"
        }
    
    Returns:
        Success message with file paths
    
    Example:
        create_slide_presentation(
            "My Research Presentation",
            [
                {"type": "title", "title": "Research Overview", "content": "A comprehensive study"},
                {"type": "content", "title": "Methodology", "content": "<ul><li>Data collection</li><li>Analysis</li></ul>"},
                {"type": "conclusion", "title": "Conclusions", "content": "Key findings and implications"}
            ]
        )
    """
    try:
        thread_id = get_thread_id_from_context()
        if not thread_id:
            return "❌ Error: No active thread found"
        
        # Create folder
        folder_manager = get_folder_manager()
        folder = folder_manager.create_folder(
            thread_id=thread_id,
            folder_path=folder_path,
            created_by_agent="slide_creator"
        )
        
        # Generate slides HTML
        slides_html = ""
        for i, slide in enumerate(slides_data):
            slide_type = slide.get('type', 'content')
            slide_title = slide.get('title', f'Slide {i+1}')
            slide_content = slide.get('content', '')
            background_class = slide.get('background', f'{slide_type}-slide')
            
            slides_html += f"""
        <div class="slide {background_class}">
            <h2>{slide_title}</h2>
            <div class="slide-content">
                {slide_content}
            </div>
        </div>"""
        
        # Generate HTML file
        html_content = SLIDE_TEMPLATE.format(
            title=title,
            slides_html=slides_html,
            total_slides=len(slides_data)
        )
        
        # Save files using write_file (this would need to be integrated with enhanced file manager)
        from src.deepagents.tools import write_file
        
        html_path = f"{folder_path.rstrip('/')}/index.html"
        css_path = f"{folder_path.rstrip('/')}/styles.css"
        js_path = f"{folder_path.rstrip('/')}/script.js"
        
        # Write files
        html_result = write_file(html_path, html_content)
        css_result = write_file(css_path, SLIDE_CSS)
        js_result = write_file(js_path, SLIDE_JS)
        
        return f"✅ Slide presentation created successfully!\n" \
               f"   Title: {title}\n" \
               f"   Slides: {len(slides_data)}\n" \
               f"   Folder: {folder_path}\n" \
               f"   Files created:\n" \
               f"   • index.html (main presentation)\n" \
               f"   • styles.css (styling)\n" \
               f"   • script.js (interactivity)\n" \
               f"\n" \
               f"📖 How to use:\n" \
               f"   • Open index.html in a web browser\n" \
               f"   • Use arrow keys or buttons to navigate\n" \
               f"   • Swipe on mobile devices\n" \
               f"   • Press Home/End for first/last slide"
    
    except Exception as e:
        return f"❌ Error creating slide presentation: {str(e)}"


@tool
def create_simple_slides(title: str, slide_titles: List[str], slide_contents: List[str]) -> str:
    """Create a simple slide presentation with title and content slides.
    
    Args:
        title: Presentation title
        slide_titles: List of slide titles
        slide_contents: List of slide contents (same length as titles)
    
    Returns:
        Success message
    
    Example:
        create_simple_slides(
            "Literature Review Results",
            ["Introduction", "Methodology", "Findings", "Conclusion"],
            ["Overview of the research topic", "Data collection methods", "Key findings", "Summary and implications"]
        )
    """
    if len(slide_titles) != len(slide_contents):
        return "❌ Error: slide_titles and slide_contents must have the same length"
    
    # Create slides data
    slides_data = []
    
    # Title slide
    slides_data.append({
        "type": "title",
        "title": title,
        "content": f"<p>Presentation Overview</p>"
    })
    
    # Content slides
    for i, (slide_title, slide_content) in enumerate(zip(slide_titles, slide_contents)):
        slide_type = "conclusion" if i == len(slide_titles) - 1 else "content"
        slides_data.append({
            "type": slide_type,
            "title": slide_title,
            "content": f"<p>{slide_content}</p>"
        })
    
    return create_slide_presentation(title, slides_data)


# Export tools
__all__ = ["create_slide_presentation", "create_simple_slides"]
