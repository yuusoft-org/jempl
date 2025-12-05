# Use Case: YAHTML Templates with Jempl

## Overview

**YAHTML (YAML HTML)** is a markup language that transforms HTML into valid YAML syntax, making it more concise and readable than traditional HTML. When combined with **Jempl**, YAHTML becomes a powerful templating solution for building static sites, web applications, and component-based UI systems.

This use case demonstrates how Jempl's templating engine powers YAHTML-based projects, enabling developers to write clean, maintainable HTML structures with dynamic data, conditionals, loops, and reusable components—all in YAML format.

## What is YAHTML?

YAHTML lets you write HTML as 100% valid YAML. Instead of verbose HTML tags with opening and closing elements, YAHTML uses YAML's hierarchical structure defined by indentation.

### Traditional HTML vs YAHTML

**HTML:**
```html
<div id="home">
  <div class="header">
    <h2 class="title">Welcome</h2>
  </div>
  <div class="body">
    <p class="text">Hello World!</p>
  </div>
</div>
```

**YAHTML:**
```yaml
- div#home:
  - div.header:
    - h2.title: "Welcome"
  - div.body:
    - p.text: "Hello World!"
```

### Key Benefits

- **100% valid YAML syntax**: Can be parsed as YAML/JSON by standard tools
- **No closing tags**: Structure is defined by indentation
- **Reduced visual noise**: Cleaner and more readable
- **Clear hierarchy**: Indentation reveals document structure at a glance
- **Simplified notation**: CSS-style selectors for classes and IDs

## Jempl's Role in YAHTML

Jempl brings dynamic templating capabilities to YAHTML, enabling:

1. **Variable replacement** - `${variable}`
2. **Conditionals** - `$if`, `$elif`, `$else`, `$when`
3. **Loops** - `$for`, `$each`
4. **Partials** - `$partial` for reusable components
5. **Custom functions** - Extensible data transformation
6. **Path references** - `#{variable}` for data binding

This combination creates a powerful, type-safe templating system where the entire template remains valid YAML, making it easy to parse, validate, and integrate with existing tooling.

## Real-World Implementation: Rettangoli Sites

**Rettangoli Sites** is a zero-configuration static site generator that demonstrates Jempl's versatility in production. It uses YAHTML templates powered by Jempl to generate websites from Markdown and YAML content.

### Project Structure

```
my-site/
├── pages/           # Content files (YAML/Markdown)
├── templates/       # Page templates (YAHTML)
├── partials/        # Reusable components
├── data/            # Global data files
├── static/          # Assets (CSS, JS, images)
└── _site/           # Generated output
```

### Example: Index Page Template

From `rettangoli.dev/pages/index.yaml`:

```yaml
template: base
title: Rettangoli
---
- rtgl-view:
    - $partial: hero1
      title: ${site.hero.title}
      subtitle: ${site.hero.subtitle}
      cta: ${site.hero.cta}
```

This simple template demonstrates several Jempl features:

- **Frontmatter**: Metadata using `template` and `title` fields
- **YAHTML structure**: `rtgl-view` custom element
- **Partial inclusion**: `$partial: hero1` loads a reusable hero component
- **Variable replacement**: `${site.hero.title}` injects dynamic data

## Detailed Examples

### 1. Building a Navigation Menu

**Template (`partials/nav.yaml`):**
```yaml
- nav.main-nav:
  - ul.nav-list:
    - $each: item in navigation
      $when: item.visible
      - li.nav-item:
          class: "$if item.active: active"
        - a href="${item.url}":
            - "${item.label}"
```

**Data:**
```json
{
  "navigation": [
    { "label": "Home", "url": "/", "visible": true, "active": true },
    { "label": "About", "url": "/about", "visible": true, "active": false },
    { "label": "Contact", "url": "/contact", "visible": true, "active": false },
    { "label": "Hidden", "url": "/hidden", "visible": false, "active": false }
  ]
}
```

**Generated HTML:**
```html
<nav class="main-nav">
  <ul class="nav-list">
    <li class="nav-item active">
      <a href="/">Home</a>
    </li>
    <li class="nav-item">
      <a href="/about">About</a>
    </li>
    <li class="nav-item">
      <a href="/contact">Contact</a>
    </li>
  </ul>
</nav>
```

### 2. Hero Section with Partials

**Partial (`partials/hero1.yaml`):**
```yaml
- section.hero:
  - div.hero-content:
    - h1.hero-title: "${title}"
    - p.hero-subtitle: "${subtitle}"
    - $if cta:
      - a.hero-cta href="${cta.url}": "${cta.text}"
```

**Usage in Page:**
```yaml
- div#home:
  - $partial: hero1
    title: "Build Faster with YAHTML"
    subtitle: "Write HTML in YAML with Jempl templating"
    cta:
      text: "Get Started"
      url: "/docs"
```

**Output:**
```html
<div id="home">
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Build Faster with YAHTML</h1>
      <p class="hero-subtitle">Write HTML in YAML with Jempl templating</p>
      <a class="hero-cta" href="/docs">Get Started</a>
    </div>
  </section>
</div>
```

### 3. Blog Post List with Loops

**Template:**
```yaml
- section.blog:
  - h2: "Recent Posts"
  - div.posts:
    - $each: post, idx in posts
      $when: post.published
      - article.post:
        - header:
          - h3: "${post.title}"
          - span.date: "${post.date}"
        - div.excerpt: "${post.excerpt}"
        - a.read-more href="${post.url}": "Read More"
        - $if idx == 0:
          - span.badge: "Latest"
```

**Data:**
```json
{
  "posts": [
    {
      "title": "Getting Started with YAHTML",
      "date": "2024-01-15",
      "excerpt": "Learn the basics...",
      "url": "/blog/getting-started",
      "published": true
    },
    {
      "title": "Advanced Jempl Techniques",
      "date": "2024-01-10",
      "excerpt": "Deep dive into...",
      "url": "/blog/advanced-jempl",
      "published": true
    }
  ]
}
```

### 4. Conditional Layouts

**Template:**
```yaml
- div.page:
  - $if layout == "grid":
    - div.grid:
      - $each: item in items
        - div.grid-item: "${item.content}"
  - $elif layout == "list":
    - ul.list:
      - $each: item in items
        - li.list-item: "${item.content}"
  - $else:
    - div.default:
      - $each: item in items
        - div.item: "${item.content}"
```

### 5. Form Generation with Attributes

**Template:**
```yaml
- form#contact-form method="POST" action="/submit":
  - $each: field in formFields
    - div.form-group:
      - label for="${field.id}": "${field.label}"
      - $if field.type == "textarea":
        - textarea#${field.id} name="${field.name}" placeholder="${field.placeholder}":
      - $elif field.type == "select":
        - select#${field.id} name="${field.name}":
          - $each: option in field.options
            - option value="${option.value}": "${option.label}"
      - $else:
        - input#${field.id} type="${field.type}" name="${field.name}" placeholder="${field.placeholder}":
  - button.submit type="submit": "Submit"
```

**Data:**
```json
{
  "formFields": [
    {
      "id": "name",
      "name": "name",
      "label": "Your Name",
      "type": "text",
      "placeholder": "John Doe"
    },
    {
      "id": "message",
      "name": "message",
      "label": "Message",
      "type": "textarea",
      "placeholder": "Your message..."
    },
    {
      "id": "topic",
      "name": "topic",
      "label": "Topic",
      "type": "select",
      "options": [
        { "value": "general", "label": "General Inquiry" },
        { "value": "support", "label": "Support" }
      ]
    }
  ]
}
```

## Advanced Patterns

### Component-Based Architecture

Create reusable components with nested partials:

**Layout Template (`templates/base.yaml`):**
```yaml
- html lang="en":
  - head:
    - meta charset="UTF-8":
    - title: "${title} - ${site.name}"
    - link rel="stylesheet" href="/css/main.css":
  - body:
    - $partial: header
    - main:
      - "${content}"
    - $partial: footer
```

**Header Partial (`partials/header.yaml`):**
```yaml
- header.site-header:
  - div.container:
    - $partial: logo
    - $partial: nav
```

This creates a modular architecture where components can be mixed and matched.

### Data Transformation with Functions

```yaml
- section.stats:
  - h2: "Statistics"
  - div.stat-grid:
    - $each: stat in sortBy(stats, 'value')
      - div.stat-card:
        - h3: "${stat.label}"
        - p.value: "${formatNumber(stat.value)}"
        - span.trend class="$if stat.trend > 0: positive $else: negative":
            "${stat.trend}%"
```

With custom functions:
```javascript
const functions = {
  sortBy: (arr, key) => [...arr].sort((a, b) => b[key] - a[key]),
  formatNumber: (num) => num.toLocaleString('en-US'),
};
```

### Path References for Data Binding

For interactive applications that need two-way data binding:

```yaml
- form:
  - $each: field, idx in formFields
    - input data-bind="#{field.value}"
            type="${field.type}"
            value="${field.value}":
```

This generates:
```html
<input data-bind="formFields[0].value" type="text" value="John">
<input data-bind="formFields[1].value" type="email" value="john@example.com">
```

Perfect for frameworks that need to know the data source path.

## Performance Considerations

Jempl's two-phase approach (Parse → Render) is ideal for static site generation:

1. **Build Time (Parse)**: Template validation and AST generation happen once during build
2. **Runtime (Render)**: Fast rendering with data, optimized for repeated use

For a typical YAHTML page template:
- **Parse time**: ~1-2ms (one-time cost)
- **Render time**: ~0.1-0.5ms per page
- **Performance**: Can generate 2,000+ pages/second

This makes it excellent for:
- Static site generators (like Rettangoli Sites)
- Server-side rendering with caching
- Build-time HTML generation
- Template precompilation

## Why YAHTML + Jempl?

### Advantages Over Traditional Approaches

1. **Type-Safe Templates**: 100% valid YAML means template validation at parse time
2. **Universal Tooling**: Use any YAML parser, linter, or validator
3. **Clean Syntax**: No angle brackets, fewer characters, clearer structure
4. **Data-Driven**: Templates naturally map to JSON/YAML data sources
5. **Component Reusability**: Partials make it easy to build component libraries
6. **Version Control Friendly**: YAML diffs are cleaner than HTML
7. **Learning Curve**: If you know YAML and HTML, you're 90% there

### Comparison with Alternatives

| Feature | YAHTML + Jempl | JSX | Pug | Handlebars |
|---------|----------------|-----|-----|------------|
| Valid YAML | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Templating | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| Type-safe parsing | ✅ Yes | ⚠️ Requires TypeScript | ❌ No | ❌ No |
| Zero runtime | ✅ Yes | ❌ Needs React | ❌ Needs compiler | ❌ Needs runtime |
| Standard tooling | ✅ YAML tools | ⚠️ JSX-specific | ⚠️ Pug-specific | ⚠️ HBS-specific |

## Getting Started

### Installation

```bash
npm install -g rtgl
```

### Create a New Project

```bash
mkdir my-site
cd my-site
rtgl init
```

### Project Structure

```
my-site/
├── pages/
│   └── index.yaml          # Your first page
├── templates/
│   └── base.yaml           # Base layout template
├── partials/
│   ├── header.yaml         # Reusable header
│   └── footer.yaml         # Reusable footer
├── data/
│   └── site.yaml           # Global site data
└── static/
    └── css/
        └── main.css        # Stylesheets
```

### First YAHTML Page

**pages/index.yaml:**
```yaml
template: base
title: Welcome
---
- section.hero:
  - h1: "Hello, YAHTML!"
  - p: "Build websites with YAML and Jempl"
  - a.cta href="/docs": "Get Started"
```

### Build and Serve

```bash
rtgl build    # Generate site to _site/
rtgl serve    # Start dev server
```

## Real-World Examples

### 1. RouteVN Website
A transportation and route optimization website built with YAHTML templates, demonstrating:
- Multi-page static site
- Dynamic navigation
- Content-driven pages
- Custom partials for UI components

### 2. Rettangoli.dev
The official Rettangoli documentation site, showcasing:
- Technical documentation structure
- Code examples with syntax highlighting
- Interactive components
- Responsive layouts

### 3. Yuusoft Projects
Various open-source projects using YAHTML + Jempl:
- Landing pages
- Documentation sites
- Component libraries
- Blog platforms

## Best Practices

### 1. Organize Partials by Function
```
partials/
├── layout/
│   ├── header.yaml
│   ├── footer.yaml
│   └── sidebar.yaml
├── components/
│   ├── button.yaml
│   ├── card.yaml
│   └── modal.yaml
└── sections/
    ├── hero.yaml
    ├── features.yaml
    └── testimonials.yaml
```

### 2. Use Data Files for Content
Separate content from structure:

**data/products.yaml:**
```yaml
products:
  - name: "Product A"
    price: 29.99
    features: ["Feature 1", "Feature 2"]
  - name: "Product B"
    price: 49.99
    features: ["Feature 3", "Feature 4"]
```

**pages/products.yaml:**
```yaml
template: base
title: Products
---
- $partial: productGrid
  items: ${data.products}
```

### 3. Leverage Custom Functions
Create domain-specific utilities:

```javascript
const siteFunctions = {
  formatDate: (date) => new Date(date).toLocaleDateString(),
  truncate: (str, len) => str.length > len ? str.slice(0, len) + '...' : str,
  filterByTag: (posts, tag) => posts.filter(p => p.tags.includes(tag)),
  sortByDate: (items) => [...items].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  ),
};
```

### 4. Template Inheritance
Use base templates for consistent layouts:

**templates/base.yaml:**
```yaml
- html:
  - head:
    - "${head}"
  - body:
    - $partial: header
    - main: "${content}"
    - $partial: footer
```

### 5. Conditional Components
Build adaptive UIs:

```yaml
- div.page:
  - $if user.loggedIn:
    - $partial: userDashboard
      user: ${user}
  - $else:
    - $partial: loginPrompt
```

## Limitations and Considerations

### When NOT to Use YAHTML + Jempl

- **Highly dynamic SPAs**: For React/Vue-style interactivity, use those frameworks instead
- **Real-time applications**: Jempl is designed for static/server-rendered content
- **Browser-side templating**: Jempl works best at build time or server-side
- **Complex state management**: Use dedicated state management solutions

### YAML Quirks to Watch For

1. **Indentation matters**: Use consistent spaces (2 or 4)
2. **Quotes for special characters**: `"${value}"` when value contains special chars
3. **Colons in strings**: Quote strings containing colons
4. **Arrays vs objects**: Start array items with `-`

## Conclusion

YAHTML combined with Jempl provides a powerful, clean, and maintainable approach to building static sites and server-rendered applications. By leveraging YAML's simplicity and Jempl's templating capabilities, developers can create sophisticated websites with:

- Clean, readable templates
- Reusable components
- Dynamic content generation
- Type-safe parsing
- Excellent performance

Whether you're building a simple landing page, a complex documentation site, or a content-driven blog, YAHTML + Jempl offers a compelling alternative to traditional HTML templating solutions.

## Resources

- **YAHTML Repository**: https://github.com/yuusoft-org/yahtml
- **Jempl Documentation**: https://github.com/yuusoft-org/jempl
- **Rettangoli Sites**: https://github.com/yuusoft-org/rettangoli
- **RouteVN Example**: https://github.com/RouteVN/routevn-website
- **Live Playground**: https://yuusoft-org.github.io/jempl/

## Contributing

If you've built something with YAHTML + Jempl and want to share your use case, please contribute to this documentation!
