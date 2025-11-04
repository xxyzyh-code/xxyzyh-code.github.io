---
layout: page
title: "分类"
permalink: /categories/
robots: "noindex, nofollow" 
seo:
  noindex: true
---

<h1>📂 一级分类</h1>

{% assign all_posts = site.posts | sort: 'date' | reverse %}
{% assign all_categories = "" | split: "" %}

{% for post in all_posts %}
  {% for cat in post.categories %}
    {% unless all_categories contains cat %}
      {% assign all_categories = all_categories | push: cat %}
    {% endunless %}
  {% endfor %}
{% endfor %}

<ul>
{% for cat in all_categories %}
  <li>
    <h2>{{ cat }}</h2>
    <ul>
      {% for post in all_posts %}
        {% if post.categories contains cat %}
          <li><a href="{{ post.url }}">{{ post.title }}</a></li>
        {% endif %}
      {% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>
