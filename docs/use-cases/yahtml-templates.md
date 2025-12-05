# Use Case: YAML Template Engine with Jempl

## Overview

Jempl serves as a templating engine for **[YAHTML](https://github.com/yuusoft-org/yahtml)** (YAML HTML), enabling dynamic template rendering for static sites and web applications written in YAML format.

**What it replaces:** Jempl+YAHTML can replace traditional HTML template engines like **HAML**, **EJS**, **Jinja**, **Liquid**, **Handlebars**, **Pug**, and similar templating languages that pair with HTML.

**Learn more about YAHTML:** https://github.com/yuusoft-org/yahtml

### Core Features

Jempl adds these templating capabilities to YAHTML:
- **Variable replacement** - `${variable}`
- **Conditionals** - `$if`, `$elif`, `$else`, `$when`
- **Loops** - `$for`, `$each`
- **Partials** - `$partial` for reusable components
- **Custom functions** - Extensible data transformation
- **Path references** - `#{variable}` for data binding

## Quick Examples

### Navigation Menu with Conditionals

**YAHTML + Jempl:**
```yaml
- nav.main-nav:
  - ul:
    - $each: item in navigation
      $when: item.visible
      - li class="$if item.active: active":
        - a href="${item.url}": "${item.label}"
```

**Output:**
```html
<nav class="main-nav">
  <ul>
    <li class="active"><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

### Hero Section with Partials

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

### Blog Posts with Loops

**Template:**
```yaml
- section.blog:
  - h2: "Recent Posts"
  - div.posts:
    - $each: post, idx in posts
      $when: post.published
      - article.post:
        - h3: "${post.title}"
        - span.date: "${post.date}"
        - div.excerpt: "${post.excerpt}"
        - $if idx == 0:
          - span.badge: "Latest"
```

### Form Generation

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

## Real-World Implementation: Rettangoli Sites

**[Rettangoli Sites](https://github.com/yuusoft-org/rettangoli/tree/main/packages/rettangoli-sites)** is a zero-config static site generator using YAHTML+Jempl.

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

### Example: Index Page

From **[rettangoli.dev/pages/index.yaml](https://github.com/yuusoft-org/rettangoli/blob/main/apps/rettangoli.dev/pages/index.yaml)**:

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

This demonstrates:
- **Frontmatter**: `template` and `title` metadata
- **Partial inclusion**: `$partial: hero1` loads a reusable hero component
- **Variable replacement**: `${site.hero.title}` injects dynamic data

### Component-Based Architecture

**Layout Template (`templates/base.yaml`):**
```yaml
- html lang="en":
  - head:
    - meta charset="UTF-8":
    - title: "${title} - ${site.name}"
    - link rel="stylesheet" href="/css/main.css":
  - body:
    - $partial: header
    - main: "${content}"
    - $partial: footer
```

**Header Partial (`partials/header.yaml`):**
```yaml
- header.site-header:
  - div.container:
    - $partial: logo
    - $partial: nav
```

## Advanced Patterns

### Data Transformation with Functions

```yaml
- section.stats:
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

```yaml
- form:
  - $each: field, idx in formFields
    - input data-bind="#{formFields[idx].value}"
            type="${field.type}"
            value="${field.value}":
```

Generates:
```html
<input data-bind="formFields[0].value" type="text" value="John">
<input data-bind="formFields[1].value" type="email" value="john@example.com">
```

## Performance

Jempl's two-phase approach (Parse → Render) is ideal for static site generation:

- **Parse time**: ~1-2ms (one-time cost during build)
- **Render time**: ~0.1-0.5ms per page
- **Throughput**: 2,000+ pages/second

Perfect for:
- Static site generators (like Rettangoli Sites)
- Server-side rendering with caching
- Build-time HTML generation
